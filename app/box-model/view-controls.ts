export type OrbitAngles = {
  yaw: number;
  pitch: number;
};

export const DEFAULT_ORBIT_ANGLES: OrbitAngles = {
  yaw: -0.46,
  pitch: -0.07,
};

export const ORBIT_DRAG_SPEED = 0.008;
export const ORBIT_PITCH_LIMIT = Math.PI / 2 - 0.02;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function orbitAnglesAfterDrag(
  current: OrbitAngles,
  deltaX: number,
  deltaY: number,
): OrbitAngles {
  return {
    yaw: current.yaw + deltaX * ORBIT_DRAG_SPEED,
    pitch: Math.min(
      ORBIT_PITCH_LIMIT,
      Math.max(
        -ORBIT_PITCH_LIMIT,
        current.pitch + deltaY * ORBIT_DRAG_SPEED,
      ),
    ),
  };
}

export function floorVisibilityForPitch(pitch: number) {
  const inspectionProgress = clamp01(
    (Math.abs(pitch) / ORBIT_PITCH_LIMIT - 0.58) / 0.34,
  );
  const eased =
    inspectionProgress * inspectionProgress * (3 - 2 * inspectionProgress);
  return 1 - eased;
}
