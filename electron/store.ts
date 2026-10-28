import Store from "electron-store";
import { app } from "electron";
import path from "node:path";
import { writePrePatchBackup } from "./backup";
import { defaultAppSettings, normalizeSettings } from "./settings-normalize";
import {
  getNeisApiKey,
  mergePortalSecretsForRuntime,
  migratePlaintextNeisKey,
  migratePlaintextPortalSecrets,
  persistPortalSecretsFromSettings,
  setNeisApiKey,
  stripNeisKeyForDisk,
  stripPortalSecretsForDisk,
} from "./secrets";
import type { PortalId } from "./portal-ids";
import { validatePatch } from "./validate-patch";

export type PortalRunRecord = {
  at: string;
  ok: boolean;
  summary: string;
};

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

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  important?: boolean;
  done?: boolean;
  createdAt: string;
};

export type ComciganLessonChip = {
  classCode: string;
  subject: string;
  changed: boolean;
  originalSubject?: string;
  vacated?: boolean;
  manual?: boolean;
  manualWeekly?: boolean;
};

export type TimetableWeeklyManualSlot = {
  dayIndex: number;
  periodIndex: number;
  label: string;
};

export type TimetableWeekManualSlot = TimetableWeeklyManualSlot & {
  weekStartYmd: string;
};

export type TimetableSubstituteChange = {
  dayIndex: number;
  period: number;
  dateYmd: string;
  periodTime: string;
  classCode: string;
  subject: string;
  originalSubject: string;
};

export type ComciganTimetableView = {
  weekDates: string[];
  periodTimes: string[];
  chips: ComciganLessonChip[][][];
  changes: TimetableSubstituteChange[];
};

