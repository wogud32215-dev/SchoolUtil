import type { LayoutItem, LayoutPreset } from "@/types/state";

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
  "workportal",
  "settings",
] as const;

export type WidgetId = (typeof ALL_WIDGET_IDS)[number];

/** 이전 기본 배치 (다크 시대 밀집형) */
export const CLASSIC_LAYOUT: Record<WidgetId, LayoutItem> = {
  clock: { x: 0, y: 0, w: 3, h: 4 },
  weather: { x: 3, y: 0, w: 3, h: 4 },
  meal: { x: 6, y: 0, w: 3, h: 6 },
  calendar: { x: 9, y: 0, w: 3, h: 9 },
  dday: { x: 0, y: 4, w: 4, h: 6 },
  memo: { x: 4, y: 4, w: 4, h: 7 },
  todo: { x: 8, y: 4, w: 4, h: 8 },
  timetable: { x: 0, y: 12, w: 7, h: 10 },
  schoolsched: { x: 7, y: 12, w: 5, h: 8 },
  workportal: { x: 0, y: 22, w: 4, h: 5 },
  settings: { x: 7, y: 20, w: 5, h: 7 },
};

/** 벤토형 기본 배치 (신규·초기화) */
export const DEFAULT_LAYOUT: Record<WidgetId, LayoutItem> = {
  clock: { x: 0, y: 0, w: 3, h: 3 },
  weather: { x: 3, y: 0, w: 3, h: 3 },
  meal: { x: 6, y: 0, w: 3, h: 5 },
  dday: { x: 9, y: 0, w: 3, h: 4 },
  calendar: { x: 0, y: 3, w: 5, h: 10 },
  todo: { x: 5, y: 3, w: 4, h: 6 },
  memo: { x: 5, y: 9, w: 4, h: 4 },
  schoolsched: { x: 9, y: 4, w: 3, h: 9 },
  timetable: { x: 0, y: 11, w: 8, h: 9 },
  workportal: { x: 8, y: 13, w: 4, h: 4 },
  settings: { x: 8, y: 17, w: 4, h: 3 },
};

const RECOMMENDED_LAYOUT: Record<WidgetId, LayoutItem> = {
  calendar: { x: 0, y: 0, w: 8, h: 11 },
  clock: { x: 8, y: 0, w: 2, h: 3 },
  weather: { x: 10, y: 0, w: 1, h: 3 },
  workportal: { x: 11, y: 0, w: 1, h: 3 },
  todo: { x: 8, y: 3, w: 4, h: 8 },
  memo: { x: 0, y: 11, w: 3, h: 4 },
  meal: { x: 3, y: 11, w: 2, h: 4 },
  schoolsched: { x: 5, y: 11, w: 2, h: 6 },
  timetable: { x: 7, y: 11, w: 5, h: 7 },
  dday: { x: 0, y: 13, w: 3, h: 4 },
  settings: { x: 4, y: 23, w: 4, h: 3 },
};

const CALENDAR_LAYOUT: Record<WidgetId, LayoutItem> = {
  ...DEFAULT_LAYOUT,
  calendar: { x: 0, y: 2, w: 7, h: 13 },
  clock: { x: 7, y: 0, w: 2, h: 3 },
  weather: { x: 9, y: 0, w: 3, h: 3 },
  meal: { x: 7, y: 3, w: 5, h: 4 },
  todo: { x: 7, y: 7, w: 5, h: 6 },
  memo: { x: 0, y: 13, w: 4, h: 4 },
  dday: { x: 4, y: 13, w: 3, h: 4 },
  schoolsched: { x: 7, y: 13, w: 5, h: 5 },
  timetable: { x: 0, y: 17, w: 12, h: 6 },
  workportal: { x: 0, y: 23, w: 4, h: 3 },
  settings: { x: 4, y: 23, w: 4, h: 3 },
};

const TIMETABLE_LAYOUT: Record<WidgetId, LayoutItem> = {
  ...DEFAULT_LAYOUT,
  timetable: { x: 0, y: 3, w: 12, h: 11 },
  clock: { x: 0, y: 0, w: 2, h: 3 },
  weather: { x: 2, y: 0, w: 2, h: 3 },
  meal: { x: 4, y: 0, w: 3, h: 3 },
  calendar: { x: 7, y: 0, w: 5, h: 8 },
  todo: { x: 7, y: 6, w: 5, h: 5 },
  dday: { x: 7, y: 11, w: 5, h: 3 },
  memo: { x: 0, y: 14, w: 4, h: 4 },
  schoolsched: { x: 4, y: 14, w: 3, h: 4 },
  workportal: { x: 0, y: 18, w: 4, h: 3 },
  settings: { x: 4, y: 18, w: 4, h: 3 },
};

