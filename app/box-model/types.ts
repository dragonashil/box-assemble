export type BlueprintBoxType = "mailer" | "shipping" | "drawer";

export type EdgeName = "near" | "far" | "xmin" | "xmax";

export type PanelShape =
  | "rect"
  | "dust"
  | "ear"
  | "glue"
  | "hook"
  | "tuck";

export type Point2 = readonly [x: number, y: number];
export type Point3 = readonly [x: number, y: number, z: number];
export type Bounds2 = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type PanelNode = {
  id: string;
  edge?: EdgeName;
  width?: number;
  span: number;
  shape?: PanelShape;
  angle?: number;
  openAngle?: number;
  phase?: readonly [start: number, end: number];
  printed?: boolean;
  layer?: number;
  detailCuts?: readonly (readonly Point2[])[];
  children?: readonly PanelNode[];
};

export type PieceBlueprint = {
  id: string;
  root: PanelNode;
  assemblyPosition: Point3;
  openPosition?: Point3;
  assemblyPhase?: readonly [start: number, end: number];
};

export type BlueprintSource = {
  name: string;
  url: string;
  revision?: string;
  license: "MIT" | "Independent implementation";
  use: string;
};

export type BoxBlueprint = {
  type: BlueprintBoxType;
  units: "scene";
  dimensions: {
    width: number;
    depth: number;
    height: number;
    caliper: number;
  };
  pieces: readonly PieceBlueprint[];
  openingAxis?: Point3;
  sources: readonly BlueprintSource[];
};

export type FlatPlacement = {
  id: string;
  bounds: Bounds2;
  position: Point2;
};
