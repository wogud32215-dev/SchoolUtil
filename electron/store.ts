import Store from "electron-store";
import { app } from "electron";
import path from "node:path";
import { writePrePatchBackup } from "./backup";
import { defaultAppSettings, normalizeSettings } from "./settings-normalize";
import {
  getNeisApiKey,
  migratePlaintextNeisKey,
  setNeisApiKey,
  stripNeisKeyForDisk,
} from "./secrets";
import { validatePatch } from "./validate-patch";

export type TodoItem = {
  id: string;
  text: string;
  done: boolean;
  category?: string;
  dueDate?: string;
  createdAt: string;
};

export type MemoNote = {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  updatedAt: string;
};

export type DDayItem = {
  id: string;
  title: string;
  date: string;
};

export type TimetableData = {
  title: string;
  periodCount: number;
  grid: string[][];
};

function emptyTimetableGrid(periodCount: number): string[][] {
  return Array.from({ length: 5 }, () =>
    Array.from({ length: periodCount }, () => ""),
  );
}

export function defaultTimetable(): TimetableData {
  return {
    title: "내 시간표",
    periodCount: 7,
    grid: emptyTimetableGrid(7),
  };
}

export type AppSettings = {
  theme: "blue" | "green" | "dark";
  openAtLogin: boolean;
  neisApiKey: string;
  neisOfficeCode: string;
  neisSchoolCode: string;
  schoolName: string;
  weatherLat: number;
  weatherLon: number;
  weatherLabel: string;
  displayMode: "widget" | "window";
  globalShortcuts: boolean;
  disabledWidgets: string[];
  onboardingDone: boolean;
};

export type PersistedState = {
  todos: TodoItem[];
  memos: MemoNote[];
  ddays: DDayItem[];
  timetable: TimetableData;
  layout: Record<string, { x: number; y: number; w: number; h: number }>;
  settings: AppSettings;
};

const defaults: PersistedState = {
  todos: [],
  memos: [],
  ddays: [],
  timetable: defaultTimetable(),
  layout: {},
  settings: defaultAppSettings(),
};

let appStore: Store<PersistedState> | null = null;

function settingsForRuntime(raw: AppSettings | undefined): AppSettings {
  const norm = normalizeSettings(raw);
  const key = getNeisApiKey();
  if (key) return { ...norm, neisApiKey: key };
  return norm;
}

function persistSettings(settings: AppSettings): AppSettings {
  if (settings.neisApiKey.trim()) {
    setNeisApiKey(settings.neisApiKey);
  } else if (!getNeisApiKey()) {
    setNeisApiKey("");
  }
  return stripNeisKeyForDisk(settings);
}

export function initPersistence(): void {
  if (appStore) return;
  appStore = new Store<PersistedState>({
    name: "schoolutil-data",
    cwd: app.getPath("userData"),
    defaults,
  });

  const raw = appStore.get("settings");
  const plain = String(raw?.neisApiKey ?? "").trim();
  if (plain) {
    migratePlaintextNeisKey(plain);
    if (getNeisApiKey()) {
      appStore.set("settings", stripNeisKeyForDisk(normalizeSettings(raw)));
    }
  }
}

function store(): Store<PersistedState> {
  if (!appStore) initPersistence();
  return appStore!;
}

export function getStorePath(): string {
  return path.join(app.getPath("userData"), "schoolutil-data.json");
}

export function getState(): PersistedState {
  return {
    todos: store().get("todos"),
    memos: store().get("memos"),
    ddays: store().get("ddays"),
    timetable: store().get("timetable") ?? defaultTimetable(),
    layout: store().get("layout"),
    settings: settingsForRuntime(store().get("settings")),
  };
}

export function patchState(partial: Partial<PersistedState>): PersistedState {
  writePrePatchBackup();
  const validated = validatePatch(partial);
  const s = store();

  if (validated.settings) {
    validated.settings = persistSettings(validated.settings);
  }

  for (const key of Object.keys(validated) as (keyof PersistedState)[]) {
    if (validated[key] !== undefined) {
      s.set(key, validated[key] as PersistedState[typeof key]);
    }
  }
  return getState();
}

export function replaceState(next: PersistedState): PersistedState {
  writePrePatchBackup();
  const toSave: PersistedState = {
    ...next,
    settings: persistSettings(next.settings),
  };
  const s = store();
  s.set("todos", toSave.todos);
  s.set("memos", toSave.memos);
  s.set("ddays", toSave.ddays);
  s.set("timetable", toSave.timetable);
  s.set("layout", toSave.layout);
  s.set("settings", toSave.settings);
  return getState();
}
