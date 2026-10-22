import { randomUUID } from "node:crypto";
import type { AppSettings, PersistedState } from "./store";
import { isWidgetId } from "./widget-ids";
import { normalizeSettings } from "./settings-normalize";

const TOP_KEYS: (keyof PersistedState)[] = [
  "todos",
  "memos",
  "ddays",
  "timetable",
  "layout",
  "settings",
];

const MAX_TODOS = 500;
const MAX_MEMOS = 20;
const MAX_DDAYS = 100;
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
  const patch = validatePatch(raw);
  if (
    !patch.todos ||
    !patch.memos ||
    !patch.ddays ||
    !patch.timetable ||
    !patch.layout ||
    !patch.settings
  ) {
    throw new Error("백업 파일에 필수 항목이 없습니다.");
  }
  return {
    todos: patch.todos,
    memos: patch.memos,
    ddays: patch.ddays,
    timetable: patch.timetable,
    layout: patch.layout,
    settings: patch.settings,
  };
}
