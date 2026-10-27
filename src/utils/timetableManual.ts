import type {
  ComciganLessonChip,
  TimetableData,
  TimetableManualScope,
  TimetableWeekManualSlot,
  TimetableWeeklyManualSlot,
} from "@/types/state";
import { ymdForLocalDate } from "@/utils/dueLabel";
import { emptyGrid, normalizeTimetable } from "@/utils/timetable";

/** 일반 고등학교 주간 교시 수 */
export const TIMETABLE_SCHOOL_PERIODS = 7;

export const SCHOOL_PERIOD_STARTS = [
  "09:10",
  "10:10",
  "11:10",
  "12:10",
  "14:00",
  "15:00",
  "16:00",
];

export function mondayYmdOfWeek(now = new Date()): string {
  const dow = (now.getDay() + 6) % 7;
  const mon = new Date(now);
  mon.setHours(0, 0, 0, 0);
  mon.setDate(mon.getDate() - dow);
  return ymdForLocalDate(
    mon.getFullYear(),
    mon.getMonth() + 1,
    mon.getDate(),
  );
}

function periodTimesFor(count: number): string[] {
  return Array.from(
    { length: count },
    (_, i) => SCHOOL_PERIOD_STARTS[i] ?? "",
  );
}

function cloneChips(
  chips: ComciganLessonChip[][][],
  periodCount: number,
): ComciganLessonChip[][][] {
  const out: ComciganLessonChip[][][] = [];
  for (let d = 0; d < 5; d++) {
    out[d] = [];
    for (let p = 0; p < periodCount; p++) {
      const row = chips[d]?.[p] ?? [];
      out[d][p] = row.map((c) => ({ ...c }));
    }
  }
  return out;
}

function comciganChipsOnly(slot: ComciganLessonChip[]): ComciganLessonChip[] {
  return slot.filter((c) => !c.manual);
}

function slotKey(dayIndex: number, periodIndex: number): string {
  return `${dayIndex}:${periodIndex}`;
}

function pruneWeekManual(
  slots: TimetableWeekManualSlot[] | undefined,
  weekStartYmd: string,
): TimetableWeekManualSlot[] {
  return (slots ?? []).filter((s) => s.weekStartYmd === weekStartYmd);
}

export type ManualSlotResolved = {
  label: string;
  scope: TimetableManualScope;
};

export function resolveManualSlotAt(
  tt: TimetableData,
  dayIndex: number,
  periodIndex: number,
  weekStartYmd = mondayYmdOfWeek(),
): ManualSlotResolved | null {
  const week = pruneWeekManual(tt.weekManual, weekStartYmd).find(
    (s) => s.dayIndex === dayIndex && s.periodIndex === periodIndex,
  );
  if (week) return { label: week.label, scope: "week" };

  const weekly = tt.weeklyManual?.find(
    (s) => s.dayIndex === dayIndex && s.periodIndex === periodIndex,
  );
  if (weekly) return { label: weekly.label, scope: "weekly" };

  return null;
}

export function upsertManualSlot(
  tt: TimetableData,
  dayIndex: number,
  periodIndex: number,
  label: string | null,
  scope: TimetableManualScope,
  weekStartYmd = mondayYmdOfWeek(),
): TimetableData {
  const trimmed = label?.trim() ?? "";
  const weeklyManual = (tt.weeklyManual ?? []).filter(
    (s) => !(s.dayIndex === dayIndex && s.periodIndex === periodIndex),
  );
  const weekManual = pruneWeekManual(tt.weekManual, weekStartYmd).filter(
    (s) => !(s.dayIndex === dayIndex && s.periodIndex === periodIndex),
  );

  if (trimmed.length === 0) {
    return { ...tt, weeklyManual, weekManual };
  }

  const entry = {
    dayIndex,
    periodIndex,
    label: trimmed.slice(0, 40),
  };

  if (scope === "weekly") {
    return {
      ...tt,
      weeklyManual: [...weeklyManual, entry],
      weekManual,
    };
  }

  return {
    ...tt,
    weeklyManual,
    weekManual: [...weekManual, { ...entry, weekStartYmd }],
  };
}

export function removeManualSlot(
  tt: TimetableData,
  dayIndex: number,
  periodIndex: number,
  weekStartYmd = mondayYmdOfWeek(),
): TimetableData {
  return upsertManualSlot(tt, dayIndex, periodIndex, null, "weekly", weekStartYmd);
}

/** @deprecated use upsertManualSlot */
export function upsertWeeklyManualSlot(
  tt: TimetableData,
  dayIndex: number,
  periodIndex: number,
  label: string | null,
): TimetableData {
  if (label === null || !label.trim()) {
    return removeManualSlot(tt, dayIndex, periodIndex);
  }
  return upsertManualSlot(tt, dayIndex, periodIndex, label, "weekly");
}

