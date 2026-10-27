/** NEIS YYYYMMDD ↔ 달력·할 일 YYYY-MM-DD */
export function neisYmdToDash(ymd: string): string {
  if (ymd.length !== 8) return ymd;
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

export function monthNeisRange(year: number, monthIndex: number): {
  fromYmd: string;
  toYmd: string;
} {
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return {
    fromYmd: `${year}${pad(monthIndex + 1)}01`,
    toYmd: `${year}${pad(monthIndex + 1)}${pad(last)}`,
  };
}
