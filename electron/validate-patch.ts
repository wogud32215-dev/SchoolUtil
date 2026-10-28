import { randomUUID } from "node:crypto";
import type { AppSettings, PersistedState, TimetableData } from "./store";
import { isWidgetId } from "./widget-ids";
import { normalizeSettings } from "./settings-normalize";

function defaultTimetableForImport(): TimetableData {
  const periodCount = 7;
  return {
    title: "내 시간표",
    periodCount,
    grid: Array.from({ length: 5 }, () =>
      Array.from({ length: periodCount }, () => ""),
    ),
  };
}

/** electron-store 구버전 JSON·일부 필드만 있는 백업을 현재 스키마로 맞춘다. */
function mergeLegacyStateInput(raw: unknown): Record<string, unknown> {
  const input =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    todos: input.todos ?? [],
    memos: input.memos ?? [],
    ddays: input.ddays ?? [],
    calendarEvents: input.calendarEvents ?? [],
    timetable: input.timetable ?? defaultTimetableForImport(),
    layout: input.layout ?? {},
    settings: input.settings,
  };
}

const TOP_KEYS: (keyof PersistedState)[] = [
  "todos",
  "memos",
  "ddays",
  "calendarEvents",
  "timetable",
  "layout",
  "settings",
];

const MAX_TODOS = 500;
const MAX_MEMOS = 20;
const MAX_DDAYS = 100;
const MAX_CALENDAR_EVENTS = 500;
const MAX_TEXT = 4000;

function clampString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.slice(0, max);
}

function sanitizeSettings(raw: unknown): AppSettings | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const s = raw as AppSettings;
  return normalizeSettings({
    ...s,
    neisApiKey: clampString(s.neisApiKey, 200),
    neisOfficeCode: clampString(s.neisOfficeCode, 20),
    neisSchoolCode: clampString(s.neisSchoolCode, 20),
    schoolName: clampString(s.schoolName, 120),
    onboardingDone: Boolean(s.onboardingDone),
    weatherLabel: clampString(s.weatherLabel, 80),
    disabledWidgets: Array.isArray(s.disabledWidgets)
      ? s.disabledWidgets.filter(
          (id) => typeof id === "string" && isWidgetId(id),
        )
      : [],
    portalNiceUser: clampString(s.portalNiceUser, 120),
    portalNicePassword: clampString(s.portalNicePassword, 200),
    portalEdufineUser: clampString(s.portalEdufineUser, 120),
    portalEdufinePassword: clampString(s.portalEdufinePassword, 200),
    portalGoeUser: clampString(s.portalGoeUser, 120),
    portalGoePassword: clampString(s.portalGoePassword, 200),
    portals: {
      nice: {
        enabled: s.portals?.nice?.enabled !== false,
        url: clampString(s.portals?.nice?.url, 500),
      },
      edufine: {
        enabled: s.portals?.edufine?.enabled !== false,
        url: clampString(s.portals?.edufine?.url, 500),
      },
      goePortal: {
        enabled: s.portals?.goePortal?.enabled !== false,
        url: clampString(s.portals?.goePortal?.url, 500),
      },
    },
    portalBrowser: s.portalBrowser,
    portalEducationOffice: clampString(s.portalEducationOffice, 40),
    portalLoginMode:
      s.portalLoginMode === "automation" ? "automation" : "url_only",
    portalAutoLogin: Boolean(s.portalAutoLogin),
    portalAutoLoginDelay: s.portalAutoLoginDelay,
    portalAutomationTarget: s.portalAutomationTarget,
    portalSessionExtend: Boolean(s.portalSessionExtend),
    portalSessionExtendMinutes: s.portalSessionExtendMinutes,
    portalOsCertInput: Boolean(s.portalOsCertInput),
    brityMessengerEnabled: Boolean(s.brityMessengerEnabled),
    brityMessengerExePath: clampString(s.brityMessengerExePath, 500),
    brityMessengerCertLabel: clampString(s.brityMessengerCertLabel, 120),
    brityMessengerShareGoeCredentials:
      s.brityMessengerShareGoeCredentials !== false,
    brityMessengerPassword: clampString(s.brityMessengerPassword, 200),
  });
}

