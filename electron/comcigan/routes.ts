import iconv from "iconv-lite";
import { decodeServicePage } from "./service-page";
import { parseServiceProtocol, type ServiceProtocol } from "./service-protocol";
import { fetchText } from "./http";

export type ComciganRoutes = {
  mainRoute: string;
  searchRoute: string;
  timetableRoute: string;
  teacherCode: string;
  originalCode: string;
  dayCode: string;
  subjectCode: string;
};

export type ComciganSession = {
  routes: ComciganRoutes;
  protocol: ServiceProtocol;
};

const BASE = "http://comci.net:4082";

let cached: { day: number; session: ComciganSession } | null = null;

function parseRouteNumbers(endpoint: string): { mainRoute: string; searchRoute: string } {
  const m = /\.?\/?(\d+)\?(\d+l)/.exec(endpoint);
  if (!m) {
    throw new Error(
      "컴시간 페이지 구조가 바뀌었습니다. 앱 업데이트가 필요할 수 있습니다.",
    );
  }
  return { mainRoute: m[1], searchRoute: m[2] };
}

function parseDataCodes(content: string): Omit<ComciganRoutes, "mainRoute" | "searchRoute"> {
  const timetableRoute = /sc_data\(\s*'(\d+)_/.exec(content)?.[1];
  const teacherCode =
    /성명\s*=\s*(?:Q성명\(\s*)?자료\.자료(\d+)/.exec(content)?.[1];
  const subjectCode =
    /(?:과목명\s*=\s*(?:Q과목명\(\s*)?)?자료\.자료(\d+)\[sb\]/.exec(content)?.[1];
  const originalCode =
    /원자료\s*=\s*Q자료\(\s*자료\.자료(\d+)/.exec(content)?.[1];
  const dayCode = /일일자료\s*=\s*Q자료\(\s*자료\.자료(\d+)/.exec(content)?.[1];
  if (
    !timetableRoute ||
    !teacherCode ||
    !subjectCode ||
    !originalCode ||
    !dayCode
  ) {
    throw new Error(
      "컴시간 페이지 구조가 바뀌었습니다. 앱 업데이트가 필요할 수 있습니다.",
    );
  }
  return {
    timetableRoute,
    teacherCode,
    subjectCode,
    originalCode,
    dayCode,
  };
}

function buildRoutes(content: string, protocol: ServiceProtocol): ComciganRoutes {
  const { mainRoute, searchRoute } = parseRouteNumbers(protocol.endpoint);
  return {
    mainRoute,
    searchRoute,
    ...parseDataCodes(content),
  };
}

export async function getComciganSession(): Promise<ComciganSession> {
  const today = new Date().getDate();
  if (cached && cached.day === today) return cached.session;

  const raw = await fetchText(`${BASE}/st`);
  const decoded = decodeServicePage(raw);
  const protocol = parseServiceProtocol(decoded);
  const routes = buildRoutes(decoded, protocol);
  const session = { routes, protocol };
  cached = { day: today, session };
  return session;
}

/** @deprecated use getComciganSession */
export async function getComciganRoutes(): Promise<ComciganRoutes> {
  const { routes } = await getComciganSession();
  return routes;
}

export function encodeSchoolSearchPath(
  session: ComciganSession,
  schoolName: string,
): string {
  const { routes, protocol } = session;
  if (protocol.version && protocol.key) {
    const encodedName = encodeURIComponent(schoolName);
    const token = Buffer.from(
      `${routes.searchRoute}${encodedName}_${protocol.version}`,
      "ascii",
    ).toString("base64");
    return `/${routes.mainRoute}?${encodeURIComponent(token)}`;
  }

  const encoded = iconv.encode(schoolName, "euc-kr");
  let binary = "";
  for (const byte of encoded) {
    binary += `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  return `/${routes.mainRoute}?${routes.searchRoute}l${binary}`;
}

export function encodeTimetablePath(
  session: ComciganSession,
  schoolCode: number,
  weekIndex = 1,
): string {
  const { routes, protocol } = session;
  const suffix = protocol.version ? `_${protocol.version}` : "";
  const param = Buffer.from(
    `${routes.timetableRoute}_${schoolCode}_0_${weekIndex}${suffix}`,
    "utf8",
  ).toString("base64");
  return `/${routes.mainRoute}?${param}`;
}

export { BASE as COMCI_BASE_URL };
