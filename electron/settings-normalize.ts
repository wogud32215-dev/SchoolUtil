import {
  clampCardOpacity,
  normalizeBackgroundFill,
  themeDefaultCardOpacity,
} from "../src/utils/designAppearance";
import { isEducationOfficeId } from "./portal-offices";
import { DEFAULT_PORTAL_URLS, isAllowedPortalUrl, isPortalId } from "./portal-ids";
import type { AppSettings } from "./store";
import { isWidgetId } from "./widget-ids";
import {
  clampDockPercent,
  DEFAULT_SETTINGS_DOCK_X,
  DEFAULT_SETTINGS_DOCK_Y,
} from "../src/utils/settingsDockPosition";

const FONT_WEIGHT_LEVELS = [
  "light",
  "normal",
  "medium",
  "strong",
  "heavy",
] as const;
import type { TodayGlanceSections } from "./store";

function defaultTodayGlanceSections(): TodayGlanceSections {
  return {
    todos: true,
    timetable: true,
    meal: true,
    calendar: true,
    dday: true,
    memo: false,
    weather: false,
  };
}

function normalizeTodayGlanceSections(
  raw: TodayGlanceSections | undefined,
): TodayGlanceSections {
  const base = defaultTodayGlanceSections();
  if (!raw || typeof raw !== "object") return base;
  return {
    todos: raw.todos !== false,
    timetable: raw.timetable !== false,
    meal: raw.meal !== false,
    calendar: raw.calendar !== false,
    dday: raw.dday !== false,
    memo: Boolean(raw.memo),
    weather: Boolean(raw.weather),
  };
}

const APP_THEMES: AppSettings["theme"][] = [
  "sky",
  "paper",
  "mint",
  "sand",
  "slate",
  "pink",
  "coral",
  "blue",
  "green",
  "dark",
];

const CARD_TEXTURES: AppSettings["cardTexture"][] = [
  "glass",
  "paper",
  "memo",
  "whiteboard",
  "chalkboard",
  "terminal",
];

const LAYOUT_PRESETS: AppSettings["layoutPreset"][] = [
  "recommended",
  "bento",
  "classic",
  "calendar",
  "timetable",
  "compact",
  "wide",
];

export const defaultAppSettings = (): AppSettings => ({
  theme: "sky",
  fontFamily: "pretendard",
  fontWeightLevel: "medium",
  uiDensity: "cozy",
  cardTexture: "glass",
  accentCard: "none",
  backgroundFill: "transparent",
  cardOpacity: themeDefaultCardOpacity("sky"),
  designPeek: false,
  layoutPreset: "bento",
  openAtLogin: false,
  neisApiKey: "",
  neisOfficeCode: "",
  neisSchoolCode: "",
  schoolName: "",
  weatherLat: 37.5665,
  weatherLon: 126.978,
  weatherLabel: "서울",
  displayMode: "widget",
  widgetMonitor: "primary",
  widgetLockToScreen: true,
  settingsDockX: DEFAULT_SETTINGS_DOCK_X,
  settingsDockY: DEFAULT_SETTINGS_DOCK_Y,
  globalShortcuts: true,
  disabledWidgets: [],
  todayGlanceEnabled: true,
  todayGlanceLastShownDate: "",
  todayGlanceFontSize: "large",
  todayGlanceSections: defaultTodayGlanceSections(),
  onboardingDone: false,
  portalBrowser: "default",
  portalEducationOffice: "custom",
  portalLoginMode: "url_only",
  portalAutoLogin: false,
  portalAutoLoginDelay: "20",
  portalAutomationTarget: "nice",
  portalSessionExtend: false,
  portalSessionExtendMinutes: 50,
  portalOsCertInput: false,
  portals: {
    nice: { enabled: true, url: DEFAULT_PORTAL_URLS.nice },
    edufine: { enabled: true, url: DEFAULT_PORTAL_URLS.edufine },
    goePortal: { enabled: true, url: DEFAULT_PORTAL_URLS.goePortal },
  },
  portalNiceUser: "",
  portalNicePassword: "",
  portalEdufineUser: "",
  portalEdufinePassword: "",
  portalGoeUser: "",
  portalGoePassword: "",
  brityMessengerEnabled: false,
  brityMessengerExePath: "",
  brityMessengerCertLabel: "",
  brityMessengerShareGoeCredentials: true,
  brityMessengerPassword: "",
  timetableAutoSync: false,
  timetableFetchMode: "direct",
  timetableProxyBaseUrl: "https://timetable.s2h9.dev",
  comciganSchoolCode: "",
  comciganSchoolName: "",
  comciganTeacherName: "",
  comciganTeacherIndex: -1,
  comciganClassLabelMode: "general",
  timetableLastSyncAt: "",
  timetableLastSyncError: "",
  timetableLastSyncVia: "",
  timetableLastSyncReason: "",
  timetableSubstituteNotifiedKey: "",
});

