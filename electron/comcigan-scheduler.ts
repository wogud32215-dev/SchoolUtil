import { broadcastStoreState } from "./broadcast-state";
import { syncClassTimetable, syncTeacherTimetable } from "./comcigan/sync";
import type { AppSettings, ComciganSyncedTimetable } from "./store";
import { getState, patchState } from "./store";

const SYNC_HOURS = [8, 13];
const INTERVAL_MS = 30 * 60 * 1000;
const SCHOOL_OPEN = { hour: 7, minute: 30 };
const SCHOOL_CLOSE = { hour: 18, minute: 0 };

let timers: ReturnType<typeof setTimeout>[] = [];
let running = false;

function isWeekday(d: Date): boolean {
  const w = d.getDay();
  return w >= 1 && w <= 5;
}

function atLocalTime(d: Date, hour: number, minute: number): Date {
  const x = new Date(d);
  x.setHours(hour, minute, 0, 0);
  return x;
}

function inSchoolSyncWindow(now: Date): boolean {
  if (!isWeekday(now)) return false;
  const open = atLocalTime(now, SCHOOL_OPEN.hour, SCHOOL_OPEN.minute);
  const close = atLocalTime(now, SCHOOL_CLOSE.hour, SCHOOL_CLOSE.minute);
  return now >= open && now < close;
}

/** 다음 평일 07:30 (현재가 창 안이면 그대로 반환하지 않음) */
function nextSchoolOpen(from: Date): Date {
  const probe = new Date(from);
  for (let offset = 0; offset < 10; offset++) {
    if (offset > 0) {
      probe.setDate(probe.getDate() + 1);
    }
    if (!isWeekday(probe)) continue;
    const open = atLocalTime(probe, SCHOOL_OPEN.hour, SCHOOL_OPEN.minute);
    if (from < open) return open;
    const close = atLocalTime(probe, SCHOOL_CLOSE.hour, SCHOOL_CLOSE.minute);
    if (from < close) {
      return open;
    }
  }
  const fallback = new Date(from);
  fallback.setDate(fallback.getDate() + 1);
  return atLocalTime(fallback, SCHOOL_OPEN.hour, SCHOOL_OPEN.minute);
}

function scheduleIntervalSyncLoop(): void {
  const now = new Date();
  const delay = inSchoolSyncWindow(now)
    ? INTERVAL_MS
    : Math.max(1000, nextSchoolOpen(now).getTime() - now.getTime());
  const timer = setTimeout(() => {
    const tick = new Date();
    if (inSchoolSyncWindow(tick)) {
      void runTimetableAutoSync("schedule").finally(() =>
        scheduleIntervalSyncLoop(),
      );
    } else {
      scheduleIntervalSyncLoop();
    }
  }, delay);
  timers.push(timer);
}

function localIsoNow(): string {
  return new Date().toISOString();
}

export async function runTimetableAutoSync(
  reason: "startup" | "schedule" | "manual",
): Promise<{ ok: boolean; error?: string }> {
  if (running) return { ok: false, error: "이미 갱신 중입니다." };
  const state = getState();
  const settings = state.settings;
  if (!settings.timetableAutoSync) {
    return { ok: false, error: "자동 갱신이 꺼져 있습니다." };
  }
  const code = Number(settings.comciganSchoolCode);
  const teacher = settings.comciganTeacherName.trim();
  if (!code || !teacher) {
    return { ok: false, error: "학교·교사를 설정해 주세요." };
  }

  running = true;
  try {
    const result = await syncTeacherTimetable(
      code,
      teacher,
      settings.comciganTeacherIndex,
      settings.timetableFetchMode,
      settings.comciganSchoolName || settings.schoolName,
      settings.timetableProxyBaseUrl,
    );
    if (!result.ok) {
      patchState({
        settings: {
          ...getState().settings,
          timetableLastSyncError: result.error,
          timetableLastSyncReason: reason,
        },
      });
      return { ok: false, error: result.error };
    }

    let classError = "";
    let classSnapshot: ComciganSyncedTimetable | undefined;
    const prevTt = getState().timetable;
    if (
      settings.comciganClassSyncEnabled &&
      settings.comciganClassCode.trim()
    ) {
      const classResult = await syncClassTimetable(
        code,
        settings.comciganClassCode,
        settings.comciganClassLabelMode,
        settings.timetableFetchMode,
        settings.comciganSchoolName || settings.schoolName,
        settings.timetableProxyBaseUrl,
      );
      if (!classResult.ok) {
        classError = classResult.error;
        classSnapshot = prevTt.comciganClass;
      } else {
        classSnapshot = classResult.timetable as ComciganSyncedTimetable;
      }
    } else {
      classSnapshot = prevTt.comciganClass;
    }

    patchState({
      timetable: {
        ...result.timetable,
        weeklyManual: prevTt.weeklyManual,
        weekManual: prevTt.weekManual,
        comciganClass: classSnapshot,
      },
      settings: {
        ...getState().settings,
        timetableLastSyncAt: localIsoNow(),
        timetableLastSyncError: classError,
        timetableLastSyncVia: result.via,
        timetableLastSyncReason: reason,
      },
    });
    broadcastStoreState();
    return { ok: true };
  } finally {
    running = false;
  }
}

function msUntilNextSlot(): number {
  const now = new Date();
  const candidates: number[] = [];
  for (const hour of SYNC_HOURS) {
    const slot = new Date(now);
    slot.setHours(hour, 0, 0, 0);
    if (slot.getTime() > now.getTime()) {
      candidates.push(slot.getTime() - now.getTime());
    }
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(SYNC_HOURS[0], 0, 0, 0);
  candidates.push(tomorrow.getTime() - now.getTime());
  return Math.min(...candidates);
}

function scheduleNext(): void {
  const delay = msUntilNextSlot();
  const timer = setTimeout(() => {
    void runTimetableAutoSync("schedule").finally(() => scheduleNext());
  }, delay);
  timers.push(timer);
}

export function startTimetableAutoSyncScheduler(): void {
  stopTimetableAutoSyncScheduler();
  scheduleNext();
  scheduleIntervalSyncLoop();
  void runTimetableAutoSync("startup");
}

export function stopTimetableAutoSyncScheduler(): void {
  for (const t of timers) clearTimeout(t);
  timers = [];
}

export function shouldSchedulerRun(settings: AppSettings): boolean {
  return (
    settings.timetableAutoSync &&
    Boolean(settings.comciganSchoolCode.trim()) &&
    Boolean(settings.comciganTeacherName.trim())
  );
}
