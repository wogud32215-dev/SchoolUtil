export const WIDGET_IDS = [
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

export function isWidgetId(value: string): boolean {
  return (WIDGET_IDS as readonly string[]).includes(value);
}
