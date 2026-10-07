"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { previewLabel, type Locale } from "./i18n";
import {
  createFlatLayout,
  edgeFrame,
  panelShapePoints,
} from "./box-model/dieline-layout.ts";
import { createBoxBlueprint } from "./box-model/templates.ts";
import {
  DEFAULT_ORBIT_ANGLES,
  floorVisibilityForPitch,
  orbitAnglesAfterDrag,
} from "./box-model/view-controls.ts";
import type {
  BlueprintBoxType,
  BoxBlueprint,
  EdgeName,
  PanelNode,
  PieceBlueprint,
  Point2,
} from "./box-model/types.ts";

export type BoxType = BlueprintBoxType;
export type FoldMode = "closed" | "open" | "dieline" | "folding";

type BoxPreviewProps = {
  boxType: BoxType;
  locale?: Locale;
  width: number;
  depth: number;
  height: number;
  mode: FoldMode;
  paper: "kraft" | "white" | "green";
  print: "none" | "one" | "full";
  autoRotate: boolean;
  foldProgress?: number;
  viewResetKey: number;
  onManualRotate?: () => void;
};

type Joint = {
  id: string;
  group: THREE.Group;
  angle: number;
  openAngle?: number;
  phase: readonly [number, number];
};

type CompiledPiece = {
  blueprint: PieceBlueprint;
  group: THREE.Group;
  flatPosition: THREE.Vector3;
  assemblyPosition: THREE.Vector3;
  openPosition: THREE.Vector3;
};

type FoldModel = {
  group: THREE.Group;
  joints: Joint[];
  pieces: CompiledPiece[];
  creaseLines: THREE.Line[];
  cutLines: Array<THREE.Line | THREE.LineSegments>;
  applyPose: (
    progress: number,
    mode: FoldMode,
    immediate: boolean,
    delta: number,
  ) => void;
};

type BuildContext = {
  panelMaterial: THREE.MeshStandardMaterial;
  printMaterial: THREE.MeshBasicMaterial;
  printRuleMaterial: THREE.MeshBasicMaterial;
  cutMaterial: THREE.LineBasicMaterial;
  creaseMaterial: THREE.LineDashedMaterial;
  geometries: Set<THREE.BufferGeometry>;
  materials: Set<THREE.Material>;
};

const paperColors = {
  kraft: 0xc99b62,
  white: 0xf3f0e9,
  green: 0xc8e6cd,
};

const printColors = {
  none: 0x171717,
  one: 0x202020,
  full: 0xff3d8b,
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const smoothstep = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

const phaseProgress = (
  progress: number,
  phase: readonly [number, number],
) => smoothstep((progress - phase[0]) / Math.max(0.001, phase[1] - phase[0]));

function makeShape(points: readonly Point2[]) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();
  return shape;
}

function addLineSegments(
  parent: THREE.Object3D,
  segments: readonly (readonly [Point2, Point2])[],
  z: number,
  material: THREE.LineBasicMaterial,
  context: BuildContext,
) {
  if (!segments.length) return;
  const vertices = segments.flatMap(([start, end]) => [
    start[0],
    start[1],
    z,
    end[0],
    end[1],
    z,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  context.geometries.add(geometry);
  const lines = new THREE.LineSegments(geometry, material);
  lines.renderOrder = 5;
  parent.add(lines);
  return lines;
}

function addPolyline(
  parent: THREE.Object3D,
  points: readonly Point2[],
  z: number,
  material: THREE.LineBasicMaterial,
  context: BuildContext,
) {
  if (points.length < 2) return;
  const geometry = new THREE.BufferGeometry().setFromPoints(
    points.map(([x, y]) => new THREE.Vector3(x, y, z)),
  );
  context.geometries.add(geometry);
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 5;
  parent.add(line);
  return line;
}

function addCrease(
  parent: THREE.Object3D,
  length: number,
  context: BuildContext,
  creaseLines: THREE.Line[],
) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0.009),
    new THREE.Vector3(length, 0, 0.009),
  ]);
  context.geometries.add(geometry);
  const line = new THREE.Line(geometry, context.creaseMaterial);
  line.computeLineDistances();
  line.renderOrder = 6;
  parent.add(line);
  creaseLines.push(line);
}

