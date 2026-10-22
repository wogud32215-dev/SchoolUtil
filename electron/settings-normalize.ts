import type { AppSettings } from "./store";
import { isWidgetId } from "./widget-ids";

export const defaultAppSettings = (): AppSettings => ({
  theme: "blue",
  openAtLogin: false,
  neisApiKey: "",
  neisOfficeCode: "",
  neisSchoolCode: "",
  schoolName: "",
  weatherLat: 37.5665,
  weatherLon: 126.978,
  weatherLabel: "서울",
  displayMode: "widget",
  globalShortcuts: true,
  disabledWidgets: [],
  onboardingDone: false,
});

export function normalizeSettings(raw: AppSettings | undefined): AppSettings {
  const base = defaultAppSettings();
  if (!raw || typeof raw !== "object") return base;

  const theme =
    raw.theme === "green" || raw.theme === "dark" || raw.theme === "blue"
      ? raw.theme
      : base.theme;

  const displayMode: AppSettings["displayMode"] =
    raw.displayMode === "widget" ? "widget" : "window";

  return {
    theme,
    openAtLogin: Boolean(raw.openAtLogin),
    neisApiKey: String(raw.neisApiKey ?? ""),
    neisOfficeCode: String(raw.neisOfficeCode ?? ""),
    neisSchoolCode: String(raw.neisSchoolCode ?? ""),
    schoolName: String(raw.schoolName ?? ""),
    weatherLat: Number.isFinite(raw.weatherLat) ? raw.weatherLat : base.weatherLat,
    weatherLon: Number.isFinite(raw.weatherLon) ? raw.weatherLon : base.weatherLon,
    weatherLabel: String(raw.weatherLabel ?? base.weatherLabel),
    displayMode,
    globalShortcuts: raw.globalShortcuts !== false,
    onboardingDone: Boolean(raw.onboardingDone),
    disabledWidgets: Array.isArray(raw.disabledWidgets)
      ? raw.disabledWidgets.filter(
          (id): id is string => typeof id === "string" && isWidgetId(id),
        )
      : [],
  };
}
