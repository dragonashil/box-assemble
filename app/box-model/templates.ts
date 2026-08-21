import type {
  BlueprintBoxType,
  BoxBlueprint,
  PanelNode,
  PieceBlueprint,
} from "./types.ts";

const HALF_PI = Math.PI / 2;

export const DIELINE_SOURCES = {
  fold: {
    name: "FOLD 1.2 data model",
    url: "https://github.com/edemaine/fold",
    license: "MIT" as const,
    use: "face/edge topology and named folded-state model",
  },
  mailer: {
    name: "kyholdings/diecut_generator",
    url: "https://github.com/kyholdings/diecut_generator/tree/6a4664ffee8ef312199a01df630017f636456c50",
    revision: "6a4664ffee8ef312199a01df630017f636456c50",
    license: "MIT" as const,
    use: "self-locking mailer panel hierarchy, roll-end returns and fold order",
  },
  drawer: {
    name: "yuyou-dev/OpenBox3D",
    url: "https://github.com/yuyou-dev/OpenBox3D/tree/d4c6ff6ee6f06cd53671facc42d49d941c8e6934",
    revision: "d4c6ff6ee6f06cd53671facc42d49d941c8e6934",
    license: "MIT" as const,
    use: "independent tray/sleeve blanks, corner ears and sleeve fold tree",
  },
  shipping: {
    name: "RSC 0201 independent implementation",
    url: "https://github.com/ymomoze/fusion-rsc-box-tools/tree/d8bd14d07caa4cad64bf1b329fec63af857dfe6a",
    revision: "d8bd14d07caa4cad64bf1b329fec63af857dfe6a",
    license: "Independent implementation" as const,
    use: "RSC four-panel tube and breadth/2 flap relationship cross-check",
  },
};

const node = (
  value: Omit<PanelNode, "angle" | "phase"> & {
    angle?: number;
    phase?: readonly [number, number];
  },
): PanelNode => ({ angle: HALF_PI, phase: [0, 1], ...value });

function mailerBlueprint(
  width: number,
  depth: number,
  height: number,
  caliper: number,
): BoxBlueprint {
  const bridge = Math.max(caliper * 2.4, height * 0.055);
  const wing = Math.max(height - caliper, height * 0.78);
  const tuck = Math.max(height * 0.82, caliper * 6);
  const hookTab = Math.max(caliper * 1.15, height * 0.045);
  const slotLength = Math.min(depth * 0.22, height * 0.55);
  const slotWidth = Math.max(caliper * 0.9, width * 0.006);

  const sideReturn = (side: "left" | "right"): PanelNode =>
    node({
      id: `${side}-outer-wall`,
      edge: side === "left" ? "xmin" : "xmax",
      span: height,
      phase: [0.32, 0.5],
      children: [
        node({
          id: `${side}-roll-bridge`,
          edge: "far",
          span: bridge,
          phase: [0.46, 0.58],
          children: [
            node({
              id: `${side}-inner-return-hook`,
              edge: "far",
              span: height - hookTab,
              shape: "hook",
              phase: [0.52, 0.69],
            }),
          ],
        }),
      ],
    });

  const front = node({
    id: "front-wall",
    edge: "near",
    span: height,
    phase: [0.02, 0.18],
    printed: true,
    children: [
      node({
        id: "front-left-lock-wing",
        edge: "xmin",
        span: wing,
        shape: "ear",
        phase: [0.16, 0.31],
      }),
      node({
        id: "front-right-lock-wing",
        edge: "xmax",
        span: wing,
        shape: "ear",
        phase: [0.16, 0.31],
      }),
    ],
  });

  const lid = node({
    id: "lid-hinge",
    edge: "far",
    span: depth,
    phase: [0.76, 0.92],
    openAngle: 0,
    printed: true,
    children: [
      node({
        id: "lid-left-wing",
        edge: "xmin",
        span: wing,
        shape: "dust",
        phase: [0.62, 0.74],
      }),
      node({
        id: "lid-right-wing",
        edge: "xmax",
        span: wing,
        shape: "dust",
        phase: [0.62, 0.74],
      }),
      node({
        id: "front-tuck",
        edge: "far",
        span: tuck,
        phase: [0.67, 0.79],
        children: [
          node({
            id: "tuck-left-ear",
            edge: "xmin",
            span: wing * 0.72,
            shape: "ear",
            phase: [0.64, 0.76],
          }),
          node({
            id: "tuck-right-ear",
            edge: "xmax",
            span: wing * 0.72,
            shape: "ear",
            phase: [0.64, 0.76],
          }),
        ],
      }),
    ],
  });

  const back = node({
    id: "back-wall",
    edge: "far",
    span: height,
    phase: [0.02, 0.18],
    children: [
      node({
        id: "back-left-capture-wing",
        edge: "xmin",
        span: wing,
        shape: "ear",
        phase: [0.16, 0.31],
      }),
      node({
        id: "back-right-capture-wing",
        edge: "xmax",
        span: wing,
        shape: "ear",
        phase: [0.16, 0.31],
      }),
      lid,
    ],
  });

  const slotAt = (x: number) =>
    [
      [x - slotWidth / 2, depth * 0.5 - slotLength / 2],
      [x + slotWidth / 2, depth * 0.5 - slotLength / 2],
      [x + slotWidth / 2, depth * 0.5 + slotLength / 2],
      [x - slotWidth / 2, depth * 0.5 + slotLength / 2],
      [x - slotWidth / 2, depth * 0.5 - slotLength / 2],
    ] as const;

  const root: PanelNode = {
    id: "bottom",
    width,
    span: depth,
    shape: "rect",
    printed: true,
    detailCuts: [
      slotAt(Math.max(bridge * 0.75, slotWidth * 2)),
      slotAt(width - Math.max(bridge * 0.75, slotWidth * 2)),
    ],
    children: [front, back, sideReturn("left"), sideReturn("right")],
  };

  return {
    type: "mailer",
    units: "scene",
    dimensions: { width, depth, height, caliper },
    pieces: [
      {
        id: "mailer-blank",
        root,
        assemblyPosition: [-width / 2, -depth / 2, 0],
        assemblyPhase: [0.1, 0.66],
      },
    ],
    sources: [DIELINE_SOURCES.fold, DIELINE_SOURCES.mailer],
  };
}