function panelBoundarySegments(
  node: PanelNode,
  width: number,
  isRoot: boolean,
) {
  const points = panelShapePoints(node.shape, width, node.span);
  const connected = new Set<EdgeName>();
  node.children?.forEach((child) => {
    if (child.edge) connected.add(child.edge);
  });
  if (!isRoot) connected.add("near");

  if ((node.shape ?? "rect") === "rect") {
    const segments: Array<readonly [Point2, Point2]> = [];
    if (!connected.has("near")) {
      segments.push([
        [0, 0],
        [width, 0],
      ]);
    }
    if (!connected.has("far")) {
      segments.push([
        [0, node.span],
        [width, node.span],
      ]);
    }
    if (!connected.has("xmin")) {
      segments.push([
        [0, 0],
        [0, node.span],
      ]);
    }
    if (!connected.has("xmax")) {
      segments.push([
        [width, 0],
        [width, node.span],
      ]);
    }
    return segments;
  }

  const segments: Array<readonly [Point2, Point2]> = [];
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    if (!isRoot && index === 0) return;
    segments.push([point, next]);
  });
  return segments;
}

function createPanelVisual(
  parent: THREE.Object3D,
  node: PanelNode,
  width: number,
  isRoot: boolean,
  context: BuildContext,
  cutLines: Array<THREE.Line | THREE.LineSegments>,
) {
  const points = panelShapePoints(node.shape, width, node.span);
  const geometry = new THREE.ShapeGeometry(makeShape(points));
  context.geometries.add(geometry);
  const panel = new THREE.Mesh(geometry, context.panelMaterial);
  panel.position.z = (node.layer ?? 0) * 0.003;
  panel.castShadow = true;
  panel.receiveShadow = true;
  panel.renderOrder = 1;
  parent.add(panel);

  const boundary = addLineSegments(
    parent,
    panelBoundarySegments(node, width, isRoot),
    0.007 + (node.layer ?? 0) * 0.003,
    context.cutMaterial,
    context,
  );
  if (boundary) cutLines.push(boundary);

  node.detailCuts?.forEach((detail) => {
    const line = addPolyline(
      parent,
      detail,
      0.01,
      context.cutMaterial,
      context,
    );
    if (line) cutLines.push(line);
  });

  if (node.printed) {
    const markWidth = Math.max(0.16, width * 0.42);
    const markHeight = Math.max(
      0.08,
      Math.min(node.span * 0.21, markWidth * 0.3),
    );
    const markGeometry = new THREE.PlaneGeometry(markWidth, markHeight);
    markGeometry.translate(width / 2, node.span / 2, 0);
    context.geometries.add(markGeometry);
    const mark = new THREE.Mesh(markGeometry, context.printMaterial);
    mark.position.z = 0.012;
    mark.renderOrder = 7;
    parent.add(mark);

    const ruleGeometry = new THREE.PlaneGeometry(
      Math.max(0.08, markWidth * 0.58),
      Math.max(0.01, markHeight * 0.08),
    );
    ruleGeometry.translate(width / 2, node.span / 2, 0);
    context.geometries.add(ruleGeometry);
    const rule = new THREE.Mesh(ruleGeometry, context.printRuleMaterial);
    rule.position.z = 0.014;
    rule.renderOrder = 8;
    parent.add(rule);
  }
}

function buildChildNode(
  parent: THREE.Object3D,
  parentWidth: number,
  parentSpan: number,
  node: PanelNode,
  context: BuildContext,
  joints: Joint[],
  creaseLines: THREE.Line[],
  cutLines: Array<THREE.Line | THREE.LineSegments>,
) {
  if (!node.edge) return;
  const frame = edgeFrame(parentWidth, parentSpan, node.edge);
  const anchor = new THREE.Group();
  anchor.position.set(frame.x, frame.y, 0);
  anchor.rotation.z = frame.rotation;
  parent.add(anchor);
  addCrease(anchor, frame.length, context, creaseLines);

  const foldGroup = new THREE.Group();
  anchor.add(foldGroup);
  createPanelVisual(
    foldGroup,
    node,
    frame.length,
    false,
    context,
    cutLines,
  );
  joints.push({
    id: node.id,
    group: foldGroup,
    angle: node.angle ?? Math.PI / 2,
    openAngle: node.openAngle,
    phase: node.phase ?? [0, 1],
  });

  node.children?.forEach((child) => {
    buildChildNode(
      foldGroup,
      frame.length,
      node.span,
      child,
      context,
      joints,
      creaseLines,
      cutLines,
    );
  });
}

