const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

export type DueTone =
  | "today"
  | "tomorrow"
  | "soon"
  | "overdue"
  | "default";

export type DueLabelResult = {
  text: string;
  tone: DueTone;
};

function parseYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function dayStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** 로컬 날짜 기준 마감 표시 (dueDate: YYYY-MM-DD) */
export function formatDueLabel(
  dueDate: string,
  now = new Date(),
): DueLabelResult {
  const due = parseYmd(dueDate);
  if (!due) {
    return { text: dueDate, tone: "default" };
  }

  const diffDays = Math.round(
    (dayStart(due) - dayStart(now)) / (24 * 60 * 60 * 1000),
  );

  if (diffDays < 0) {
    return { text: "연체", tone: "overdue" };
  }
  if (diffDays === 0) {
    return { text: "오늘", tone: "today" };
  }
  if (diffDays === 1) {
    return { text: "내일", tone: "tomorrow" };
  }

  const mm = String(due.getMonth() + 1).padStart(2, "0");
  const dd = String(due.getDate()).padStart(2, "0");
  const wd = WEEKDAY_KO[due.getDay()];
  const text = `${mm}/${dd}(${wd})`;

  if (diffDays <= 7) {
    return { text, tone: "soon" };
  }
  return { text, tone: "default" };
}

export function ymdForLocalDate(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** 마감일 표 (YYYY-MM-DD) → 2026년 10월 21일 */
export function formatDueDateLong(dueDate: string): string {
  const due = parseYmd(dueDate);
  if (!due) return dueDate;
  return `${due.getFullYear()}년 ${due.getMonth() + 1}월 ${due.getDate()}일`;
}
