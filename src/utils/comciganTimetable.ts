import type {
  ComciganLessonChip,
  ComciganTimetableView,
  TimetableData,
} from "@/types/state";
import { TIMETABLE_DAY_LABELS } from "@/utils/timetableSubstitute";

export function dayOfMonthFromYmd(ymd: string): number {
  const parts = ymd.split("-");
  const d = Number(parts[2]);
  return Number.isFinite(d) ? d : 0;
}

export function formatSubstituteWhen(
  dateYmd: string,
  dayIndex: number,
  period: number,
  periodTime: string,
): string {
  const parts = dateYmd.split("-");
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  const day = TIMETABLE_DAY_LABELS[dayIndex] ?? "";
  const monthDay =
    Number.isFinite(m) && Number.isFinite(d) ? `${m}월 ${d}일` : dateYmd;
  const time = periodTime ? ` · ${periodTime}` : "";
  return `${monthDay} (${day}) · ${period}교시${time}`;
}

export function classCodeToGradeClass(classCode: string): string {
  const n = Number(classCode);
  if (!Number.isFinite(n) || n < 100) return classCode;
  const grade = Math.floor(n / 100);
  const cls = n % 100;
  return `${grade}학년 ${cls}반`;
}

export function hasComciganView(tt: TimetableData): boolean {
  return Boolean(tt.comciganView?.chips?.length);
}

export function cellChips(
  view: ComciganTimetableView,
  day: number,
  period: number,
): ComciganLessonChip[] {
  return view.chips[day]?.[period] ?? [];
}

export function cellHasSubstitute(
  view: ComciganTimetableView,
  day: number,
  period: number,
): boolean {
  return cellChips(view, day, period).some((c) => c.changed);
}

export function cellHasVacated(
  view: ComciganTimetableView,
  day: number,
  period: number,
): boolean {
  return cellChips(view, day, period).some((c) => c.vacated);
}