function normalizeComciganTeacherIndex(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) return -1;
  return Math.min(n, 9999);
}

export function normalizeSettings(raw: AppSettings | undefined): AppSettings {
  const base = defaultAppSettings();
  if (!raw || typeof raw !== "object") return base;

  const theme = APP_THEMES.includes(raw.theme as AppSettings["theme"])
    ? (raw.theme as AppSettings["theme"])
    : base.theme;

  const fontFamily: AppSettings["fontFamily"] =
    raw.fontFamily === "system"
      ? "system"
      : raw.fontFamily === "pretendard"
        ? "pretendard"
        : base.fontFamily;

  const fontWeightLevel: AppSettings["fontWeightLevel"] =
    FONT_WEIGHT_LEVELS.includes(
      raw.fontWeightLevel as (typeof FONT_WEIGHT_LEVELS)[number],
    )
      ? (raw.fontWeightLevel as AppSettings["fontWeightLevel"])
      : base.fontWeightLevel;

  const uiDensity: AppSettings["uiDensity"] =
    raw.uiDensity === "normal" || raw.uiDensity === "compact"
      ? raw.uiDensity
      : base.uiDensity;

  const layoutPreset: AppSettings["layoutPreset"] =
    LAYOUT_PRESETS.includes(raw.layoutPreset as AppSettings["layoutPreset"])
      ? (raw.layoutPreset as AppSettings["layoutPreset"])
      : raw.layoutPreset === "classic"
        ? "classic"
        : base.layoutPreset;

  const cardTexture: AppSettings["cardTexture"] =
    CARD_TEXTURES.includes(raw.cardTexture as AppSettings["cardTexture"])
      ? (raw.cardTexture as AppSettings["cardTexture"])
      : base.cardTexture;

  const accentCard: AppSettings["accentCard"] =
    raw.accentCard === "clock" || raw.accentCard === "weather"
      ? raw.accentCard
      : base.accentCard;

  const designPeek = Boolean(raw.designPeek);

  const backgroundFill = normalizeBackgroundFill(raw.backgroundFill);

  const cardOpacity = clampCardOpacity(
    typeof raw.cardOpacity === "number" && Number.isFinite(raw.cardOpacity)
      ? raw.cardOpacity
      : themeDefaultCardOpacity(theme),
  );

  const displayMode: AppSettings["displayMode"] =
    raw.displayMode === "widget" ? "widget" : "window";

  let widgetMonitor: AppSettings["widgetMonitor"] = base.widgetMonitor;
  if (raw.widgetMonitor === "all" || raw.widgetMonitor === "primary") {
    widgetMonitor = raw.widgetMonitor;
  } else if (typeof raw.widgetMonitor === "number" && Number.isFinite(raw.widgetMonitor)) {
    widgetMonitor = raw.widgetMonitor;
  }

  const widgetLockToScreen = raw.widgetLockToScreen !== false;

  const settingsDockX = clampDockPercent(
    typeof raw.settingsDockX === "number" ? raw.settingsDockX : base.settingsDockX,
  );
  const settingsDockY = clampDockPercent(
    typeof raw.settingsDockY === "number" ? raw.settingsDockY : base.settingsDockY,
  );

  return {
    theme,
    fontFamily,
    fontWeightLevel,
    uiDensity,
    cardTexture,
    accentCard,
    backgroundFill,
    cardOpacity,
    designPeek,
    layoutPreset,
    openAtLogin: Boolean(raw.openAtLogin),
    neisApiKey: String(raw.neisApiKey ?? ""),
    neisOfficeCode: String(raw.neisOfficeCode ?? ""),
    neisSchoolCode: String(raw.neisSchoolCode ?? ""),
    schoolName: String(raw.schoolName ?? ""),
    weatherLat: Number.isFinite(raw.weatherLat) ? raw.weatherLat : base.weatherLat,
    weatherLon: Number.isFinite(raw.weatherLon) ? raw.weatherLon : base.weatherLon,
    weatherLabel: String(raw.weatherLabel ?? base.weatherLabel),
    displayMode,
    widgetMonitor,
    widgetLockToScreen,
    settingsDockX,
    settingsDockY,
    globalShortcuts: raw.globalShortcuts !== false,
    onboardingDone: Boolean(raw.onboardingDone),
    disabledWidgets: Array.isArray(raw.disabledWidgets)
      ? raw.disabledWidgets.filter(
          (id): id is string => typeof id === "string" && isWidgetId(id),
        )
      : [],
    todayGlanceEnabled: raw.todayGlanceEnabled !== false,
    todayGlanceLastShownDate:
      typeof raw.todayGlanceLastShownDate === "string"
        ? raw.todayGlanceLastShownDate.slice(0, 10)
        : base.todayGlanceLastShownDate,
    todayGlanceFontSize:
      raw.todayGlanceFontSize === "normal" ||
      raw.todayGlanceFontSize === "large" ||
      raw.todayGlanceFontSize === "xlarge"
        ? raw.todayGlanceFontSize
        : base.todayGlanceFontSize,
    todayGlanceSections: normalizeTodayGlanceSections(raw.todayGlanceSections),
    portalBrowser:
      raw.portalBrowser === "chrome" ||
      raw.portalBrowser === "edge" ||
      raw.portalBrowser === "whale" ||
      raw.portalBrowser === "default"
        ? raw.portalBrowser
        : base.portalBrowser,
    portalEducationOffice: isEducationOfficeId(String(raw.portalEducationOffice ?? ""))
      ? String(raw.portalEducationOffice)
      : base.portalEducationOffice,
    portalLoginMode:
      raw.portalLoginMode === "automation" ? "automation" : "url_only",
    portalAutoLogin: Boolean(raw.portalAutoLogin),
    portalAutoLoginDelay:
      raw.portalAutoLoginDelay === "0" ||
      raw.portalAutoLoginDelay === "20" ||
      raw.portalAutoLoginDelay === "45" ||
      raw.portalAutoLoginDelay === "manual"
        ? raw.portalAutoLoginDelay
        : base.portalAutoLoginDelay,
    portalAutomationTarget: isPortalId(String(raw.portalAutomationTarget ?? ""))
      ? (raw.portalAutomationTarget as AppSettings["portalAutomationTarget"])
      : base.portalAutomationTarget,
    portalSessionExtend: Boolean(raw.portalSessionExtend),
    portalSessionExtendMinutes:
      raw.portalSessionExtendMinutes === 30 ||
      raw.portalSessionExtendMinutes === 40 ||
      raw.portalSessionExtendMinutes === 50
        ? raw.portalSessionExtendMinutes
        : base.portalSessionExtendMinutes,
    portalOsCertInput: Boolean(raw.portalOsCertInput),
    portals: normalizePortals(raw.portals, base.portals),
    portalLastNice: normalizePortalRun(raw.portalLastNice),
    portalLastEdufine: normalizePortalRun(raw.portalLastEdufine),
    portalLastGoe: normalizePortalRun(raw.portalLastGoe),
    brityMessengerEnabled: Boolean(raw.brityMessengerEnabled),
    brityMessengerExePath: String(raw.brityMessengerExePath ?? "").slice(
      0,
      500,
    ),
    brityMessengerCertLabel: String(raw.brityMessengerCertLabel ?? "").slice(
      0,
      120,
    ),
    brityMessengerShareGoeCredentials:
      raw.brityMessengerShareGoeCredentials !== false,
    brityMessengerPassword: String(raw.brityMessengerPassword ?? ""),
    brityMessengerLastRun: normalizePortalRun(raw.brityMessengerLastRun),
    portalNiceUser: String(raw.portalNiceUser ?? ""),
    portalNicePassword: String(raw.portalNicePassword ?? ""),
    portalEdufineUser: String(raw.portalEdufineUser ?? ""),
    portalEdufinePassword: String(raw.portalEdufinePassword ?? ""),
    portalGoeUser: String(raw.portalGoeUser ?? ""),
    portalGoePassword: String(raw.portalGoePassword ?? ""),
    timetableAutoSync: Boolean(raw.timetableAutoSync),
    timetableFetchMode: raw.timetableFetchMode === "s2h9" ? "s2h9" : "direct",
    timetableProxyBaseUrl: normalizeTimetableProxyBaseUrl(
      raw.timetableProxyBaseUrl,
      base.timetableProxyBaseUrl,
    ),
    comciganSchoolCode: String(raw.comciganSchoolCode ?? "").replace(/\D/g, ""),
    comciganSchoolName: String(raw.comciganSchoolName ?? "").slice(0, 120),
    comciganTeacherName: String(raw.comciganTeacherName ?? "").slice(0, 40),
    comciganTeacherIndex: normalizeComciganTeacherIndex(raw.comciganTeacherIndex),
    comciganClassLabelMode:
      raw.comciganClassLabelMode === "general" ? "general" : "jeil",
    timetableLastSyncAt: String(raw.timetableLastSyncAt ?? "").slice(0, 40),
    timetableLastSyncError: String(raw.timetableLastSyncError ?? "").slice(
      0,
      400,
    ),
    timetableLastSyncVia:
      raw.timetableLastSyncVia === "direct" ||
      raw.timetableLastSyncVia === "s2h9"
        ? raw.timetableLastSyncVia
        : "",
    timetableLastSyncReason:
      raw.timetableLastSyncReason === "startup" ||
      raw.timetableLastSyncReason === "schedule" ||
      raw.timetableLastSyncReason === "manual"
        ? raw.timetableLastSyncReason
        : "",
    timetableSubstituteNotifiedKey: String(
      raw.timetableSubstituteNotifiedKey ?? "",
    ).slice(0, 4000),
  };
}

function normalizeTimetableProxyBaseUrl(
  raw: string | undefined,
  fallback: string,
): string {
  const trimmed = String(raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return fallback;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return fallback;
    return url.origin;
  } catch {
    return fallback;
  }
}

function normalizePortalRun(
  raw: AppSettings["portalLastNice"] | undefined,
): AppSettings["portalLastNice"] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const at = String(raw.at ?? "");
  if (!at) return undefined;
  return {
    at,
    ok: Boolean(raw.ok),
    summary: String(raw.summary ?? "").slice(0, 400),
  };
}

function normalizePortals(
  raw: AppSettings["portals"] | undefined,
  base: AppSettings["portals"],
): AppSettings["portals"] {
  const pick = (
    id: keyof AppSettings["portals"],
    entry: { enabled?: boolean; url?: string } | undefined,
  ) => {
    const def = base[id];
    const urlRaw = String(entry?.url ?? def.url).trim();
    const url = isAllowedPortalUrl(urlRaw) ? urlRaw : def.url;
    return {
      enabled: entry?.enabled !== false,
      url,
    };
  };
  return {
    nice: pick("nice", raw?.nice),
    edufine: pick("edufine", raw?.edufine),
    goePortal: pick("goePortal", raw?.goePortal),
  };
}
