import type { FontWeightLevel } from "@/types/state";

export const FONT_WEIGHT_LEVEL_OPTIONS: {
  id: FontWeightLevel;
  step: number;
  label: string;
}[] = [
  { id: "light", step: 1, label: "1단계 · 가늘게" },
  { id: "normal", step: 2, label: "2단계 · 보통" },
  { id: "medium", step: 3, label: "3단계 · 중간" },
  { id: "strong", step: 4, label: "4단계 · 굵게" },
  { id: "heavy", step: 5, label: "5단계 · 아주 굵게" },
];

const LEVELS: FontWeightLevel[] = [
  "light",
  "normal",
  "medium",
  "strong",
  "heavy",
];

export function normalizeFontWeightLevel(
  value: unknown,
  fallback: FontWeightLevel = "medium",
): FontWeightLevel {
  return LEVELS.includes(value as FontWeightLevel)
    ? (value as FontWeightLevel)
    : fallback;
}