function compileFoldModel(
  blueprint: BoxBlueprint,
  context: BuildContext,
): FoldModel {
  const group = new THREE.Group();
  const joints: Joint[] = [];
  const creaseLines: THREE.Line[] = [];
  const cutLines: Array<THREE.Line | THREE.LineSegments> = [];
  const gap = Math.max(
    0.24,
    Math.min(blueprint.dimensions.width, blueprint.dimensions.depth) * 0.16,
  );
  const placements = new Map(
    createFlatLayout(blueprint.pieces, gap).map((item) => [item.id, item]),
  );
  const pieces: CompiledPiece[] = [];

  blueprint.pieces.forEach((pieceBlueprint) => {
    const pieceGroup = new THREE.Group();
    pieceGroup.name = pieceBlueprint.id;
    group.add(pieceGroup);
    const rootWidth = pieceBlueprint.root.width ?? 0;
    createPanelVisual(
      pieceGroup,
      pieceBlueprint.root,
      rootWidth,
      true,
      context,
      cutLines,
    );
    pieceBlueprint.root.children?.forEach((child) => {
      buildChildNode(
        pieceGroup,
        rootWidth,
        pieceBlueprint.root.span,
        child,
        context,
        joints,
        creaseLines,
        cutLines,
      );
    });

    const placement = placements.get(pieceBlueprint.id);
    const flatPosition = new THREE.Vector3(
      placement?.position[0] ?? 0,
      placement?.position[1] ?? 0,
      0,
    );
    const assemblyPosition = new THREE.Vector3(
      ...pieceBlueprint.assemblyPosition,
    );
    const openPosition = new THREE.Vector3(
      ...(pieceBlueprint.openPosition ?? pieceBlueprint.assemblyPosition),
    );
    pieceGroup.position.copy(flatPosition);
    pieces.push({
      blueprint: pieceBlueprint,
      group: pieceGroup,
      flatPosition,
      assemblyPosition,
      openPosition,
    });
  });

  const target = new THREE.Vector3();
  const applyPose = (
    progress: number,
    mode: FoldMode,
    immediate: boolean,
    delta: number,
  ) => {
    const easing = immediate ? 1 : 1 - Math.pow(0.00015, delta);
    joints.forEach((joint) => {
      const foldedAngle =
        (mode === "open" ? (joint.openAngle ?? joint.angle) : joint.angle) *
        phaseProgress(progress, joint.phase);
      joint.group.rotation.x = immediate
        ? foldedAngle
        : THREE.MathUtils.lerp(
            joint.group.rotation.x,
            foldedAngle,
            easing,
          );
    });

    pieces.forEach((piece) => {
      const assembly = phaseProgress(
        progress,
        piece.blueprint.assemblyPhase ?? [0.12, 0.72],
      );
      const destination =
        mode === "open" ? piece.openPosition : piece.assemblyPosition;
      target.lerpVectors(piece.flatPosition, destination, assembly);
      if (immediate) piece.group.position.copy(target);
      else piece.group.position.lerp(target, easing);
    });
  };

  return { group, joints, pieces, creaseLines, cutLines, applyPose };
}

function initialProgress(mode: FoldMode, foldProgress?: number) {
  if (mode === "dieline") return 0;
  if (mode === "folding") return clamp01(foldProgress ?? 0);
  return 1;
}

