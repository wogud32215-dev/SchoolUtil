import { broadcastStoreState } from "./broadcast-state";
import { syncTeacherTimetable } from "./comcigan/sync";
import type { AppSettings } from "./store";
import { getState, patchState } from "./store";

const SYNC_HOURS = [8, 13];

let timers: ReturnType<typeof setTimeout>[] = [];
let running = false;

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

    const prevTt = getState().timetable;
    patchState({
      timetable: {
        ...result.timetable,
        weeklyManual: prevTt.weeklyManual,
        weekManual: prevTt.weekManual,
      },
      settings: {
        ...getState().settings,
        timetableLastSyncAt: localIsoNow(),
        timetableLastSyncError: "",
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
