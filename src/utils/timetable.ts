import type { TimetableData } from "@/types/state";

export function emptyGrid(periodCount: number): string[][] {
  return Array.from({ length: 5 }, () =>
    Array.from({ length: periodCount }, () => ""),
  );
}

export function defaultTimetable(): TimetableData {
  return { title: "내 시간표", periodCount: 7, grid: emptyGrid(7) };
}

export function normalizeTimetable(raw: TimetableData | undefined): TimetableData {
  const base = raw ?? defaultTimetable();
  const periodCount = Math.min(12, Math.max(1, base.periodCount || 7));
  const grid = emptyGrid(periodCount);
  for (let d = 0; d < 5; d++) {
    for (let p = 0; p < periodCount; p++) {
      grid[d][p] = base.grid?.[d]?.[p] ?? "";
    }
  }
  let substituteFlags: boolean[][] | undefined;
  if (base.substituteFlags?.length) {
    substituteFlags = Array.from({ length: 5 }, () =>
      Array.from({ length: periodCount }, () => false),
    );
    for (let d = 0; d < 5; d++) {
      for (let p = 0; p < periodCount; p++) {
        substituteFlags[d][p] = Boolean(base.substituteFlags?.[d]?.[p]);
      }
    }
  }
  const comciganView = base.comciganView;
  const weeklyManual = base.weeklyManual?.map((s) => ({
    dayIndex: s.dayIndex,
    periodIndex: s.periodIndex,
    label: String(s.label ?? "").slice(0, 40),
  }));
  const weekManual = base.weekManual?.map((s) => ({
    weekStartYmd: String(s.weekStartYmd ?? "").slice(0, 10),
    dayIndex: s.dayIndex,
    periodIndex: s.periodIndex,
    label: String(s.label ?? "").slice(0, 40),
  }));
  return {
    title: base.title || "내 시간표",
    periodCount,
    grid,
    substituteFlags,
    comciganView,
    weeklyManual,
    weekManual,
  };
}