function shippingBlueprint(
  width: number,
  depth: number,
  height: number,
  caliper: number,
): BoxBlueprint {
  const flap = depth / 2;
  const glue = Math.max(height * 0.22, caliper * 5);

  const topFlap = (id: string, edge: "far" | "xmin"): PanelNode =>
    node({
      id,
      edge,
      span: flap,
      shape: "rect",
      openAngle: -HALF_PI,
      phase: id.includes("minor") ? [0.76, 0.9] : [0.86, 1],
    });

  const bottomFlap = (id: string, edge: "xmax"): PanelNode =>
    node({
      id,
      edge,
      span: flap,
      shape: "rect",
      phase: id.includes("minor") ? [0.48, 0.64] : [0.62, 0.8],
      layer: id.includes("minor") ? -1 : 1,
    });

  const leftWall = node({
    id: "left-wall",
    edge: "far",
    span: depth,
    phase: [0.32, 0.48],
    children: [
      topFlap("top-left-minor", "xmin"),
      bottomFlap("bottom-left-minor", "xmax"),
      node({
        id: "manufacturer-joint",
        edge: "far",
        span: glue,
        shape: "glue",
        phase: [0.4, 0.56],
      }),
    ],
  });

  const backWall = node({
    id: "back-wall",
    edge: "far",
    span: width,
    phase: [0.24, 0.4],
    children: [
      topFlap("top-back-major", "xmin"),
      bottomFlap("bottom-back-major", "xmax"),
      leftWall,
    ],
  });

  const rightWall = node({
    id: "right-wall",
    edge: "xmax",
    span: depth,
    phase: [0.16, 0.32],
    children: [
      topFlap("top-right-minor", "xmin"),
      bottomFlap("bottom-right-minor", "xmax"),
      backWall,
    ],
  });

  const frontWall = node({
    id: "front-wall",
    edge: "far",
    span: height,
    phase: [0.02, 0.2],
    printed: true,
    children: [topFlap("top-front-major", "far"), rightWall],
  });

  const root: PanelNode = {
    id: "bottom-front-major",
    width,
    span: flap,
    shape: "rect",
    children: [frontWall],
  };

  return {
    type: "shipping",
    units: "scene",
    dimensions: { width, depth, height, caliper },
    pieces: [
      {
        id: "rsc-blank",
        root,
        assemblyPosition: [-width / 2, 0, 0],
        assemblyPhase: [0.14, 0.62],
      },
    ],
    sources: [DIELINE_SOURCES.fold, DIELINE_SOURCES.shipping],
  };
}

