import type { LayoutItem } from "@/types/state";

export const ALL_WIDGET_IDS = [
  "clock",
  "weather",
  "meal",
  "calendar",
  "dday",
  "memo",
  "todo",
  "timetable",
  "schoolsched",
  "settings",
] as const;

export type WidgetId = (typeof ALL_WIDGET_IDS)[number];

export const DEFAULT_LAYOUT: Record<WidgetId, LayoutItem> = {
  clock: { x: 0, y: 0, w: 3, h: 4 },
  weather: { x: 3, y: 0, w: 3, h: 4 },
  meal: { x: 6, y: 0, w: 3, h: 6 },
  calendar: { x: 9, y: 0, w: 3, h: 7 },
  dday: { x: 0, y: 4, w: 4, h: 6 },
  memo: { x: 4, y: 4, w: 4, h: 7 },
  todo: { x: 8, y: 4, w: 4, h: 8 },
  timetable: { x: 0, y: 12, w: 7, h: 10 },
  schoolsched: { x: 7, y: 12, w: 5, h: 8 },
  settings: { x: 7, y: 20, w: 5, h: 7 },
};

export const WIDGET_TITLES: Record<WidgetId, string> = {
  clock: "시계",
  weather: "날씨",
  meal: "급식 (NEIS)",
  calendar: "달력",
  dday: "D-Day",
  memo: "메모",
  todo: "할 일",
  timetable: "시간표 (수동)",
  schoolsched: "학사일정 (NEIS)",
  settings: "설정",
};

export const WIDGET_TOGGLE_LABELS: { id: WidgetId; label: string }[] = [
  { id: "clock", label: "시계" },
  { id: "weather", label: "날씨" },
  { id: "meal", label: "급식" },
  { id: "calendar", label: "달력" },
  { id: "dday", label: "D-Day" },
  { id: "memo", label: "메모" },
  { id: "todo", label: "할 일" },
  { id: "timetable", label: "시간표" },
  { id: "schoolsched", label: "학사일정" },
];

export function isWidgetId(value: string): value is WidgetId {
  return (ALL_WIDGET_IDS as readonly string[]).includes(value);
}

export function isWidgetVisible(
  id: WidgetId,
  disabledWidgets: readonly string[],
): boolean {
  if (id === "settings") return true;
  return !disabledWidgets.includes(id);
}

export function visibleWidgetIds(disabledWidgets: readonly string[]): WidgetId[] {
  return ALL_WIDGET_IDS.filter((id) => isWidgetVisible(id, disabledWidgets));
}
