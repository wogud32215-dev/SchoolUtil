export const DEFAULT_PERIOD_STARTS = [
  "09:10",
  "10:10",
  "11:10",
  "12:10",
  "14:00",
  "15:00",
  "16:00",
];

export function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 이번 주 월~금 (로컬 날짜) */
export function weekDatesFromMonday(): string[] {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  const mon = new Date(now);
  mon.setHours(0, 0, 0, 0);
  mon.setDate(mon.getDate() - dow);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return localYmd(d);
  });
}

export function periodStartTimes(periodCount: number): string[] {
  return Array.from(
    { length: periodCount },
    (_, i) => DEFAULT_PERIOD_STARTS[i] ?? "",
  );
}