export type TimetableData = {
  title: string;
  periodCount: number;
  grid: string[][];
  /** 컴시간 교체 반영 셀 (grid와 동일 크기, 자동 갱신 시에만 채워짐) */
  substituteFlags?: boolean[][];
  comciganView?: ComciganTimetableView;
  weeklyManual?: TimetableWeeklyManualSlot[];
  weekManual?: TimetableWeekManualSlot[];
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

export type AppTheme =
  | "sky"
  | "paper"
  | "mint"
  | "sand"
  | "slate"
  | "pink"
  | "coral"
  | "blue"
  | "green"
  | "dark";

export type FontFamilySetting = "pretendard" | "system";

export type FontWeightLevel =
  | "light"
  | "normal"
  | "medium"
  | "strong"
  | "heavy";

export type UiDensity = "cozy" | "normal" | "compact";

export type CardTexture =
  | "glass"
  | "paper"
  | "memo"
  | "whiteboard"
  | "chalkboard"
  | "terminal";

export type AccentCard = "none" | "clock" | "weather";

export type BackgroundFill = "transparent" | "panel" | "full";

export type LayoutPreset =
  | "bento"
  | "classic"
  | "calendar"
  | "timetable"
  | "compact"
  | "wide";

export type TodayGlanceFontSize = "normal" | "large" | "xlarge";

export type TodayGlanceSections = {
  todos: boolean;
  timetable: boolean;
  meal: boolean;
  calendar: boolean;
  dday: boolean;
  memo: boolean;
  weather: boolean;
};

export type ComciganClassLabelMode = "general" | "jeil";

export type AppSettings = {
  theme: AppTheme;
  fontFamily: FontFamilySetting;
  fontWeightLevel: FontWeightLevel;
  uiDensity: UiDensity;
  cardTexture: CardTexture;
  accentCard: AccentCard;
  backgroundFill: BackgroundFill;
  cardOpacity: number;
  designPeek: boolean;
  layoutPreset: LayoutPreset;
  openAtLogin: boolean;
  neisApiKey: string;
  neisOfficeCode: string;
  neisSchoolCode: string;
  schoolName: string;
  weatherLat: number;
  weatherLon: number;
  weatherLabel: string;
  displayMode: "widget" | "window";
  /** 위젯 창을 올릴 모니터. number = Electron display id */
  widgetMonitor?: "primary" | "all" | number;
  widgetLockToScreen: boolean;
  settingsDockX: number;
  settingsDockY: number;
  globalShortcuts: boolean;
  disabledWidgets: string[];
  todayGlanceEnabled: boolean;
  todayGlanceLastShownDate: string;
  todayGlanceFontSize: TodayGlanceFontSize;
  todayGlanceSections: TodayGlanceSections;
  onboardingDone: boolean;
  portalBrowser: "default" | "chrome" | "edge" | "whale";
  portalEducationOffice: string;
  portalLoginMode: "url_only" | "automation";
  portalAutoLogin: boolean;
  portalAutoLoginDelay: "0" | "20" | "45" | "manual";
  portalAutomationTarget: PortalId;
  portalSessionExtend: boolean;
  portalSessionExtendMinutes: 30 | 40 | 50;
  portalOsCertInput: boolean;
  portals: {
    nice: { enabled: boolean; url: string };
    edufine: { enabled: boolean; url: string };
    goePortal: { enabled: boolean; url: string };
  };
  /** 인증서 목록에 보이는 이름(인증서 아이디) */
  portalNiceUser: string;
  /** 인증서 비밀번호 */
  portalNicePassword: string;
  portalEdufineUser: string;
  portalEdufinePassword: string;
  portalGoeUser: string;
  portalGoePassword: string;
  portalLastNice?: PortalRunRecord;
  portalLastEdufine?: PortalRunRecord;
  portalLastGoe?: PortalRunRecord;
  brityMessengerEnabled: boolean;
  brityMessengerExePath: string;
  /** 인증서 목록에 보이는 이름 (자동 선택은 1차 미지원, 로그 안내용) */
  brityMessengerCertLabel: string;
  /** true면 경기 업무포털(goe)에 저장한 인증서 비밀번호·표시 이름을 씁니다 */
  brityMessengerShareGoeCredentials: boolean;
  brityMessengerPassword: string;
  brityMessengerLastRun?: PortalRunRecord;
  /** 컴시간 교사 시간표 자동 갱신 (08:00·13:00·앱 시작) */
  timetableAutoSync: boolean;
  timetableFetchMode: "direct" | "s2h9";
  /** s2h9 프록시 기본: https://timetable.s2h9.dev */
  timetableProxyBaseUrl: string;
  comciganSchoolCode: string;
  comciganSchoolName: string;
  comciganTeacherName: string;
  comciganClassLabelMode: ComciganClassLabelMode;
  timetableLastSyncAt: string;
  timetableLastSyncError: string;
  timetableLastSyncVia: "" | "direct" | "s2h9";
  timetableLastSyncReason: "" | "startup" | "schedule" | "manual";
  /** 마지막으로 교체 알림을 본 시간표 교체 묶음( fingerprint ) */
  timetableSubstituteNotifiedKey: string;
};

const PORTAL_LAST_RUN_KEY: Record<
  PortalId,
  "portalLastNice" | "portalLastEdufine" | "portalLastGoe"
> = {
  nice: "portalLastNice",
  edufine: "portalLastEdufine",
  goePortal: "portalLastGoe",
};

export function recordBrityMessengerRun(ok: boolean, summary: string): void {
  const settings = getState().settings;
  const record: PortalRunRecord = {
    at: new Date().toISOString(),
    ok,
    summary: summary.slice(0, 400),
  };
  patchState({
    settings: {
      ...settings,
      brityMessengerLastRun: record,
    },
  });
}

export function recordPortalRun(
  portalId: PortalId,
  ok: boolean,
  summary: string,
): void {
  const settings = getState().settings;
  const record: PortalRunRecord = {
    at: new Date().toISOString(),
    ok,
    summary: summary.slice(0, 400),
  };
  patchState({
    settings: {
      ...settings,
      [PORTAL_LAST_RUN_KEY[portalId]]: record,
    },
  });
}

export type PersistedState = {
  todos: TodoItem[];
  memos: MemoNote[];
  ddays: DDayItem[];
  calendarEvents: CalendarEvent[];
  timetable: TimetableData;
  layout: Record<string, { x: number; y: number; w: number; h: number }>;
  settings: AppSettings;
};

const defaults: PersistedState = {
  todos: [],
  memos: [],
  ddays: [],
  calendarEvents: [],
  timetable: defaultTimetable(),
  layout: {},
  settings: defaultAppSettings(),
};

let appStore: Store<PersistedState> | null = null;

function settingsForRuntime(raw: AppSettings | undefined): AppSettings {
  const norm = normalizeSettings(raw);
  let merged = norm;
  const key = getNeisApiKey();
  if (key) merged = { ...merged, neisApiKey: key };
  return mergePortalSecretsForRuntime(merged);
}

function persistSettings(settings: AppSettings): AppSettings {
  if (settings.neisApiKey.trim()) {
    setNeisApiKey(settings.neisApiKey);
  } else {
    setNeisApiKey("");
  }
  persistPortalSecretsFromSettings(settings);
  return stripPortalSecretsForDisk(stripNeisKeyForDisk(settings));
}

export function initPersistence(): void {
  if (appStore) return;
  appStore = new Store<PersistedState>({
    name: "schoolutil-data",
    cwd: app.getPath("userData"),
    defaults,
  });

  const raw = appStore.get("settings");
  const norm = normalizeSettings(raw);
  const plain = String(raw?.neisApiKey ?? "").trim();
  if (plain) {
    migratePlaintextNeisKey(plain);
  }
  migratePlaintextPortalSecrets(norm);
  const stripped = stripPortalSecretsForDisk(
    stripNeisKeyForDisk(norm),
  );
  const hadPlainOnDisk =
    plain ||
    String(raw?.portalNiceUser ?? "").trim() ||
    String(raw?.portalNicePassword ?? "").trim() ||
    String(raw?.portalEdufineUser ?? "").trim() ||
    String(raw?.portalEdufinePassword ?? "").trim() ||
    String(raw?.portalGoeUser ?? "").trim() ||
    String(raw?.portalGoePassword ?? "").trim();
  if (hadPlainOnDisk) {
    appStore.set("settings", stripped);
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
  const s = store();
  return {
    todos: s.get("todos"),
    memos: s.get("memos"),
    ddays: s.get("ddays"),
    calendarEvents: s.get("calendarEvents") ?? [],
    timetable: s.get("timetable") ?? defaultTimetable(),
    layout: s.get("layout"),
    settings: settingsForRuntime(s.get("settings")),
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
  s.set("calendarEvents", toSave.calendarEvents ?? []);
  s.set("timetable", toSave.timetable);
  s.set("layout", toSave.layout);
  s.set("settings", toSave.settings);
  return getState();
}
