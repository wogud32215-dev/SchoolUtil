import type {
  AppSettings,
  CalendarEvent,
  DDayItem,
  PersistedState,
  TodayGlanceSections,
  TodoItem,
} from "@/types/state";
import { ymdForLocalDate } from "@/utils/dueLabel";
import {
  formatLessonForDisplay,
  formatTimetableCellText,
} from "@/utils/jeilClassLabels";
import { buildTimetableForDisplay } from "@/utils/timetableManual";
import { normalizeTimetable } from "@/utils/timetable";

export type TodayGlanceFontSize = AppSettings["todayGlanceFontSize"];

export type TodayGlanceSyncContent = {
  todos: { items: TodoItem[]; moreCount: number };
  classes: string[];
  calendar: CalendarEvent[];
  ddays: { item: DDayItem; days: number }[];
  memos: { id: string; preview: string }[];
};

const CLOSING_LINES = [
  "작은 한 걸음이 쌓여 큰 하루가 됩니다.",
  "오늘도 학생들에게 좋은 기억이 되는 날이 되길 바랍니다.",
  "쉬는 시간 한 모금, 오후도 힘내세요.",
  "준비해 두신 만큼 수업이 편해집니다.",
  "꼭 필요한 일부터 하나씩, 충분합니다.",
  "몸과 마음 모두 무리하지 마세요.",
  "오늘의 수고가 내일의 여유를 만듭니다.",
  "학교 안 작은 변화도 큰 의미가 있습니다.",
  "질문 한 번이 수업을 더 깊게 만듭니다.",
  "서로를 돕는 하루가 되길 바랍니다.",
  "계획보다 중요한 건 지금 이 순간의 집중입니다.",
  "잘하고 계십니다. 오늘도 그대로면 충분합니다.",
  "바쁜 날엔 할 일 목록이 가장 든든한 동료입니다.",
  "학생 한 명 한 명의 이름이 오늘의 중심입니다.",
  "차분한 한 걸음이 교실 분위기를 바꿉니다.",
  "오늘 적어 둔 메모가 내일의 시간을 아껴 줍니다.",
  "수업 끝의 피곤함도 성장의 흔적입니다.",
  "함께하는 동료가 있어 다행인 하루입니다.",
  "작은 칭찬이 큰 동기가 됩니다.",
  "오늘은 스스로에게도 따뜻한 말을 건네 보세요.",
  "리듬을 지키면 하루가 덜 흔들립니다.",
  "꼭 해야 할 일만 남기면 마음이 가벼워집니다.",
  "학교와 집, 두 세계를 잘 오가고 계십니다.",
  "오늘의 선택이 내일의 편안을 만듭니다.",
  "한 번에 다 하려 하지 않아도 됩니다.",
  "수업 준비는 이미 충분히 하고 계십니다.",
  "학생들의 웃음이 가장 좋은 피드백입니다.",
  "조용한 집중의 시간도 소중합니다.",
  "오늘 하루, 스스로를 칭찬해 보세요.",
  "내일을 위해 오늘을 조금만 더 다듬어 봅니다.",
];

export function localYmd(now = new Date()): string {
  return ymdForLocalDate(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );
}

export function todayGlanceGreeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 11) return "선생님, 좋은 아침입니다";
  if (h < 17) return "오늘도 수고 많으십니다";
  return "오늘 하루 고생하셨습니다";
}