function drawerBlueprint(
  width: number,
  depth: number,
  height: number,
  caliper: number,
): BoxBlueprint {
  const clearance = Math.max(caliper * 1.5, Math.min(width, depth) * 0.008);
  const trayWidth = Math.max(width - clearance * 2, width * 0.82);
  const trayDepth = Math.max(depth - clearance * 2, depth * 0.82);
  const trayHeight = Math.max(height - clearance * 1.5, height * 0.82);
  const cornerEar = Math.min(trayHeight * 0.92, trayDepth * 0.44);
  const sleeveWidth = width + clearance;
  const sleeveDepth = depth + clearance;
  const sleeveHeight = height + clearance * 0.5;
  const glue = Math.max(caliper * 5, sleeveHeight * 0.2);

  const wallWithEars = (
    id: string,
    edge: "near" | "far",
  ): PanelNode =>
    node({
      id,
      edge,
      span: trayHeight,
      phase: [0.16, 0.42],
      children: [
        node({
          id: `${id}-left-corner-ear`,
          edge: "xmin",
          span: cornerEar,
          shape: "ear",
          phase: [0.04, 0.2],
        }),
        node({
          id: `${id}-right-corner-ear`,
          edge: "xmax",
          span: cornerEar,
          shape: "ear",
          phase: [0.04, 0.2],
        }),
      ],
    });

  const trayRoot: PanelNode = {
    id: "drawer-bottom",
    width: trayWidth,
    span: trayDepth,
    shape: "rect",
    printed: true,
    children: [
      wallWithEars("drawer-front-wall", "near"),
      wallWithEars("drawer-back-wall", "far"),
      node({
        id: "drawer-left-wall",
        edge: "xmin",
        span: trayHeight,
        phase: [0.24, 0.48],
      }),
      node({
        id: "drawer-right-wall",
        edge: "xmax",
        span: trayHeight,
        phase: [0.24, 0.48],
      }),
    ],
  };

  const sleeveRoot: PanelNode = {
    id: "sleeve-bottom",
    width: sleeveWidth,
    span: sleeveDepth,
    shape: "rect",
    children: [
      node({
        id: "sleeve-back-side",
        edge: "far",
        span: sleeveHeight,
        phase: [0.1, 0.3],
        children: [
          node({
            id: "sleeve-top",
            edge: "far",
            span: sleeveDepth + caliper * 2,
            phase: [0.22, 0.42],
            printed: true,
            children: [
              node({
                id: "sleeve-front-side",
                edge: "far",
                span: sleeveHeight + caliper,
                phase: [0.34, 0.54],
                children: [
                  node({
                    id: "sleeve-glue-tab",
                    edge: "far",
                    span: glue,
                    shape: "glue",
                    phase: [0.44, 0.6],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  };

  const tray: PieceBlueprint = {
    id: "drawer-tray",
    root: trayRoot,
    assemblyPosition: [-trayWidth / 2, -trayDepth / 2, caliper * 0.35],
    openPosition: [
      -trayWidth / 2 - width * 0.58,
      -trayDepth / 2,
      caliper * 0.35,
    ],
    assemblyPhase: [0.66, 0.96],
  };
  const sleeve: PieceBlueprint = {
    id: "drawer-sleeve",
    root: sleeveRoot,
    assemblyPosition: [-sleeveWidth / 2, -sleeveDepth / 2, 0],
    openPosition: [-sleeveWidth / 2, -sleeveDepth / 2, 0],
    assemblyPhase: [0.66, 0.9],
  };

  return {
    type: "drawer",
    units: "scene",
    dimensions: { width, depth, height, caliper },
    pieces: [tray, sleeve],
    openingAxis: [1, 0, 0],
    sources: [DIELINE_SOURCES.fold, DIELINE_SOURCES.drawer],
  };
}

export function createBoxBlueprint(
  boxType: BlueprintBoxType,
  width: number,
  depth: number,
  height: number,
  caliper: number,
): BoxBlueprint {
  if (boxType === "shipping") {
    return shippingBlueprint(width, depth, height, caliper);
  }
  if (boxType === "drawer") {
    return drawerBlueprint(width, depth, height, caliper);
  }
  return mailerBlueprint(width, depth, height, caliper);
}