export default function BoxPreview({
  boxType,
  locale = "ko",
  width,
  depth,
  height,
  mode,
  paper,
  print,
  autoRotate,
  foldProgress,
  viewResetKey,
  onManualRotate,
}: BoxPreviewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const targetModeRef = useRef<FoldMode>(mode);
  const autoRotateRef = useRef(autoRotate);
  const foldProgressRef = useRef(foldProgress);
  const viewResetKeyRef = useRef(viewResetKey);
  const onManualRotateRef = useRef(onManualRotate);

  useEffect(() => {
    targetModeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    foldProgressRef.current = foldProgress;
  }, [foldProgress]);

  useEffect(() => {
    viewResetKeyRef.current = viewResetKey;
  }, [viewResetKey]);

  useEffect(() => {
    onManualRotateRef.current = onManualRotate;
  }, [onManualRotate]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const perspectiveCamera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    perspectiveCamera.up.set(0, 1, 0);
    const flatCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    flatCamera.up.set(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x66736a, 2.55));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(4, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xd9fff0, 1.05);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);

    const floorMaterial = new THREE.ShadowMaterial({
      color: 0x26342d,
      opacity: 0.14,
    });
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(5.4, 64),
      floorMaterial,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.025;
    floor.receiveShadow = true;
    scene.add(floor);

    const geometries = new Set<THREE.BufferGeometry>([floor.geometry]);
    const materials = new Set<THREE.Material>([floor.material]);
    const panelMaterial = new THREE.MeshStandardMaterial({
      color: paperColors[paper],
      roughness: paper === "white" ? 0.66 : 0.86,
      metalness: 0,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const printMaterial = new THREE.MeshBasicMaterial({
      color: printColors[print],
      transparent: true,
      opacity: print === "none" ? 0.035 : 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const printRuleMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff8eb,
      transparent: true,
      opacity: print === "none" ? 0 : 0.82,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const cutMaterial = new THREE.LineBasicMaterial({
      color: paper === "white" ? 0x69655e : 0x593f29,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    const creaseMaterial = new THREE.LineDashedMaterial({
      color: 0xc43f78,
      dashSize: 0.075,
      gapSize: 0.05,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    [
      panelMaterial,
      printMaterial,
      printRuleMaterial,
      cutMaterial,
      creaseMaterial,
    ].forEach((item) => materials.add(item));
    const context: BuildContext = {
      panelMaterial,
      printMaterial,
      printRuleMaterial,
      cutMaterial,
      creaseMaterial,
      geometries,
      materials,
    };

    const scale = 3.05 / Math.max(width, depth, height);
    const caliperMm = paper === "green" ? 1.2 : 1.5;
    const blueprint = createBoxBlueprint(
      boxType,
      width * scale,
      depth * scale,
      height * scale,
      caliperMm * scale,
    );
    const foldModel = compileFoldModel(blueprint, context);

    const viewGroup = new THREE.Group();
    scene.add(viewGroup);
    const modelRoot = new THREE.Group();
    modelRoot.add(foldModel.group);
    viewGroup.add(modelRoot);

    let dragging = false;
    let previousX = 0;
    let previousY = 0;
    let userYaw = DEFAULT_ORBIT_ANGLES.yaw;
    let userPitch = DEFAULT_ORBIT_ANGLES.pitch;
    let appliedViewResetKey = viewResetKeyRef.current;

    const handlePointerDown = (event: PointerEvent) => {
      if (targetModeRef.current === "dieline") return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      dragging = true;
      previousX = event.clientX;
      previousY = event.clientY;
      onManualRotateRef.current?.();
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const nextAngles = orbitAnglesAfterDrag(
        { yaw: userYaw, pitch: userPitch },
        event.clientX - previousX,
        event.clientY - previousY,
      );
      userYaw = nextAngles.yaw;
      userPitch = nextAngles.pitch;
      previousX = event.clientX;
      previousY = event.clientY;
    };
    const handlePointerUp = (event: PointerEvent) => {
      dragging = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      renderer.domElement.style.cursor =
        targetModeRef.current === "dieline" ? "default" : "grab";
    };

    renderer.domElement.style.cursor =
      targetModeRef.current === "dieline" ? "default" : "grab";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerUp);

    let viewportAspect = 1;
    const resize = () => {
      const { clientWidth, clientHeight } = mount;
      if (!clientWidth || !clientHeight) return;
      renderer.setSize(clientWidth, clientHeight, false);
      viewportAspect = clientWidth / clientHeight;
      perspectiveCamera.aspect = viewportAspect;
      perspectiveCamera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const bounds = new THREE.Box3();
    const boundsSize = new THREE.Vector3();
    const boundsCenter = new THREE.Vector3();
    const cameraFocus = new THREE.Vector3();
    const cameraDirection = new THREE.Vector3(1.15, 0.88, 1.5).normalize();
    let cameraDistance = 9;

    const frameFlat = () => {
      viewGroup.updateMatrixWorld(true);
      bounds.setFromObject(viewGroup);
      bounds.getSize(boundsSize);
      bounds.getCenter(boundsCenter);
      const halfHeight =
        Math.max(boundsSize.y / 2, boundsSize.x / (2 * viewportAspect), 0.4) *
        1.13;
      flatCamera.left = -halfHeight * viewportAspect;
      flatCamera.right = halfHeight * viewportAspect;
      flatCamera.top = halfHeight;
      flatCamera.bottom = -halfHeight;
      flatCamera.position.set(
        boundsCenter.x,
        boundsCenter.y,
        Math.max(8, boundsSize.length() * 2),
      );
      flatCamera.lookAt(boundsCenter.x, boundsCenter.y, 0);
      flatCamera.updateProjectionMatrix();
    };

    const framePerspective = (immediate: boolean, delta: number) => {
      viewGroup.updateMatrixWorld(true);
      bounds.setFromObject(viewGroup);
      bounds.getSize(boundsSize);
      bounds.getCenter(boundsCenter);
      const radius = Math.max(boundsSize.length() / 2, 0.5);
      const verticalHalfFov = THREE.MathUtils.degToRad(
        perspectiveCamera.fov / 2,
      );
      const horizontalHalfFov = Math.atan(
        Math.tan(verticalHalfFov) * viewportAspect,
      );
      const limitingHalfFov = Math.max(
        0.12,
        Math.min(verticalHalfFov, horizontalHalfFov),
      );
      const targetDistance =
        (radius / Math.sin(limitingHalfFov)) * 1.14;
      const cameraEase = immediate ? 1 : 1 - Math.pow(0.0015, delta);
      cameraFocus.lerp(boundsCenter, cameraEase);
      cameraDistance = THREE.MathUtils.lerp(
        cameraDistance,
        targetDistance,
        cameraEase,
      );
      perspectiveCamera.position
        .copy(cameraFocus)
        .addScaledVector(cameraDirection, cameraDistance);
      perspectiveCamera.lookAt(cameraFocus);
    };

    const getTargetProgress = () => {
      if (targetModeRef.current === "dieline") return 0;
      if (targetModeRef.current === "folding") {
        return clamp01(foldProgressRef.current ?? 0);
      }
      return 1;
    };

    let animationFrame = 0;
    let currentProgress = initialProgress(
      targetModeRef.current,
      foldProgressRef.current,
    );
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = new THREE.Timer();
    timer.connect(document);

    const animate = () => {
      timer.update();
      const delta = Math.min(timer.getDelta(), 0.04);
      const currentMode = targetModeRef.current;
      if (appliedViewResetKey !== viewResetKeyRef.current) {
        appliedViewResetKey = viewResetKeyRef.current;
        userYaw = DEFAULT_ORBIT_ANGLES.yaw;
        userPitch = DEFAULT_ORBIT_ANGLES.pitch;
      }
      const targetProgress = getTargetProgress();
      const directManipulation =
        reducedMotion || currentMode === "folding" || currentMode === "dieline";
      if (directManipulation) currentProgress = targetProgress;
      else {
        currentProgress = THREE.MathUtils.lerp(
          currentProgress,
          targetProgress,
          1 - Math.pow(0.00045, delta),
        );
        if (Math.abs(currentProgress - targetProgress) < 0.0001) {
          currentProgress = targetProgress;
        }
      }

      foldModel.applyPose(
        currentProgress,
        currentMode,
        directManipulation,
        delta,
      );
      const isFlat = currentMode === "dieline";
      const rootTilt = isFlat
        ? 0
        : (-Math.PI / 2) * phaseProgress(currentProgress, [0.025, 0.16]);
      modelRoot.rotation.x = directManipulation
        ? rootTilt
        : THREE.MathUtils.lerp(
            modelRoot.rotation.x,
            rootTilt,
            1 - Math.pow(0.0003, delta),
          );

      if (isFlat) {
        viewGroup.rotation.set(0, 0, 0);
        renderer.domElement.style.cursor = "default";
      } else {
        renderer.domElement.style.cursor = dragging ? "grabbing" : "grab";
        if (autoRotateRef.current && !dragging) userYaw += delta * 0.18;
        const viewEase = directManipulation ? 1 : 1 - Math.pow(0.002, delta);
        viewGroup.rotation.x = THREE.MathUtils.lerp(
          viewGroup.rotation.x,
          userPitch,
          viewEase,
        );
        viewGroup.rotation.y = THREE.MathUtils.lerp(
          viewGroup.rotation.y,
          userYaw,
          viewEase,
        );
      }

      const creaseOpacity = isFlat
        ? 0.84
        : THREE.MathUtils.lerp(
            0.68,
            0.06,
            phaseProgress(currentProgress, [0.08, 0.62]),
          );
      foldModel.creaseLines.forEach((line) => {
        (line.material as THREE.LineDashedMaterial).opacity = creaseOpacity;
      });
      cutMaterial.opacity = isFlat ? 0.94 : 0.62;
      const floorVisibility = floorVisibilityForPitch(userPitch);
      floorMaterial.opacity = 0.14 * floorVisibility;
      floor.visible =
        !isFlat && currentProgress > 0.04 && floorVisibility > 0.01;

      if (isFlat) frameFlat();
      else framePerspective(directManipulation, delta);
      renderer.render(scene, isFlat ? flatCamera : perspectiveCamera);
      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      timer.dispose();
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener(
        "pointercancel",
        handlePointerUp,
      );
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((item) => item.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [boxType, width, depth, height, paper, print]);

  return (
    <div
      ref={mountRef}
      className="three-mount"
      data-box-type={boxType}
      data-fold-mode={mode}
      role="img"
      aria-label={previewLabel(locale, boxType, [width, depth, height], mode, foldProgress ?? 0)}
    />
  );
}