export function weeklyManualLabelAt(
  slots: TimetableWeeklyManualSlot[] | undefined,
  dayIndex: number,
  periodIndex: number,
): string | undefined {
  return slots?.find(
    (s) => s.dayIndex === dayIndex && s.periodIndex === periodIndex,
  )?.label;
}

function ensureSchoolPeriodCount(tt: TimetableData): TimetableData {
  const norm = normalizeTimetable(tt);
  const periodCount = Math.min(
    12,
    Math.max(TIMETABLE_SCHOOL_PERIODS, norm.periodCount),
  );
  if (periodCount === norm.periodCount && !norm.comciganView) {
    return {
      ...norm,
      weeklyManual: tt.weeklyManual ?? [],
      weekManual: tt.weekManual ?? [],
    };
  }

  const grid = emptyGrid(periodCount);
  for (let d = 0; d < 5; d++) {
    for (let p = 0; p < periodCount; p++) {
      grid[d][p] = norm.grid[d]?.[p] ?? "";
    }
  }

  let substituteFlags = norm.substituteFlags;
  if (substituteFlags?.length) {
    const nextFlags = Array.from({ length: 5 }, () =>
      Array.from({ length: periodCount }, () => false),
    );
    for (let d = 0; d < 5; d++) {
      for (let p = 0; p < periodCount; p++) {
        nextFlags[d][p] = Boolean(substituteFlags[d]?.[p]);
      }
    }
    substituteFlags = nextFlags;
  }

  let comciganView = norm.comciganView;
  if (comciganView) {
    const chips = cloneChips(comciganView.chips, periodCount);
    comciganView = {
      ...comciganView,
      periodTimes: periodTimesFor(periodCount),
      chips,
    };
  }

  return {
    ...norm,
    periodCount,
    grid,
    substituteFlags,
    comciganView,
    weeklyManual: tt.weeklyManual ?? [],
    weekManual: tt.weekManual ?? [],
  };
}

type ManualApplyEntry = {
  dayIndex: number;
  periodIndex: number;
  label: string;
  manualWeekly: boolean;
};

function collectManualEntries(
  tt: TimetableData,
  weekStartYmd: string,
): ManualApplyEntry[] {
  const byKey = new Map<string, ManualApplyEntry>();

  for (const slot of tt.weeklyManual ?? []) {
    byKey.set(slotKey(slot.dayIndex, slot.periodIndex), {
      dayIndex: slot.dayIndex,
      periodIndex: slot.periodIndex,
      label: slot.label,
      manualWeekly: true,
    });
  }

  for (const slot of pruneWeekManual(tt.weekManual, weekStartYmd)) {
    byKey.set(slotKey(slot.dayIndex, slot.periodIndex), {
      dayIndex: slot.dayIndex,
      periodIndex: slot.periodIndex,
      label: slot.label,
      manualWeekly: false,
    });
  }

  return [...byKey.values()];
}

function applyManualSlots(
  tt: TimetableData,
  weekStartYmd = mondayYmdOfWeek(),
): TimetableData {
  const manual = collectManualEntries(tt, weekStartYmd);
  if (!manual.length || !tt.comciganView) return tt;

  const chips = cloneChips(tt.comciganView.chips, tt.periodCount);
  const grid = tt.grid.map((row) => [...row]);

  for (const slot of manual) {
    const { dayIndex, periodIndex, label, manualWeekly } = slot;
    if (dayIndex < 0 || dayIndex > 4) continue;
    if (periodIndex < 0 || periodIndex >= tt.periodCount) continue;
    const existing = chips[dayIndex][periodIndex] ?? [];
    if (comciganChipsOnly(existing).length > 0) continue;

    chips[dayIndex][periodIndex] = [
      {
        classCode: "",
        subject: label,
        changed: false,
        manual: true,
        manualWeekly,
      },
    ];
    if (!grid[dayIndex][periodIndex]?.trim()) {
      grid[dayIndex][periodIndex] = label;
    }
  }

  return {
    ...tt,
    grid,
    comciganView: { ...tt.comciganView, chips },
  };
}

/** 화면·동기화 후 표시용 (7교시 + 수동 칸) */
export function buildTimetableForDisplay(tt: TimetableData): TimetableData {
  const weekStart = mondayYmdOfWeek();
  const pruned: TimetableData = {
    ...tt,
    weekManual: pruneWeekManual(tt.weekManual, weekStart),
  };
  return applyManualSlots(ensureSchoolPeriodCount(pruned), weekStart);
}

export function canEditManualSlot(chips: ComciganLessonChip[]): boolean {
  return comciganChipsOnly(chips).length === 0;
}
