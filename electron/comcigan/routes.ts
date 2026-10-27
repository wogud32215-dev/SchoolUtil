import iconv from "iconv-lite";
import { fetchBytes } from "./http";

export type ComciganRoutes = {
  mainRoute: string;
  searchRoute: string;
  timetableRoute: string;
  teacherCode: string;
  originalCode: string;
  dayCode: string;
  subjectCode: string;
};

const BASE = "http://comci.net:4082";

let cached: { day: number; routes: ComciganRoutes } | null = null;

function parseRoutes(stPage: string): ComciganRoutes {
  const mainRoute = /(?<=\.\/)\d+(?=\?\d+l)/.exec(stPage)?.[0];
  const searchRoute = /(?<=\?)\d+(?=l)/.exec(stPage)?.[0];
  const timetableRoute = /(?<=')\d+(?=_')/.exec(stPage)?.[0];
  const teacherCode = /Q성명\(자료\.자료(\d+)/.exec(stPage)?.[1];
  const originalCode = /(?<=원자료=Q자료\(자료.자료)\d+/.exec(stPage)?.[0];
  const dayCode = /(?<=일일자료=Q자료\(자료.자료)\d+/.exec(stPage)?.[0];
  const subjectCode = /자료\.자료(\d+)\[sb\]/.exec(stPage)?.[1];
  if (
    !mainRoute ||
    !searchRoute ||
    !timetableRoute ||
    !teacherCode ||
    !originalCode ||
    !dayCode ||
    !subjectCode
  ) {
    throw new Error(
      "컴시간 페이지 구조가 바뀌었습니다. 앱 업데이트가 필요할 수 있습니다.",
    );
  }
  return {
    mainRoute,
    searchRoute,
    timetableRoute,
    teacherCode,
    originalCode,
    dayCode,
    subjectCode,
  };
}

export async function getComciganRoutes(): Promise<ComciganRoutes> {
  const today = new Date().getDate();
  if (cached && cached.day === today) return cached.routes;

  const buf = await fetchBytes(`${BASE}/st`);
  const stPage = iconv.decode(buf, "euc-kr");
  const routes = parseRoutes(stPage);
  cached = { day: today, routes };
  return routes;
}

export function encodeSchoolSearchPath(
  routes: ComciganRoutes,
  schoolName: string,
): string {
  const encoded = iconv.encode(schoolName, "euc-kr");
  let binary = "";
  for (const byte of encoded) {
    binary += `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  return `/${routes.mainRoute}?${routes.searchRoute}l${binary}`;
}

export function encodeTimetablePath(
  routes: ComciganRoutes,
  schoolCode: number,
  weekIndex = 1,
): string {
  const param = Buffer.from(
    `${routes.timetableRoute}_${schoolCode}_0_${weekIndex}`,
  ).toString("base64");
  return `/${routes.mainRoute}_T?${param}`;
}

export { BASE as COMCI_BASE_URL };
