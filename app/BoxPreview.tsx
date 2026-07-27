"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type BoxType = "mailer" | "shipping" | "drawer";
export type FoldMode = "closed" | "open" | "dieline" | "folding";

type BoxPreviewProps = {
  boxType: BoxType;
  width: number;
  depth: number;
  height: number;
  mode: FoldMode;
  paper: "kraft" | "white" | "green";
  print: "none" | "one" | "full";
  autoRotate: boolean;
  foldProgress?: number;
};

type Joint = {
  role?: string;
  group: THREE.Group;
  axis: "x" | "y";
  angle: number;
  openAngle?: number;
  phase: [number, number];
};

type FoldModel = {
  group: THREE.Group;
  joints: Joint[];
  creaseLines: THREE.Line[];
  update: (progress: number) => void;
  openProgress: number;
  flatZoom: number;
};

type BuildContext = {
  material: THREE.MeshStandardMaterial;
  printMaterial: THREE.MeshBasicMaterial;
  edgeMaterial: THREE.LineBasicMaterial;
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

const phaseProgress = (progress: number, phase: [number, number]) =>
  smoothstep((progress - phase[0]) / Math.max(0.001, phase[1] - phase[0]));

function createPanel(
  parent: THREE.Object3D,
  width: number,
  height: number,
  x: number,
  y: number,
  context: BuildContext,
  printed = false,
) {
  const geometry = new THREE.PlaneGeometry(width, height);
  context.geometries.add(geometry);
  const panel = new THREE.Mesh(geometry, context.material);
  panel.position.set(x, y, 0);
  panel.castShadow = true;
  panel.receiveShadow = true;
  panel.renderOrder = 1;
  parent.add(panel);

  const edgeGeometry = new THREE.EdgesGeometry(geometry);
  context.geometries.add(edgeGeometry);
  const edge = new THREE.LineSegments(edgeGeometry, context.edgeMaterial);
  edge.position.set(x, y, 0.003);
  edge.renderOrder = 3;
  parent.add(edge);

  if (printed) {
    const markGeometry = new THREE.PlaneGeometry(
      Math.max(0.18, width * 0.46),
      Math.max(0.1, height * 0.22),
    );
    context.geometries.add(markGeometry);
    const mark = new THREE.Mesh(markGeometry, context.printMaterial);
    mark.position.set(x, y, 0.006);
    mark.renderOrder = 4;
    parent.add(mark);

    const ruleGeometry = new THREE.PlaneGeometry(
      Math.max(0.1, width * 0.27),
      Math.max(0.012, height * 0.014),
    );
    context.geometries.add(ruleGeometry);
    const rule = new THREE.Mesh(
      ruleGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xfff8eb,
        transparent: true,
        opacity: context.printMaterial.opacity > 0.1 ? 0.82 : 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    context.materials.add(rule.material);
    rule.position.set(x, y, 0.008);
    rule.renderOrder = 5;
    parent.add(rule);
  }

  return panel;
}

function createCrease(
  parent: THREE.Object3D,
  length: number,
  axis: "x" | "y",
  context: BuildContext,
  creaseLines: THREE.Line[],
) {
  const points =
    axis === "x"
      ? [
          new THREE.Vector3(-length / 2, 0, 0.007),
          new THREE.Vector3(length / 2, 0, 0.007),
        ]
      : [
          new THREE.Vector3(0, -length / 2, 0.007),
          new THREE.Vector3(0, length / 2, 0.007),
        ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  context.geometries.add(geometry);
  const line = new THREE.Line(geometry, context.creaseMaterial);
  line.computeLineDistances();
  line.renderOrder = 6;
  parent.add(line);
  creaseLines.push(line);
}

type FlapOptions = {
  parent: THREE.Object3D;
  anchor: [number, number];
  heading?: number;
  width: number;
  span: number;
  angle: number;
  phase: [number, number];
  context: BuildContext;
  joints: Joint[];
  creaseLines: THREE.Line[];
  printed?: boolean;
  role?: string;
  openAngle?: number;
};

function createFlap({
  parent,
  anchor,
  heading = 0,
  width,
  span,
  angle,
  phase,
  context,
  joints,
  creaseLines,
  printed = false,
  role,
  openAngle,
}: FlapOptions) {
  const anchorGroup = new THREE.Group();
  anchorGroup.position.set(anchor[0], anchor[1], 0);
  anchorGroup.rotation.z = heading;
  parent.add(anchorGroup);

  const foldGroup = new THREE.Group();
  anchorGroup.add(foldGroup);
  createPanel(foldGroup, width, span, 0, span / 2, context, printed);
  createCrease(anchorGroup, width, "x", context, creaseLines);
  joints.push({
    role,
    group: foldGroup,
    axis: "x",
    angle,
    openAngle,
    phase,
  });
  return foldGroup;
}

type SeamOptions = {
  parent: THREE.Object3D;
  anchor: [number, number];
  span: number;
  height: number;
  angle: number;
  phase: [number, number];
  context: BuildContext;
  joints: Joint[];
  creaseLines: THREE.Line[];
  printed?: boolean;
  centered?: boolean;
  role?: string;
  openAngle?: number;
};

function createSeam({
  parent,
  anchor,
  span,
  height,
  angle,
  phase,
  context,
  joints,
  creaseLines,
  printed = false,
  centered = false,
  role,
  openAngle,
}: SeamOptions) {
  const anchorGroup = new THREE.Group();
  anchorGroup.position.set(anchor[0], anchor[1], 0);
  parent.add(anchorGroup);

  const foldGroup = new THREE.Group();
  anchorGroup.add(foldGroup);
  createPanel(
    foldGroup,
    span,
    height,
    span / 2,
    centered ? 0 : height / 2,
    context,
    printed,
  );
  createCrease(anchorGroup, height, "y", context, creaseLines);
  joints.push({
    role,
    group: foldGroup,
    axis: "y",
    angle,
    openAngle,
    phase,
  });
  return foldGroup;
}

function buildMailer(
  width: number,
  depth: number,
  height: number,
  context: BuildContext,
): FoldModel {
  const group = new THREE.Group();
  const joints: Joint[] = [];
  const creaseLines: THREE.Line[] = [];
  createPanel(group, width, depth, 0, 0, context);

  const common = { context, joints, creaseLines };
  // FOLD-inspired rigid linkage: every paper face is attached to its parent
  // along one crease edge. The open pose is a separate constrained frame:
  // every body/lid-child hinge stays assembled and only lidHinge returns to 0°.
  const back = createFlap({
    ...common,
    role: "backWall",
    parent: group,
    anchor: [0, depth / 2],
    width,
    span: height,
    angle: Math.PI / 2,
    phase: [0.04, 0.36],
  });
  const front = createFlap({
    ...common,
    role: "frontWall",
    parent: group,
    anchor: [0, -depth / 2],
    heading: Math.PI,
    width,
    span: height,
    angle: Math.PI / 2,
    phase: [0.07, 0.39],
    printed: true,
  });
  const left = createFlap({
    ...common,
    role: "leftWall",
    parent: group,
    anchor: [-width / 2, 0],
    heading: Math.PI / 2,
    width: depth,
    span: height,
    angle: Math.PI / 2,
    phase: [0.12, 0.44],
  });
  const right = createFlap({
    ...common,
    role: "rightWall",
    parent: group,
    anchor: [width / 2, 0],
    heading: -Math.PI / 2,
    width: depth,
    span: height,
    angle: Math.PI / 2,
    phase: [0.12, 0.44],
  });

  // Front/back corner flaps rise first and are captured inside the rolled
  // double side walls, matching the physical 0427 assembly order.
  const cornerSpan = height * 0.86;
  (
    [
      [front, "frontLeftCorner", -width / 2, Math.PI / 2],
      [front, "frontRightCorner", width / 2, -Math.PI / 2],
      [back, "backLeftCorner", -width / 2, Math.PI / 2],
      [back, "backRightCorner", width / 2, -Math.PI / 2],
    ] as const
  ).forEach(([parent, role, anchorX, heading]) => {
    createFlap({
      ...common,
      role,
      parent,
      anchor: [anchorX, height / 2],
      heading,
      width: height,
      span: cornerSpan,
      angle: Math.PI / 2,
      phase: [0.02, 0.22],
    });
  });

  // FEFCO 0427-style roll ends: outer wall → top rail → inner wall → lock.
  // Keeping this as a true hinge chain makes the flat blank and assembled
  // double wall use the exact same faces without translating any panel.
  const railSpan = Math.max(
    height * 0.08,
    Math.min(height * 0.18, depth * 0.1),
  );
  const leftRail = createFlap({
    ...common,
    role: "leftTopRail",
    parent: left,
    anchor: [0, height],
    width: depth,
    span: railSpan,
    angle: Math.PI / 2,
    phase: [0.36, 0.52],
  });
  const leftInnerWall = createFlap({
    ...common,
    role: "leftInnerWall",
    parent: leftRail,
    anchor: [0, railSpan],
    width: depth,
    span: height,
    angle: Math.PI / 2,
    phase: [0.46, 0.64],
  });
  createFlap({
    ...common,
    role: "leftBodyLock",
    parent: leftInnerWall,
    anchor: [0, height],
    width: depth * 0.72,
    span: railSpan,
    angle: Math.PI / 2,
    phase: [0.56, 0.7],
  });

  const rightRail = createFlap({
    ...common,
    role: "rightTopRail",
    parent: right,
    anchor: [0, height],
    width: depth,
    span: railSpan,
    angle: Math.PI / 2,
    phase: [0.36, 0.52],
  });
  const rightInnerWall = createFlap({
    ...common,
    role: "rightInnerWall",
    parent: rightRail,
    anchor: [0, railSpan],
    width: depth,
    span: height,
    angle: Math.PI / 2,
    phase: [0.46, 0.64],
  });
  createFlap({
    ...common,
    role: "rightBodyLock",
    parent: rightInnerWall,
    anchor: [0, height],
    width: depth * 0.72,
    span: railSpan,
    angle: Math.PI / 2,
    phase: [0.56, 0.7],
  });

  const frontRail = createFlap({
    ...common,
    role: "frontTopRail",
    parent: front,
    anchor: [0, height],
    width,
    span: railSpan,
    angle: Math.PI / 2,
    phase: [0.4, 0.56],
  });
  createFlap({
    ...common,
    role: "frontReceiver",
    parent: frontRail,
    anchor: [0, railSpan],
    width: width * 0.86,
    span: height * 0.72,
    angle: Math.PI / 2,
    phase: [0.5, 0.68],
  });

  const lid = createFlap({
    ...common,
    role: "lidHinge",
    parent: back,
    anchor: [0, height],
    width,
    span: depth,
    angle: Math.PI / 2,
    openAngle: 0,
    phase: [0.78, 0.98],
    printed: true,
  });
  const wingSpan = Math.min(height * 0.86, width * 0.2);
  createFlap({
    ...common,
    role: "leftLidWing",
    parent: lid,
    anchor: [-width / 2, depth / 2],
    heading: Math.PI / 2,
    width: depth,
    span: wingSpan,
    angle: Math.PI / 2,
    phase: [0.56, 0.74],
  });
  createFlap({
    ...common,
    role: "rightLidWing",
    parent: lid,
    anchor: [width / 2, depth / 2],
    heading: -Math.PI / 2,
    width: depth,
    span: wingSpan,
    angle: Math.PI / 2,
    phase: [0.56, 0.74],
  });
  const tuckSpan = height * 0.82;
  const tuck = createFlap({
    ...common,
    role: "tuckFlap",
    parent: lid,
    anchor: [0, depth],
    width,
    span: tuckSpan,
    angle: Math.PI / 2,
    phase: [0.62, 0.78],
  });
  const cherryEarSpan = Math.min(height * 0.22, width * 0.07);
  createFlap({
    ...common,
    role: "leftCherryEar",
    parent: tuck,
    anchor: [-width / 2, tuckSpan / 2],
    heading: Math.PI / 2,
    width: tuckSpan,
    span: cherryEarSpan,
    angle: Math.PI / 2,
    phase: [0.58, 0.74],
  });
  createFlap({
    ...common,
    role: "rightCherryEar",
    parent: tuck,
    anchor: [width / 2, tuckSpan / 2],
    heading: -Math.PI / 2,
    width: tuckSpan,
    span: cherryEarSpan,
    angle: Math.PI / 2,
    phase: [0.58, 0.74],
  });

  return {
    group,
    joints,
    creaseLines,
    openProgress: 1,
    flatZoom: 0.56,
    update: () => undefined,
  };
}

function addShippingFlaps(
  face: THREE.Object3D,
  centerX: number,
  faceWidth: number,
  height: number,
  flapSpan: number,
  small: boolean,
  context: BuildContext,
  joints: Joint[],
  creaseLines: THREE.Line[],
) {
  const common = { context, joints, creaseLines };
  createFlap({
    ...common,
    parent: face,
    anchor: [centerX, height],
    width: faceWidth,
    span: flapSpan,
    angle: -Math.PI / 2,
    phase: small ? [0.68, 0.82] : [0.8, 1],
  });
  createFlap({
    ...common,
    parent: face,
    anchor: [centerX, 0],
    heading: Math.PI,
    width: faceWidth,
    span: flapSpan,
    angle: Math.PI / 2,
    phase: small ? [0.39, 0.5] : [0.48, 0.62],
  });
}

function buildShipping(
  width: number,
  depth: number,
  height: number,
  context: BuildContext,
): FoldModel {
  const group = new THREE.Group();
  const joints: Joint[] = [];
  const creaseLines: THREE.Line[] = [];
  const common = { context, joints, creaseLines };

  // RSC/A-type boxes are a continuous four-panel strip, not a cross net.
  const front = createFlap({
    ...common,
    parent: group,
    anchor: [0, -depth / 2],
    width,
    span: height,
    angle: Math.PI / 2,
    phase: [0.04, 0.2],
    printed: true,
  });
  const right = createSeam({
    ...common,
    parent: front,
    anchor: [width / 2, 0],
    span: depth,
    height,
    angle: Math.PI / 2,
    phase: [0.16, 0.3],
  });
  const back = createSeam({
    ...common,
    parent: right,
    anchor: [depth, 0],
    span: width,
    height,
    angle: Math.PI / 2,
    phase: [0.22, 0.37],
  });
  const left = createSeam({
    ...common,
    parent: back,
    anchor: [width, 0],
    span: depth,
    height,
    angle: Math.PI / 2,
    phase: [0.29, 0.44],
  });
  createSeam({
    ...common,
    parent: left,
    anchor: [depth, 0],
    span: Math.max(0.08, height * 0.12),
    height,
    angle: Math.PI / 2,
    phase: [0.36, 0.48],
  });

  addShippingFlaps(
    front,
    0,
    width,
    height,
    depth / 2,
    false,
    context,
    joints,
    creaseLines,
  );
  addShippingFlaps(
    right,
    depth / 2,
    depth,
    height,
    width / 2,
    true,
    context,
    joints,
    creaseLines,
  );
  addShippingFlaps(
    back,
    width / 2,
    width,
    height,
    depth / 2,
    false,
    context,
    joints,
    creaseLines,
  );
  addShippingFlaps(
    left,
    depth / 2,
    depth,
    height,
    width / 2,
    true,
    context,
    joints,
    creaseLines,
  );

  return {
    group,
    joints,
    creaseLines,
    openProgress: 0.64,
    flatZoom: 0.56,
    update: () => undefined,
  };
}

function buildDrawer(
  width: number,
  depth: number,
  height: number,
  context: BuildContext,
): FoldModel {
  const group = new THREE.Group();
  const joints: Joint[] = [];
  const creaseLines: THREE.Line[] = [];
  const common = { context, joints, creaseLines };
  const tray = new THREE.Group();
  group.add(tray);

  const clearance = Math.min(width, depth) * 0.025;
  const trayWidth = Math.max(0.2, width - clearance * 2);
  const trayDepth = Math.max(0.2, depth - clearance * 2);
  const trayHeight = height * 0.68;
  createPanel(tray, trayWidth, trayDepth, 0, 0, context, true);
  createFlap({
    ...common,
    parent: tray,
    anchor: [0, trayDepth / 2],
    width: trayWidth,
    span: trayHeight,
    angle: Math.PI / 2,
    phase: [0.06, 0.37],
  });
  createFlap({
    ...common,
    parent: tray,
    anchor: [0, -trayDepth / 2],
    heading: Math.PI,
    width: trayWidth,
    span: trayHeight,
    angle: Math.PI / 2,
    phase: [0.06, 0.37],
  });
  createFlap({
    ...common,
    parent: tray,
    anchor: [-trayWidth / 2, 0],
    heading: Math.PI / 2,
    width: trayDepth,
    span: trayHeight,
    angle: Math.PI / 2,
    phase: [0.12, 0.43],
  });
  createFlap({
    ...common,
    parent: tray,
    anchor: [trayWidth / 2, 0],
    heading: -Math.PI / 2,
    width: trayDepth,
    span: trayHeight,
    angle: Math.PI / 2,
    phase: [0.12, 0.43],
  });

  // The sleeve is a second, independent dieline: top → side → bottom → side.
  const sleeve = new THREE.Group();
  group.add(sleeve);
  createPanel(sleeve, depth, width, 0, 0, context, true);
  const sleeveRight = createSeam({
    ...common,
    parent: sleeve,
    anchor: [depth / 2, 0],
    span: height,
    height: width,
    angle: Math.PI / 2,
    phase: [0.12, 0.34],
    centered: true,
  });
  const sleeveBottom = createSeam({
    ...common,
    parent: sleeveRight,
    anchor: [height, 0],
    span: depth,
    height: width,
    angle: Math.PI / 2,
    phase: [0.22, 0.44],
    centered: true,
  });
  const sleeveLeft = createSeam({
    ...common,
    parent: sleeveBottom,
    anchor: [depth, 0],
    span: height,
    height: width,
    angle: Math.PI / 2,
    phase: [0.32, 0.54],
    centered: true,
  });
  createSeam({
    ...common,
    parent: sleeveLeft,
    anchor: [height, 0],
    span: Math.max(0.08, height * 0.12),
    height: width,
    angle: Math.PI / 2,
    phase: [0.42, 0.58],
    centered: true,
  });

  const flatSleeveX = -(width / 2 + depth + height * 1.1);
  const flatSleeveY = depth * 0.72;
  const update = (progress: number) => {
    const assemble = phaseProgress(progress, [0.04, 0.56]);
    sleeve.position.x = THREE.MathUtils.lerp(flatSleeveX, 0, assemble);
    sleeve.position.y = THREE.MathUtils.lerp(flatSleeveY, 0, assemble);
    sleeve.position.z = THREE.MathUtils.lerp(0.012, height, assemble);
    sleeve.rotation.z = THREE.MathUtils.lerp(0, -Math.PI / 2, assemble);

    const trayVisible = phaseProgress(progress, [0.28, 0.56]);
    const insert = phaseProgress(progress, [0.72, 1]);
    tray.position.y = -depth * 0.78 * trayVisible * (1 - insert);
    tray.position.z = 0.012;
  };

  return {
    group,
    joints,
    creaseLines,
    openProgress: 0.7,
    flatZoom: 0.58,
    update,
  };
}

function buildFoldModel(
  boxType: BoxType,
  width: number,
  depth: number,
  height: number,
  context: BuildContext,
) {
  if (boxType === "shipping") {
    return buildShipping(width, depth, height, context);
  }
  if (boxType === "drawer") {
    return buildDrawer(width, depth, height, context);
  }
  return buildMailer(width, depth, height, context);
}

export default function BoxPreview({
  boxType,
  width,
  depth,
  height,
  mode,
  paper,
  print,
  autoRotate,
  foldProgress,
}: BoxPreviewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const targetModeRef = useRef<FoldMode>(mode);
  const autoRotateRef = useRef(autoRotate);
  const foldProgressRef = useRef(foldProgress);

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
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(6.8, 5.4, 8.6);
    camera.lookAt(0, 0.85, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x66736a, 2.5));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.3);
    keyLight.position.set(4, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xd9fff0, 1.1);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(5.2, 64),
      new THREE.ShadowMaterial({ color: 0x26342d, opacity: 0.14 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    floor.receiveShadow = true;
    scene.add(floor);

    const geometries = new Set<THREE.BufferGeometry>();
    const materialsSet = new Set<THREE.Material>();
    geometries.add(floor.geometry);
    materialsSet.add(floor.material);

    const material = new THREE.MeshStandardMaterial({
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
      opacity: print === "none" ? 0.06 : 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: paper === "white" ? 0x8f8b83 : 0x694b2e,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const creaseMaterial = new THREE.LineDashedMaterial({
      color: 0xc43f78,
      dashSize: 0.08,
      gapSize: 0.055,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
    [material, printMaterial, edgeMaterial, creaseMaterial].forEach((item) =>
      materialsSet.add(item),
    );
    const context: BuildContext = {
      material,
      printMaterial,
      edgeMaterial,
      creaseMaterial,
      geometries,
      materials: materialsSet,
    };

    const scale = 3.05 / Math.max(width, depth, height);
    const w = width * scale;
    const d = depth * scale;
    const h = height * scale;
    const foldModel = buildFoldModel(boxType, w, d, h, context);

    const viewGroup = new THREE.Group();
    viewGroup.rotation.y = -0.46;
    viewGroup.rotation.x = -0.07;
    scene.add(viewGroup);

    const modelRoot = new THREE.Group();
    modelRoot.rotation.x = -Math.PI / 2;
    modelRoot.position.y = 0.035;
    modelRoot.add(foldModel.group);
    viewGroup.add(modelRoot);

    let dragging = false;
    let previousX = 0;
    let previousY = 0;
    let userPitch = -0.07;

    const handlePointerDown = (event: PointerEvent) => {
      dragging = true;
      previousX = event.clientX;
      previousY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      viewGroup.rotation.y += (event.clientX - previousX) * 0.008;
      userPitch = THREE.MathUtils.clamp(
        userPitch + (event.clientY - previousY) * 0.004,
        -0.45,
        0.28,
      );
      previousX = event.clientX;
      previousY = event.clientY;
    };
    const handlePointerUp = (event: PointerEvent) => {
      dragging = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      renderer.domElement.style.cursor = "grab";
    };

    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerUp);

    const resize = () => {
      const { clientWidth, clientHeight } = mount;
      if (!clientWidth || !clientHeight) return;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    let animationFrame = 0;
    let currentProgress = 0;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const clock = new THREE.Clock();

    const getTargetProgress = () => {
      if (targetModeRef.current === "dieline") return 0;
      if (targetModeRef.current === "folding") {
        return clamp01(foldProgressRef.current ?? 0);
      }
      if (targetModeRef.current === "open") {
        return boxType === "mailer" ? 1 : foldModel.openProgress;
      }
      return 1;
    };

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.04);
      const targetProgress = getTargetProgress();
      if (reducedMotion || targetModeRef.current === "folding") {
        currentProgress = targetProgress;
      } else {
        currentProgress = THREE.MathUtils.lerp(
          currentProgress,
          targetProgress,
          1 - Math.pow(0.00045, delta),
        );
        if (Math.abs(currentProgress - targetProgress) < 0.0001) {
          currentProgress = targetProgress;
        }
      }

      const currentMode = targetModeRef.current;
      const isDirectManipulation = currentMode === "folding";
      foldModel.joints.forEach((joint) => {
        const angle =
          boxType === "mailer" && currentMode === "open"
            ? (joint.openAngle ?? joint.angle) *
              phaseProgress(currentProgress, joint.phase)
            : joint.angle * phaseProgress(currentProgress, joint.phase);
        const currentAngle =
          joint.axis === "x" ? joint.group.rotation.x : joint.group.rotation.y;
        const nextAngle =
          reducedMotion || isDirectManipulation
            ? angle
            : THREE.MathUtils.lerp(
                currentAngle,
                angle,
                1 - Math.pow(0.0002, delta),
              );
        if (joint.axis === "x") {
          joint.group.rotation.x = nextAngle;
        } else {
          joint.group.rotation.y = nextAngle;
        }
      });
      foldModel.update(currentProgress);

      const assembled = phaseProgress(currentProgress, [0.14, 0.68]);
      const cameraZoom = THREE.MathUtils.lerp(
        foldModel.flatZoom,
        1,
        assembled,
      );
      if (Math.abs(camera.zoom - cameraZoom) > 0.0001) {
        camera.zoom = cameraZoom;
        camera.updateProjectionMatrix();
      }
      const creaseOpacity = THREE.MathUtils.lerp(
        0.78,
        0.05,
        phaseProgress(currentProgress, [0.05, 0.5]),
      );
      foldModel.creaseLines.forEach((line) => {
        (line.material as THREE.LineDashedMaterial).opacity = creaseOpacity;
      });

      viewGroup.rotation.x = THREE.MathUtils.lerp(
        viewGroup.rotation.x,
        userPitch,
        1 - Math.pow(0.002, delta),
      );
      if (autoRotateRef.current && !dragging) {
        viewGroup.rotation.y += delta * (currentProgress < 0.08 ? 0.1 : 0.2);
      }
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener(
        "pointercancel",
        handlePointerUp,
      );
      geometries.forEach((geometry) => geometry.dispose());
      materialsSet.forEach((item) => item.dispose());
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
      aria-label={`${width} × ${depth} × ${height} 밀리미터 ${
        boxType === "mailer"
          ? "G형 택배박스"
          : boxType === "shipping"
            ? "A형 골판지박스"
            : "서랍형 패키지"
      }의 ${
        mode === "dieline"
          ? "전개"
          : mode === "open"
            ? "열림"
            : mode === "folding"
              ? `${Math.round((foldProgress ?? 0) * 100)}퍼센트 접힘`
              : "완성"
      } 상태`}
    />
  );
}