export function formatTodayGlanceDate(now = new Date()): string {
  const wd = ["일", "월", "화", "수", "목", "금", "토"][now.getDay()];
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${wd})`;
}

function daysUntil(dateStr: string, now = new Date()): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return 9999;
  const target = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
  );
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function weekdayColumnIndex(now = new Date()): number | null {
  const d = now.getDay();
  if (d === 0 || d === 6) return null;
  return d - 1;
}

/** «오늘 할 일» — 마감일이 오늘인 항목만 (지난 날 미완료는 할 일 위젯·달력에서 확인) */
function todoDueToday(todo: TodoItem, todayYmd: string): boolean {
  if (todo.done || !todo.dueDate) return false;
  return todo.dueDate === todayYmd;
}

export function defaultTodayGlanceSections(): TodayGlanceSections {
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

/** 구버전 settings·부분 patch 후에도 제일 메이트 설정이 깨지지 않게 */
export function resolveTodayGlanceSettings(
  settings: AppSettings,
): Pick<
  AppSettings,
  | "todayGlanceEnabled"
  | "todayGlanceLastShownDate"
  | "todayGlanceFontSize"
  | "todayGlanceSections"
> {
  const fontSize = settings.todayGlanceFontSize;
  return {
    todayGlanceEnabled: settings.todayGlanceEnabled !== false,
    todayGlanceLastShownDate: settings.todayGlanceLastShownDate ?? "",
    todayGlanceFontSize:
      fontSize === "normal" || fontSize === "large" || fontSize === "xlarge"
        ? fontSize
        : "large",
    todayGlanceSections:
      settings.todayGlanceSections ?? defaultTodayGlanceSections(),
  };
}

export function buildTodayGlanceSyncContent(
  state: PersistedState,
  now = new Date(),
): TodayGlanceSyncContent {
  const todayYmd = localYmd(now);

  const dueTodos = state.todos
    .filter((t) => todoDueToday(t, todayYmd))
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  const todoItems = dueTodos.slice(0, 3);
  const moreCount = Math.max(0, dueTodos.length - todoItems.length);

  const tt = buildTimetableForDisplay(normalizeTimetable(state.timetable));
  const dayCol = weekdayColumnIndex(now);
  const classes: string[] = [];
  const labelMode = state.settings.comciganClassLabelMode ?? "jeil";
  if (dayCol !== null) {
    for (let p = 0; p < tt.periodCount && classes.length < 6; p++) {
      const chips =
        tt.comciganView?.chips[dayCol]?.[p]?.filter((c) => !c.vacated) ?? [];
      if (chips.length > 0) {
        const lessons = chips
          .map((c) =>
            formatLessonForDisplay(c.classCode, c.subject, labelMode),
          )
          .filter((line) => line.length > 0);
        if (lessons.length > 0) {
          classes.push(`${p + 1}교시 ${lessons.join(" · ")}`);
        }
        continue;
      }
      const raw = (tt.grid[dayCol]?.[p] ?? "").trim();
      if (raw) {
        classes.push(
          `${p + 1}교시 ${formatTimetableCellText(raw, labelMode)}`,
        );
      }
    }
  }

  const calendar = state.calendarEvents
    .filter((e) => e.date === todayYmd && !e.done)
    .slice(0, 5);

  const ddays = state.ddays
    .map((item) => ({ item, days: daysUntil(item.date, now) }))
    .filter((row) => row.days >= 0 && row.days <= 7)
    .sort((a, b) => a.days - b.days)
    .slice(0, 4);

  const memos = state.memos
    .filter((m) => m.text.trim().length > 0)
    .slice(0, 3)
    .map((m) => ({
      id: m.id,
      preview: m.text.trim().replace(/\s+/g, " ").slice(0, 120),
    }));

  return {
    todos: { items: todoItems, moreCount },
    classes,
    calendar,
    ddays,
    memos,
  };
}

export function closingLineForDay(
  ymd: string,
  schoolName: string,
): string {
  let hash = 0;
  const seed = `${ymd}|${schoolName.trim()}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % CLOSING_LINES.length;
  return CLOSING_LINES[idx];
}

export function neisSchoolReady(
  settings: AppSettings,
  neisKeyReady = false,
): boolean {
  return Boolean(
    settings.neisOfficeCode.trim() &&
      settings.neisSchoolCode.trim() &&
      (neisKeyReady || settings.neisApiKey.trim()),
  );
}

export function hasTodayGlanceContent(
  sync: TodayGlanceSyncContent,
  sections: TodayGlanceSections,
  extras: { mealLines: string[]; weatherOk: boolean },
): boolean {
  if (sections.todos && sync.todos.items.length + sync.todos.moreCount > 0) {
    return true;
  }
  if (sections.timetable && sync.classes.length > 0) return true;
  if (sections.meal && extras.mealLines.length > 0) return true;
  if (sections.calendar && sync.calendar.length > 0) return true;
  if (sections.dday && sync.ddays.length > 0) return true;
  if (sections.memo && sync.memos.length > 0) return true;
  if (sections.weather && extras.weatherOk) return true;
  return false;
}

export function sectionEnabled(
  sections: TodayGlanceSections,
  key: keyof TodayGlanceSections,
): boolean {
  return sections[key] === true;
}
