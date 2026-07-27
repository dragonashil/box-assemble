"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type BoxPreviewProps = {
  width: number;
  depth: number;
  height: number;
  mode: "closed" | "open";
  paper: "kraft" | "white" | "green";
  print: "none" | "one" | "full";
  autoRotate: boolean;
};

const paperColors = {
  kraft: 0xc99b62,
  white: 0xf3f0e9,
  green: 0xc8e6cd,
};

const printColors = {
  none: 0x0f0f0f,
  one: 0x202020,
  full: 0xff3d8b,
};

export default function BoxPreview({
  width,
  depth,
  height,
  mode,
  paper,
  print,
  autoRotate,
}: BoxPreviewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const targetModeRef = useRef(mode);
  const autoRotateRef = useRef(autoRotate);

  useEffect(() => {
    targetModeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(5.6, 4.3, 6.7);
    camera.lookAt(0, 1.1, 0);

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

    scene.add(new THREE.HemisphereLight(0xffffff, 0x6f796f, 2.3));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
    keyLight.position.set(4, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd9fff0, 1.2);
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(4.4, 64),
      new THREE.ShadowMaterial({ color: 0x26342d, opacity: 0.16 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.025;
    floor.receiveShadow = true;
    scene.add(floor);

    const normalizedWidth = 3.05;
    const normalizedDepth = Math.max(1.75, Math.min(3, (depth / width) * 3.05));
    const normalizedHeight = Math.max(
      1.5,
      Math.min(3.1, (height / width) * 3.05),
    );
    const wallThickness = 0.065;
    const boxGroup = new THREE.Group();
    boxGroup.rotation.y = -0.48;
    scene.add(boxGroup);

    const material = new THREE.MeshStandardMaterial({
      color: paperColors[paper],
      roughness: paper === "white" ? 0.62 : 0.82,
      metalness: 0,
    });
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: paper === "white" ? 0xaaa69c : 0x70502f,
      transparent: true,
      opacity: 0.7,
    });

    const addPanel = (
      geometry: THREE.BoxGeometry,
      position: [number, number, number],
      parent: THREE.Object3D = boxGroup,
    ) => {
      const panel = new THREE.Mesh(geometry, material);
      panel.position.set(...position);
      panel.castShadow = true;
      panel.receiveShadow = true;
      parent.add(panel);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        edgeMaterial,
      );
      edges.position.copy(panel.position);
      parent.add(edges);
      return panel;
    };

    addPanel(
      new THREE.BoxGeometry(normalizedWidth, wallThickness, normalizedDepth),
      [0, 0, 0],
    );
    addPanel(
      new THREE.BoxGeometry(normalizedWidth, normalizedHeight, wallThickness),
      [0, normalizedHeight / 2, normalizedDepth / 2],
    );
    addPanel(
      new THREE.BoxGeometry(normalizedWidth, normalizedHeight, wallThickness),
      [0, normalizedHeight / 2, -normalizedDepth / 2],
    );
    addPanel(
      new THREE.BoxGeometry(wallThickness, normalizedHeight, normalizedDepth),
      [-normalizedWidth / 2, normalizedHeight / 2, 0],
    );
    addPanel(
      new THREE.BoxGeometry(wallThickness, normalizedHeight, normalizedDepth),
      [normalizedWidth / 2, normalizedHeight / 2, 0],
    );

    const backFlap = new THREE.Group();
    backFlap.position.set(
      0,
      normalizedHeight,
      -normalizedDepth / 2 + wallThickness / 2,
    );
    boxGroup.add(backFlap);
    addPanel(
      new THREE.BoxGeometry(
        normalizedWidth,
        normalizedDepth / 2,
        wallThickness,
      ),
      [0, normalizedDepth / 4, 0],
      backFlap,
    );

    const frontFlap = new THREE.Group();
    frontFlap.position.set(
      0,
      normalizedHeight,
      normalizedDepth / 2 - wallThickness / 2,
    );
    boxGroup.add(frontFlap);
    addPanel(
      new THREE.BoxGeometry(
        normalizedWidth,
        normalizedDepth / 2,
        wallThickness,
      ),
      [0, normalizedDepth / 4, 0],
      frontFlap,
    );

    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(normalizedWidth * 0.48, normalizedHeight * 0.28),
      new THREE.MeshBasicMaterial({
        color: printColors[print],
        transparent: true,
        opacity: print === "none" ? 0.08 : 0.92,
      }),
    );
    label.position.set(0, normalizedHeight * 0.55, normalizedDepth / 2 + 0.036);
    boxGroup.add(label);

    const labelLine = new THREE.Mesh(
      new THREE.PlaneGeometry(normalizedWidth * 0.3, 0.035),
      new THREE.MeshBasicMaterial({
        color: paper === "white" ? 0xffffff : 0xf8efe2,
        transparent: true,
        opacity: print === "none" ? 0 : 0.8,
      }),
    );
    labelLine.position.set(
      0,
      normalizedHeight * 0.55,
      normalizedDepth / 2 + 0.04,
    );
    boxGroup.add(labelLine);

    let dragging = false;
    let previousX = 0;
    let previousY = 0;
    let userPitch = -0.08;

    const handlePointerDown = (event: PointerEvent) => {
      dragging = true;
      previousX = event.clientX;
      previousY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const deltaX = event.clientX - previousX;
      const deltaY = event.clientY - previousY;
      boxGroup.rotation.y += deltaX * 0.008;
      userPitch = THREE.MathUtils.clamp(
        userPitch + deltaY * 0.004,
        -0.42,
        0.25,
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
    const clock = new THREE.Clock();
    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.04);
      const isOpen = targetModeRef.current === "open";
      const backTarget = isOpen ? -0.08 : -Math.PI / 2;
      const frontTarget = isOpen ? 0.08 : Math.PI / 2;
      const blend = 1 - Math.pow(0.0008, delta);
      backFlap.rotation.x = THREE.MathUtils.lerp(
        backFlap.rotation.x,
        backTarget,
        blend,
      );
      frontFlap.rotation.x = THREE.MathUtils.lerp(
        frontFlap.rotation.x,
        frontTarget,
        blend,
      );
      boxGroup.rotation.x = THREE.MathUtils.lerp(
        boxGroup.rotation.x,
        userPitch,
        blend * 0.7,
      );
      if (autoRotateRef.current && !dragging) {
        boxGroup.rotation.y += delta * 0.23;
      }
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };
    backFlap.rotation.x =
      targetModeRef.current === "open" ? -0.08 : -Math.PI / 2;
    frontFlap.rotation.x =
      targetModeRef.current === "open" ? 0.08 : Math.PI / 2;
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
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((item) => item.dispose());
          } else {
            object.material.dispose();
          }
        }
        if (object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((item) => item.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [width, depth, height, paper, print]);

  return (
    <div
      ref={mountRef}
      className="three-mount"
      role="img"
      aria-label={`${width} 곱하기 ${depth} 곱하기 ${height} 밀리미터 박스의 3D 미리보기`}
    />
  );
}
