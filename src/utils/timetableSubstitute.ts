import type { TimetableData, TimetableSubstituteChange } from "@/types/state";
import {
  classCodeToGradeClass,
  formatSubstituteWhen,
} from "@/utils/comciganTimetable";
import { normalizeTimetable } from "@/utils/timetable";

export const TIMETABLE_DAY_LABELS = ["월", "화", "수", "목", "금"];

export type TimetableSubstituteEntry = {
  dayIndex: number;
  dayLabel: string;
  period: number;
  dateYmd: string;
  periodTime: string;
  whenLabel: string;
  classCode: string;
  gradeClassLabel: string;
  subject: string;
  originalSubject: string;
  text: string;
};

function legacyParseCell(text: string): Partial<TimetableSubstituteEntry> {
  const origMatch = text.match(/\(교체·원:\s*([^)]+)\)/);
  const originalSubject = origMatch?.[1]?.trim() ?? "—";
  const subjectPart = text.replace(/\s*\(교체[^)]*\)/g, "").trim();
  return { originalSubject, subject: subjectPart };
}

function changeToEntry(c: TimetableSubstituteChange): TimetableSubstituteEntry {
  const dayLabel = TIMETABLE_DAY_LABELS[c.dayIndex] ?? "";
  return {
    dayIndex: c.dayIndex,
    dayLabel,
    period: c.period,
    dateYmd: c.dateYmd,
    periodTime: c.periodTime,
    whenLabel: formatSubstituteWhen(
      c.dateYmd,
      c.dayIndex,
      c.period,
      c.periodTime,
    ),
    classCode: c.classCode,
    gradeClassLabel: classCodeToGradeClass(c.classCode),
    subject: c.subject,
    originalSubject: c.originalSubject,
    text: `${c.classCode}${c.subject}`,
  };
}

export function isSubstituteCell(
  tt: TimetableData,
  day: number,
  period: number,
): boolean {
  const norm = normalizeTimetable(tt);
  const chips = norm.comciganView?.chips[day]?.[period];
  if (chips?.some((c) => c.changed)) return true;
  if (norm.substituteFlags?.[day]?.[period]) return true;
  const text = norm.grid[day]?.[period] ?? "";
  return text.includes("(교체)");
}

export function listSubstituteEntries(
  tt: TimetableData,
): TimetableSubstituteEntry[] {
  const norm = normalizeTimetable(tt);
  const fromView = norm.comciganView?.changes ?? [];
  if (fromView.length > 0) {
    return fromView.map(changeToEntry);
  }

  const out: TimetableSubstituteEntry[] = [];
  for (let d = 0; d < 5; d++) {
    for (let p = 0; p < norm.periodCount; p++) {
      if (!isSubstituteCell(norm, d, p)) continue;
      const text = norm.grid[d][p]?.trim();
      if (!text) continue;
      const legacy = legacyParseCell(text);
      const dateYmd = norm.comciganView?.weekDates[d] ?? "";
      const periodTime = norm.comciganView?.periodTimes[p] ?? "";
      out.push({
        dayIndex: d,
        dayLabel: TIMETABLE_DAY_LABELS[d] ?? "",
        period: p + 1,
        dateYmd,
        periodTime,
        whenLabel: formatSubstituteWhen(dateYmd, d, p + 1, periodTime),
        classCode: "",
        gradeClassLabel: "",
        subject: legacy.subject ?? text,
        originalSubject: legacy.originalSubject ?? "—",
        text,
      });
    }
  }
  return out;
}

export function timetableSubstituteFingerprint(tt: TimetableData): string {
  const norm = normalizeTimetable(tt);
  const changes = norm.comciganView?.changes;
  if (changes?.length) {
    return changes
      .map(
        (c) =>
          `${c.dateYmd}:${c.period}:${c.classCode}:${c.subject}:${c.originalSubject}`,
      )
      .join("|");
  }
  return listSubstituteEntries(norm)
    .map((e) => `${e.dayIndex}:${e.period}:${e.text}`)
    .join("|");
}

export function countSubstituteCells(tt: TimetableData): number {
  const norm = normalizeTimetable(tt);
  if (norm.comciganView?.changes.length) {
    return norm.comciganView.changes.length;
  }
  return listSubstituteEntries(norm).length;
}
