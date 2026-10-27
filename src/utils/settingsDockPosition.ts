/** 화면 비율(0–100). 독 중심점. */
export const DEFAULT_SETTINGS_DOCK_X = 50;
export const DEFAULT_SETTINGS_DOCK_Y = 94;

const MIN = 6;
const MAX = 94;

export function clampDockPercent(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS_DOCK_X;
  return Math.min(MAX, Math.max(MIN, value));
}

export function normalizeSettingsDockPosition(
  x: unknown,
  y: unknown,
): { x: number; y: number } {
  return {
    x: clampDockPercent(typeof x === "number" ? x : DEFAULT_SETTINGS_DOCK_X),
    y: clampDockPercent(typeof y === "number" ? y : DEFAULT_SETTINGS_DOCK_Y),
  };
}
