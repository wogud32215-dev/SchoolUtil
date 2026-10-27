const WMO: Record<number, string> = {
  0: "맑음",
  1: "대체로 맑음",
  2: "구름 조금",
  3: "흐림",
  45: "안개",
  48: "안개",
  51: "이슬비",
  61: "비",
  71: "눈",
  80: "소나기",
  95: "뇌우",
};

export function wmoLabel(code: number | null): string {
  if (code == null) return "—";
  return WMO[code] ?? `코드 ${code}`;
}
