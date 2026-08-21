import assert from "node:assert/strict";
import test from "node:test";
import {
  boundsOverlapArea,
  collectPanelNodes,
  computePieceFlatBounds,
  createFlatLayout,
  panelShapePoints,
  translateBounds,
} from "../app/box-model/dieline-layout.ts";
import { createBoxBlueprint } from "../app/box-model/templates.ts";
import {
  DEFAULT_ORBIT_ANGLES,
  ORBIT_PITCH_LIMIT,
  floorVisibilityForPitch,
  orbitAnglesAfterDrag,
} from "../app/box-model/view-controls.ts";

const dimensions = { width: 3, depth: 2, height: 1.1, caliper: 0.02 };

function blueprint(type) {
  return createBoxBlueprint(
    type,
    dimensions.width,
    dimensions.depth,
    dimensions.height,
    dimensions.caliper,
  );
}

test("packs drawer tray and sleeve as two non-overlapping blanks", () => {
  const drawer = blueprint("drawer");
  assert.equal(drawer.pieces.length, 2);
  const gap = 0.3;
  const placements = createFlatLayout(drawer.pieces, gap);
  const tray = translateBounds(placements[0].bounds, placements[0].position);
  const sleeve = translateBounds(placements[1].bounds, placements[1].position);

  assert.equal(boundsOverlapArea(tray, sleeve), 0);
  assert.ok(sleeve.minX - tray.maxX >= gap - 1e-9);
});

test("keeps drawer folding and sliding as independent constraints", () => {
  const drawer = blueprint("drawer");
  const tray = drawer.pieces.find((piece) => piece.id === "drawer-tray");
  assert.ok(tray?.openPosition);
  assert.deepEqual(drawer.openingAxis, [1, 0, 0]);
  assert.equal(tray.openPosition[1], tray.assemblyPosition[1]);
  assert.equal(tray.openPosition[2], tray.assemblyPosition[2]);
  assert.notEqual(tray.openPosition[0], tray.assemblyPosition[0]);
  assert.ok(
    collectPanelNodes(tray.root).some((node) =>
      node.id.endsWith("corner-ear"),
    ),
  );
  assert.ok(tray.root.children[0].span > dimensions.height * 0.8);
});

test("uses breadth/2 for every RSC top and bottom flap", () => {
  const shipping = blueprint("shipping");
  const nodes = collectPanelNodes(shipping.pieces[0].root);
  const flaps = nodes.filter(
    (node) => node.id.startsWith("top-") || node.id.startsWith("bottom-"),
  );
  assert.equal(flaps.length, 8);
  flaps.forEach((flap) => {
    assert.ok(Math.abs(flap.span - dimensions.depth / 2) < 1e-9);
  });
  nodes
    .filter((node) => node.id.startsWith("top-"))
    .forEach((flap) => assert.equal(flap.openAngle, -Math.PI / 2));
});

test("changes only the mailer lid hinge in the named open pose", () => {
  const mailer = blueprint("mailer");
  const nodes = collectPanelNodes(mailer.pieces[0].root);
  const openJoints = nodes.filter((node) => node.openAngle !== undefined);
  assert.deepEqual(openJoints.map((node) => node.id), ["lid-hinge"]);
  assert.equal(openJoints[0].openAngle, 0);
  assert.ok(nodes.some((node) => node.shape === "hook"));
  assert.ok(nodes.some((node) => node.shape === "dust"));
  assert.ok(nodes.some((node) => node.shape === "ear"));
});

test("generates positive-area panel polygons and unique hinge ids", () => {
  for (const type of ["mailer", "shipping", "drawer"]) {
    const model = blueprint(type);
    const ids = new Set();
    model.pieces.forEach((piece) => {
      collectPanelNodes(piece.root).forEach((node) => {
        assert.equal(ids.has(node.id), false, `${type}: duplicate ${node.id}`);
        ids.add(node.id);
        const width = node.width ?? Math.max(node.span, 0.1);
        const points = panelShapePoints(node.shape, width, node.span);
        const area = Math.abs(
          points.reduce((sum, point, index) => {
            const next = points[(index + 1) % points.length];
            return sum + point[0] * next[1] - next[0] * point[1];
          }, 0) / 2,
        );
        assert.ok(area > 0, `${type}: zero-area ${node.id}`);
      });
    });
  }
});

test("keeps all template bounds finite across wide, tall and compact sizes", () => {
  const cases = [
    [4.2, 1.1, 0.62],
    [1.4, 3.6, 1.25],
    [1.2, 1, 0.92],
  ];
  for (const [width, depth, height] of cases) {
    for (const type of ["mailer", "shipping", "drawer"]) {
      const model = createBoxBlueprint(type, width, depth, height, 0.018);
      const layout = createFlatLayout(
        model.pieces,
        Math.max(0.2, Math.min(width, depth) * 0.1),
      );
      model.pieces.forEach((piece) => {
        const bounds = computePieceFlatBounds(piece);
        Object.values(bounds).forEach((value) => assert.ok(Number.isFinite(value)));
        assert.ok(bounds.maxX > bounds.minX);
        assert.ok(bounds.maxY > bounds.minY);
      });
      if (layout.length === 2) {
        const first = translateBounds(layout[0].bounds, layout[0].position);
        const second = translateBounds(layout[1].bounds, layout[1].position);
        assert.equal(boundsOverlapArea(first, second), 0);
      }
    }
  }
});

test("orbits far enough to inspect both the top and bottom panels", () => {
  const topView = orbitAnglesAfterDrag(DEFAULT_ORBIT_ANGLES, 0, 1000);
  const bottomView = orbitAnglesAfterDrag(DEFAULT_ORBIT_ANGLES, 0, -1000);

  assert.equal(topView.pitch, ORBIT_PITCH_LIMIT);
  assert.equal(bottomView.pitch, -ORBIT_PITCH_LIMIT);
  assert.ok(topView.pitch > Math.PI / 3);
  assert.ok(bottomView.pitch < -Math.PI / 3);
  assert.equal(topView.yaw, DEFAULT_ORBIT_ANGLES.yaw);
  assert.ok(floorVisibilityForPitch(topView.pitch) < 0.01);
  assert.ok(floorVisibilityForPitch(bottomView.pitch) < 0.01);
});

test("maps horizontal and vertical pointer movement independently", () => {
  const horizontal = orbitAnglesAfterDrag(DEFAULT_ORBIT_ANGLES, 120, 0);
  const vertical = orbitAnglesAfterDrag(DEFAULT_ORBIT_ANGLES, 0, 120);

  assert.notEqual(horizontal.yaw, DEFAULT_ORBIT_ANGLES.yaw);
  assert.equal(horizontal.pitch, DEFAULT_ORBIT_ANGLES.pitch);
  assert.equal(vertical.yaw, DEFAULT_ORBIT_ANGLES.yaw);
  assert.notEqual(vertical.pitch, DEFAULT_ORBIT_ANGLES.pitch);
});
