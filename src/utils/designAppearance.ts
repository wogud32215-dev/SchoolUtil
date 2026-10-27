import type { AppTheme } from "../types/state";

export type BackgroundFill = "transparent" | "panel" | "full";

export const BACKGROUND_FILL_OPTIONS: {
  id: BackgroundFill;
  label: string;
}[] = [
  { id: "transparent", label: "없음 (투명)" },
  { id: "panel", label: "반투명 판" },
  { id: "full", label: "꽉 채움" },
];

/** 테마별 카드 불투명도 기본값(%) — themes.css --bg-card 알파에 맞춤 */
const THEME_CARD_OPACITY: Record<AppTheme, number> = {
  sky: 72,
  paper: 92,
  mint: 78,
  sand: 85,
  slate: 82,
  pink: 80,
  coral: 75,
  blue: 85,
  green: 88,
  dark: 85,
};

export function themeDefaultCardOpacity(theme: AppTheme): number {
  return THEME_CARD_OPACITY[theme] ?? 86;
}

export function clampCardOpacity(value: number): number {
  if (!Number.isFinite(value)) return 86;
  return Math.round(Math.min(100, Math.max(15, value)));
}

export function normalizeBackgroundFill(
  raw: unknown,
): BackgroundFill {
  if (raw === "panel" || raw === "full") return raw;
  return "transparent";
}
