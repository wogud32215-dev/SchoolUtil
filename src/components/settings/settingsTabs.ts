export type SettingsTabId =
  | "design"
  | "widget"
  | "screen"
  | "school"
  | "data"
  | "portal"
  | "help";

export type SettingsTabDef = {
  id: SettingsTabId;
  label: string;
};

export const SETTINGS_TABS: SettingsTabDef[] = [
  { id: "design", label: "테마" },
  { id: "widget", label: "카드" },
  { id: "screen", label: "표시" },
  { id: "school", label: "학교 연동" },
  { id: "data", label: "백업" },
  { id: "portal", label: "포털" },
  { id: "help", label: "안내" },
];

export function labelForSettingsTab(id: SettingsTabId): string {
  const tab = SETTINGS_TABS.find((t) => t.id === id);
  return tab?.label ?? id;
}
