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
  { id: "design", label: "디자인" },
  { id: "widget", label: "위젯" },
  { id: "screen", label: "화면" },
  { id: "school", label: "학교" },
  { id: "data", label: "데이터" },
  { id: "portal", label: "업무포털" },
  { id: "help", label: "도움말" },
];
