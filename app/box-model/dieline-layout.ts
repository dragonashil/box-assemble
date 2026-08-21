import type {
  Bounds2,
  EdgeName,
  FlatPlacement,
  PanelNode,
  PanelShape,
  PieceBlueprint,
  Point2,
} from "./types.ts";

type Matrix2 = readonly [
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
];

const IDENTITY: Matrix2 = [1, 0, 0, 1, 0, 0];

function multiply(left: Matrix2, right: Matrix2): Matrix2 {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ];
}

function transformPoint(matrix: Matrix2, point: Point2): Point2 {
  return [
    matrix[0] * point[0] + matrix[2] * point[1] + matrix[4],
    matrix[1] * point[0] + matrix[3] * point[1] + matrix[5],
  ];
}

export function edgeFrame(
  width: number,
  span: number,
  edge: EdgeName,
) {
  if (edge === "far") {
    return { x: 0, y: span, rotation: 0, length: width };
  }
  if (edge === "near") {
    return { x: width, y: 0, rotation: Math.PI, length: width };
  }
  if (edge === "xmax") {
    return {
      x: width,
      y: span,
      rotation: -Math.PI / 2,
      length: span,
    };
  }
  return { x: 0, y: 0, rotation: Math.PI / 2, length: span };
}

export function panelShapePoints(
  shape: PanelShape | undefined,
  width: number,
  span: number,
): readonly Point2[] {
  if (shape === "dust") {
    const shoulder = Math.min(width * 0.12, span * 0.32);
    const inset = Math.min(width * 0.035, shoulder * 0.35);
    return [
      [inset, 0],
      [width - inset, 0],
      [width - shoulder * 0.5, span * 0.78],
      [width - shoulder, span],
      [shoulder, span],
      [shoulder * 0.5, span * 0.78],
    ];
  }

  if (shape === "ear") {
    const inset = Math.min(width * 0.16, span * 0.22);
    return [
      [0, 0],
      [width, 0],
      [width - inset * 0.35, span * 0.82],
      [width - inset, span],
      [inset * 0.5, span],
      [0, span * 0.76],
    ];
  }

  if (shape === "glue") {
    const inset = Math.min(width * 0.16, span * 0.4);
    return [
      [0, 0],
      [width, 0],
      [width - inset, span],
      [inset, span],
    ];
  }

  if (shape === "tuck") {
    const shoulder = Math.min(width * 0.07, span * 0.34);
    return [
      [0, 0],
      [width, 0],
      [width - shoulder * 0.4, span * 0.16],
      [width - shoulder, span * 0.82],
      [width - shoulder * 1.7, span],
      [shoulder * 1.7, span],
      [shoulder, span * 0.82],
      [shoulder * 0.4, span * 0.16],
    ];
  }

  if (shape === "hook") {
    const tab = Math.min(span * 0.13, width * 0.035);
    return [
      [0, 0],
      [width, 0],
      [width, span],
      [width * 0.72, span],
      [width * 0.72, span + tab],
      [width * 0.6, span + tab],
      [width * 0.6, span],
      [width * 0.4, span],
      [width * 0.4, span + tab],
      [width * 0.28, span + tab],
      [width * 0.28, span],
      [0, span],
    ];
  }

  return [
    [0, 0],
    [width, 0],
    [width, span],
    [0, span],
  ];
}

function includePoint(bounds: Bounds2, point: Point2) {
  bounds.minX = Math.min(bounds.minX, point[0]);
  bounds.minY = Math.min(bounds.minY, point[1]);
  bounds.maxX = Math.max(bounds.maxX, point[0]);
  bounds.maxY = Math.max(bounds.maxY, point[1]);
}

export function computePieceFlatBounds(piece: PieceBlueprint): Bounds2 {
  const bounds: Bounds2 = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  const visit = (
    node: PanelNode,
    width: number,
    transform: Matrix2,
  ) => {
    panelShapePoints(node.shape, width, node.span).forEach((point) => {
      includePoint(bounds, transformPoint(transform, point));
    });

    node.children?.forEach((child) => {
      if (!child.edge) return;
      const frame = edgeFrame(width, node.span, child.edge);
      const cos = Math.cos(frame.rotation);
      const sin = Math.sin(frame.rotation);
      const childMatrix: Matrix2 = [
        cos,
        sin,
        -sin,
        cos,
        frame.x,
        frame.y,
      ];
      visit(child, frame.length, multiply(transform, childMatrix));
    });
  };

  visit(piece.root, piece.root.width ?? 0, IDENTITY);
  return bounds;
}

export function translateBounds(bounds: Bounds2, position: Point2): Bounds2 {
  return {
    minX: bounds.minX + position[0],
    minY: bounds.minY + position[1],
    maxX: bounds.maxX + position[0],
    maxY: bounds.maxY + position[1],
  };
}

export function boundsGap(first: Bounds2, second: Bounds2) {
  return Math.max(
    second.minX - first.maxX,
    first.minX - second.maxX,
    second.minY - first.maxY,
    first.minY - second.maxY,
  );
}

export function boundsOverlapArea(first: Bounds2, second: Bounds2) {
  const width = Math.max(
    0,
    Math.min(first.maxX, second.maxX) - Math.max(first.minX, second.minX),
  );
  const height = Math.max(
    0,
    Math.min(first.maxY, second.maxY) - Math.max(first.minY, second.minY),
  );
  return width * height;
}

export function createFlatLayout(
  pieces: readonly PieceBlueprint[],
  gap: number,
): readonly FlatPlacement[] {
  const source = pieces.map((piece) => ({
    piece,
    bounds: computePieceFlatBounds(piece),
  }));
  let cursor = 0;
  const placements = source.map(({ piece, bounds }) => {
    const width = bounds.maxX - bounds.minX;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const position: Point2 = [cursor - bounds.minX, -centerY];
    cursor += width + gap;
    return { id: piece.id, bounds, position };
  });

  const totalWidth = Math.max(0, cursor - gap);
  return placements.map((placement) => ({
    ...placement,
    position: [
      placement.position[0] - totalWidth / 2,
      placement.position[1],
    ],
  }));
}

export function collectPanelNodes(root: PanelNode): readonly PanelNode[] {
  const result: PanelNode[] = [];
  const visit = (node: PanelNode) => {
    result.push(node);
    node.children?.forEach(visit);
  };
  visit(root);
  return result;
}
