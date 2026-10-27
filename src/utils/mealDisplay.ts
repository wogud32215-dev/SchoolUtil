import type { NeisMealDay } from "@/types/state";
import { neisYmdToDash } from "@/utils/neisYmd";

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function localNeisYmd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export function addDaysYmd(ymd: string, days: number): string {
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(4, 6)) - 1;
  const d = Number(ymd.slice(6, 8));
  const dt = new Date(y, m, d);
  dt.setDate(dt.getDate() + days);
  return localNeisYmd(dt);
}

/** 예: 10/27(화) 급식 */
export function mealCardTitle(ymd: string): string {
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(4, 6));
  const d = Number(ymd.slice(6, 8));
  const wd = WEEKDAY_KO[new Date(y, m - 1, d).getDay()];
  return `${m}/${d}(${wd}) 급식`;
}

/** 위젯 헤더: 오늘 급식 / 내일 급식 / … */
export function mealWidgetTitle(ymd: string, todayYmd = localNeisYmd()): string {
  const ty = Number(todayYmd.slice(0, 4));
  const tm = Number(todayYmd.slice(4, 6)) - 1;
  const td = Number(todayYmd.slice(6, 8));
  const ay = Number(ymd.slice(0, 4));
  const am = Number(ymd.slice(4, 6)) - 1;
  const ad = Number(ymd.slice(6, 8));
  const diff = Math.round(
    (new Date(ay, am, ad).getTime() - new Date(ty, tm, td).getTime()) /
      86400000,
  );
  if (diff === 0) return "오늘 급식";
  if (diff === 1) return "내일 급식";
  if (diff === 2) return "모레 급식";
  if (diff === -1) return "어제 급식";
  return mealCardTitle(ymd);
}

export function mealDayHeading(ymd: string, todayYmd = localNeisYmd()): string {
  const ty = Number(todayYmd.slice(0, 4));
  const tm = Number(todayYmd.slice(4, 6)) - 1;
  const td = Number(todayYmd.slice(6, 8));
  const ay = Number(ymd.slice(0, 4));
  const am = Number(ymd.slice(4, 6)) - 1;
  const ad = Number(ymd.slice(6, 8));
  const start = new Date(ty, tm, td).getTime();
  const target = new Date(ay, am, ad).getTime();
  const diff = Math.round((target - start) / 86400000);
  const date = neisYmdToDash(ymd);
  if (diff === 0) return `오늘 (${date})`;
  if (diff === 1) return `내일 (${date})`;
  if (diff === 2) return `모레 (${date})`;
  return date;
}

export function groupMealsByYmd(days: NeisMealDay[]): { ymd: string; meals: NeisMealDay[] }[] {
  const map = new Map<string, NeisMealDay[]>();
  for (const day of days) {
    const list = map.get(day.ymd) ?? [];
    list.push(day);
    map.set(day.ymd, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ymd, meals]) => ({ ymd, meals }));
}

export function todayMealLines(
  days: NeisMealDay[],
  todayYmd = localNeisYmd(),
): string[] {
  return days.filter((d) => d.ymd === todayYmd).flatMap((d) => d.lines);
}