export function validatePatch(partial: unknown): Partial<PersistedState> {
  if (!partial || typeof partial !== "object") {
    throw new Error("저장 데이터 형식이 올바르지 않습니다.");
  }
  const input = partial as Record<string, unknown>;
  const out: Partial<PersistedState> = {};

  for (const key of TOP_KEYS) {
    if (!(key in input)) continue;
    const value = input[key];
    switch (key) {
      case "todos":
        if (!Array.isArray(value)) break;
        out.todos = value.slice(0, MAX_TODOS).map((t) => {
          const row = t as Record<string, unknown>;
          return {
            id: clampString(row.id, 64) || randomUUID(),
            text: clampString(row.text, MAX_TEXT),
            done: Boolean(row.done),
            category: clampString(row.category, 40) || undefined,
            dueDate: clampString(row.dueDate, 32) || undefined,
            createdAt: clampString(row.createdAt, 40) || new Date().toISOString(),
          };
        });
        break;
      case "memos":
        if (!Array.isArray(value)) break;
        out.memos = value.slice(0, MAX_MEMOS).map((m) => {
          const row = m as Record<string, unknown>;
          return {
            id: clampString(row.id, 64) || randomUUID(),
            text: clampString(row.text, MAX_TEXT),
            color: clampString(row.color, 32) || "#fef08a",
            x: Number(row.x) || 0,
            y: Number(row.y) || 0,
            updatedAt:
              clampString(row.updatedAt, 40) || new Date().toISOString(),
          };
        });
        break;
      case "ddays":
        if (!Array.isArray(value)) break;
        out.ddays = value.slice(0, MAX_DDAYS).map((d) => {
          const row = d as Record<string, unknown>;
          return {
            id: clampString(row.id, 64) || randomUUID(),
            title: clampString(row.title, 200),
            date: clampString(row.date, 32),
          };
        });
        break;
      case "calendarEvents":
        if (!Array.isArray(value)) break;
        out.calendarEvents = value.slice(0, MAX_CALENDAR_EVENTS).map((ev) => {
          const row = ev as Record<string, unknown>;
          const time = clampString(row.time, 8);
          return {
            id: clampString(row.id, 64) || randomUUID(),
            title: clampString(row.title, 200),
            date: clampString(row.date, 32),
            time: time || undefined,
            important: Boolean(row.important),
            done: Boolean(row.done),
            createdAt:
              clampString(row.createdAt, 40) || new Date().toISOString(),
          };
        });
        break;
      case "timetable":
        if (!value || typeof value !== "object") break;
        out.timetable = value as PersistedState["timetable"];
        break;
      case "layout":
        if (!value || typeof value !== "object") break;
        out.layout = value as PersistedState["layout"];
        break;
      case "settings": {
        const settings = sanitizeSettings(value);
        if (settings) out.settings = settings;
        break;
      }
      default:
        break;
    }
  }

  return out;
}

export function validateFullState(raw: unknown): PersistedState {
  const patch = validatePatch(mergeLegacyStateInput(raw));
  const settings =
    patch.settings ??
    normalizeSettings(
      (raw && typeof raw === "object"
        ? (raw as Record<string, unknown>).settings
        : undefined) as AppSettings | undefined,
    );
  if (
    !patch.todos ||
    !patch.memos ||
    !patch.ddays ||
    !patch.timetable ||
    !patch.layout
  ) {
    throw new Error("백업 파일에 필수 항목이 없습니다.");
  }
  return {
    todos: patch.todos,
    memos: patch.memos,
    ddays: patch.ddays,
    calendarEvents: patch.calendarEvents ?? [],
    timetable: patch.timetable,
    layout: patch.layout,
    settings,
  };
}
