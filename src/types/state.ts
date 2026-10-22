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

export type NeisScheduleRow = {
  ymd: string;
  name: string;
  content: string;
};

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
  /** 끈 위젯 id 목록 (설정 카드는 항상 표시) */
  disabledWidgets: string[];
  onboardingDone: boolean;
};

export type NeisSchoolRow = {
  officeCode: string;
  schoolCode: string;
  name: string;
  address: string;
  kind: string;
};

export type LayoutItem = { x: number; y: number; w: number; h: number };

export type PersistedState = {
  todos: TodoItem[];
  memos: MemoNote[];
  ddays: DDayItem[];
  timetable: TimetableData;
  layout: Record<string, LayoutItem>;
  settings: AppSettings;
};
