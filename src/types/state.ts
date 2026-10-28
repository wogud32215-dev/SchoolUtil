export type NeisKeyMode = "none" | "app" | "personal";

export type NeisKeyStatus = {
  mode: NeisKeyMode;
  hasAppKey: boolean;
  hasPersonalKey: boolean;
  canManageAppKey: boolean;
};

export type NeisMealItem = {
  name: string;
  allergies: string[];
};

export type NeisMealDay = {
  ymd: string;
  mealName: string;
  items: NeisMealItem[];
  /** 메뉴 이름만 (오늘 한눈에 보기 등) */
  lines: string[];
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

/** 달력 «내 일정» (YYYY-MM-DD) */
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
  /** 원래 시간표 칸이었으나 교체 등으로 현재 표에서 빠진 수업 */
  vacated?: boolean;
  /** 사용자가 넣은 수동 칸 (창체 등) */
  manual?: boolean;
  /** manual일 때 true=매주, false=이번 주만 */
  manualWeekly?: boolean;
};

export type TimetableWeeklyManualSlot = {
  dayIndex: number;
  periodIndex: number;
  label: string;
};

export type TimetableWeekManualSlot = TimetableWeeklyManualSlot & {
  /** 해당 주 월요일 (YYYY-MM-DD) */
  weekStartYmd: string;
};

export type TimetableManualScope = "weekly" | "week";

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
  substituteFlags?: boolean[][];
  comciganView?: ComciganTimetableView;
  /** 컴시간 빈 칸에 매주 표시할 수업 (창체 등) */
  weeklyManual?: TimetableWeeklyManualSlot[];
  /** 이번 주만 표시할 수업 */
  weekManual?: TimetableWeekManualSlot[];
};

export type NeisScheduleRow = {
  ymd: string;
  name: string;
  content: string;
};

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

/** 앱 전체 글자 굵기 (5단계) */
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
  | "recommended"
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

/** 컴시간 시간표에 표시할 학급 이름 방식 */
export type ComciganClassLabelMode = "general" | "jeil";

export type AppSettings = {
  theme: AppTheme;
  fontFamily: FontFamilySetting;
  /** 1~5단계 글자 굵기 */
  fontWeightLevel: FontWeightLevel;
  uiDensity: UiDensity;
  cardTexture: CardTexture;
  accentCard: AccentCard;
  /** 위젯 사이·창 배경 채우기 (위젯 모드에서 바탕화면 노출) */
  backgroundFill: BackgroundFill;
  /** 카드 불투명도 15–100 (100 = 완전 불투명) */
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
  widgetMonitor?: "primary" | "all" | number;
  /** 위젯 모드에서 창을 선택한 모니터 작업 영역에 맞춰 고정 */
  widgetLockToScreen: boolean;
  /** 설정 독 가로 위치 (화면 %, 중심) */
  settingsDockX: number;
  /** 설정 독 세로 위치 (화면 %, 중심) */
  settingsDockY: number;
  globalShortcuts: boolean;
  /** 끈 위젯 id 목록 (설정 카드는 항상 표시) */
  disabledWidgets: string[];
  /** 앱 실행 시 하루 한 번 «제일 메이트» 모달 */
  todayGlanceEnabled: boolean;
  /** 마지막으로 «제일 메이트»를 닫은 날 (YYYY-MM-DD, 로컬) */
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
  portalNiceUser: string;
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
  brityMessengerCertLabel: string;
  brityMessengerShareGoeCredentials: boolean;
  brityMessengerPassword: string;
  brityMessengerLastRun?: PortalRunRecord;
  timetableAutoSync: boolean;
  timetableFetchMode: "direct" | "s2h9";
  timetableProxyBaseUrl: string;
  comciganSchoolCode: string;
  comciganSchoolName: string;
  comciganTeacherName: string;
  /** 컴시간 교사 배열 인덱스 (동명이인 구분, -1 = 미선택) */
  comciganTeacherIndex: number;
  /** 컴시간 학급 표기: 일반고(학년·반) / 제일고(학과·반) */
  comciganClassLabelMode: ComciganClassLabelMode;
  timetableLastSyncAt: string;
  timetableLastSyncError: string;
  timetableLastSyncVia: "" | "direct" | "s2h9";
  timetableLastSyncReason: "" | "startup" | "schedule" | "manual";
  timetableSubstituteNotifiedKey: string;
};

export type ComciganTeacherOption = {
  index: number;
  name: string;
  label: string;
};

export type PortalId = "nice" | "edufine" | "goePortal";

export type PortalRunRecord = {
  at: string;
  ok: boolean;
  summary: string;
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
  calendarEvents: CalendarEvent[];
  timetable: TimetableData;
  layout: Record<string, LayoutItem>;
  settings: AppSettings;
};