const COMPACT_LAYOUT: Record<WidgetId, LayoutItem> = {
  clock: { x: 0, y: 0, w: 2, h: 2 },
  weather: { x: 2, y: 0, w: 2, h: 2 },
  meal: { x: 4, y: 0, w: 3, h: 3 },
  dday: { x: 7, y: 0, w: 2, h: 3 },
  calendar: { x: 9, y: 0, w: 3, h: 7 },
  todo: { x: 0, y: 2, w: 4, h: 5 },
  memo: { x: 4, y: 3, w: 3, h: 4 },
  schoolsched: { x: 0, y: 7, w: 6, h: 5 },
  timetable: { x: 6, y: 5, w: 6, h: 7 },
  workportal: { x: 0, y: 12, w: 3, h: 3 },
  settings: { x: 3, y: 12, w: 3, h: 3 },
};

const WIDE_LAYOUT: Record<WidgetId, LayoutItem> = {
  clock: { x: 0, y: 0, w: 2, h: 2 },
  weather: { x: 2, y: 0, w: 2, h: 2 },
  meal: { x: 4, y: 0, w: 2, h: 3 },
  dday: { x: 6, y: 0, w: 2, h: 3 },
  calendar: { x: 8, y: 0, w: 4, h: 7 },
  todo: { x: 0, y: 2, w: 4, h: 4 },
  memo: { x: 4, y: 3, w: 2, h: 3 },
  schoolsched: { x: 0, y: 6, w: 6, h: 4 },
  timetable: { x: 0, y: 10, w: 12, h: 8 },
  workportal: { x: 6, y: 6, w: 3, h: 3 },
  settings: { x: 9, y: 6, w: 3, h: 3 },
};

export const LAYOUT_PRESETS: Record<LayoutPreset, Record<WidgetId, LayoutItem>> =
  {
    recommended: RECOMMENDED_LAYOUT,
    bento: DEFAULT_LAYOUT,
    classic: CLASSIC_LAYOUT,
    calendar: CALENDAR_LAYOUT,
    timetable: TIMETABLE_LAYOUT,
    compact: COMPACT_LAYOUT,
    wide: WIDE_LAYOUT,
  };

export const LAYOUT_PRESET_OPTIONS: { id: LayoutPreset; label: string }[] = [
  { id: "recommended", label: "추천 셋팅" },
  { id: "bento", label: "벤토" },
  { id: "classic", label: "클래식" },
  { id: "calendar", label: "달력 중심" },
  { id: "timetable", label: "시간표 중심" },
  { id: "compact", label: "간결" },
  { id: "wide", label: "와이드" },
];

export function layoutForPreset(
  preset: LayoutPreset,
): Record<WidgetId, LayoutItem> {
  return { ...LAYOUT_PRESETS[preset] };
}

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
  workportal: "자동 로그인 위젯",
  settings: "설정",
};

/** 그리드 카드 제목줄 (짧은 표기·개수 반영) */
export function widgetHeaderLabel(
  id: WidgetId,
  ctx?: { memoCount?: number },
): string {
  if (id === "todo") return "할일";
  if (id === "memo") {
    const n = ctx?.memoCount ?? 0;
    return n > 0 ? `메모 ${n}장` : "메모";
  }
  return WIDGET_TITLES[id];
}

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
  { id: "workportal", label: "자동 로그인 위젯" },
];

export function isWidgetId(value: string): value is WidgetId {
  return (ALL_WIDGET_IDS as readonly string[]).includes(value);
}

export function isWidgetVisible(
  id: WidgetId,
  disabledWidgets: readonly string[],
): boolean {
  if (id === "settings") return false;
  return !disabledWidgets.includes(id);
}

/** 대시보드 그리드에 올릴 위젯 (설정은 도크·모달) */
export function visibleWidgetIds(disabledWidgets: readonly string[]): WidgetId[] {
  return ALL_WIDGET_IDS.filter((id) => isWidgetVisible(id, disabledWidgets));
}
