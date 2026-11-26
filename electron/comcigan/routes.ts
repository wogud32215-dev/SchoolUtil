import iconv from "iconv-lite";
import { decodeServicePage } from "./service-page";
import { parseServiceProtocol, type ServiceProtocol } from "./service-protocol";
import { fetchText } from "./http";
import { inferTimetableDataCodes } from "./parse";

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

export type ComciganApiRequest = {
  path: string;
  body?: string;
  method: "GET" | "POST";
};

const BASE = "http://comci.net:4082";

let cached: { cacheKey: string; session: ComciganSession } | null = null;

function comciganSessionCacheKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
}

function parseRouteNumbers(endpoint: string): { mainRoute: string; searchRoute: string } {
  const m = /\.?\/?(\d+)\?(\d+l)/.exec(endpoint);
  if (!m) {
    throw new Error(
      "컴시간 페이지 구조가 바뀌었습니다. 앱 업데이트가 필요할 수 있습니다.",
    );
  }
  return { mainRoute: m[1], searchRoute: m[2] };
}

function parseDataCodesLegacy(
  content: string,
): Omit<ComciganRoutes, "mainRoute" | "searchRoute"> | null {
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
    return null;
  }
  return {
    timetableRoute,
    teacherCode,
    subjectCode,
    originalCode,
    dayCode,
  };
}

function parseDataCodes8701(
  content: string,
): Omit<ComciganRoutes, "mainRoute" | "searchRoute"> | null {
  const timetableRoute =
    /\w+\('(\d{4,7})_',\s*sc/.exec(content)?.[1] ??
    /f856wT\('(\d{4,7})_'/.exec(content)?.[1];
  const teacherCode =
    /성명=\w+\(자료\.([A-Z]{3}\d{3})\[th\]/.exec(content)?.[1] ??
    /yI8z\(자료\.([A-Z]{3}\d{3})\[/.exec(content)?.[1] ??
    /Hg6GVP\(자료\.([A-Z]{3}\d{3})\[/.exec(content)?.[1];
  const subjectCode =
    /과목명=\w+\(자료\.([A-Z]{3}\d{3})\[sb\]/.exec(content)?.[1] ??
    /gT3x\(자료\.([A-Z]{3}\d{3})\[/.exec(content)?.[1] ??
    /BIGW1o\(자료\.([A-Z]{3}\d{3})\[sb\]/.exec(content)?.[1];
  const originalCode =
    /t3qm=n4er\(자료\.([A-Z]{3}\d{3})\[/.exec(content)?.[1] ??
    /원자료=\w+\(자료\.([A-Z]{3}\d{3})\[/.exec(content)?.[1] ??
    /원자료=Q자료\(자료\.([A-Z]{3}\d{3})\[/.exec(content)?.[1] ??
    "";
  const dayCode =
    /rQN1=n4er\(자료\.([A-Z]{3}\d{3})\[/.exec(content)?.[1] ??
    /일일자료=\w+\(자료\.([A-Z]{3}\d{3})\[/.exec(content)?.[1] ??
    /일일자료=Q자료\(자료\.([A-Z]{3}\d{3})\[/.exec(content)?.[1] ??
    "";
  if (!timetableRoute || !teacherCode || !subjectCode) {
    return null;
  }
  return {
    timetableRoute,
    teacherCode,
    subjectCode,
    originalCode,
    dayCode,
  };
}

function parseDataCodes(
  content: string,
): Omit<ComciganRoutes, "mainRoute" | "searchRoute"> {
  const modern = parseDataCodes8701(content);
  if (modern) return modern;
  const legacy = parseDataCodesLegacy(content);
  if (legacy) return legacy;
  throw new Error(
    "컴시간 페이지 구조가 바뀌었습니다. 앱 업데이트가 필요할 수 있습니다.",
  );
}

function buildRoutes(content: string, protocol: ServiceProtocol): ComciganRoutes {
  const dataCodes = parseDataCodes(content);
  if (protocol.apiStyle === "post-plain" && protocol.mainRoute && protocol.searchRoute) {
    return {
      mainRoute: protocol.mainRoute,
      searchRoute: protocol.searchRoute,
      ...dataCodes,
    };
  }
  const { mainRoute, searchRoute } = parseRouteNumbers(protocol.endpoint);
  return {
    mainRoute,
    searchRoute,
    ...dataCodes,
  };
}

export function patchComciganRoutesFromPayload(
  session: ComciganSession,
  data: Record<string, unknown>,
): ComciganSession {
  const inferred = inferTimetableDataCodes(data);
  if (!inferred) {
    return session;
  }
  const { teacherCode, subjectCode, originalCode, dayCode } = inferred;
  session.routes = {
    ...session.routes,
    teacherCode,
    subjectCode,
    originalCode,
    dayCode,
  };
  return session;
}

export async function getComciganSession(): Promise<ComciganSession> {
  const cacheKey = comciganSessionCacheKey();
  if (cached && cached.cacheKey === cacheKey) return cached.session;

  const raw = await fetchText(`${BASE}/st`);
  const decoded = decodeServicePage(raw);
  const protocol = parseServiceProtocol(decoded);
  const routes = buildRoutes(decoded, protocol);
  const session = { routes, protocol };
  cached = { cacheKey, session };
  return session;
}

/** @deprecated use getComciganSession */
export async function getComciganRoutes(): Promise<ComciganRoutes> {
  const { routes } = await getComciganSession();
  return routes;
}

export function buildSchoolSearchRequest(
  session: ComciganSession,
  schoolName: string,
): ComciganApiRequest {
  const { routes, protocol } = session;
  if (protocol.apiStyle === "post-plain") {
    const version = protocol.version ?? "8701";
    const encodedName = encodeURIComponent(schoolName);
    const inner = `${routes.searchRoute}${encodedName}_${version}`;
    const body = encodeURIComponent(
      Buffer.from(inner, "ascii").toString("base64"),
    );
    return {
      method: "POST",
      path: `/${routes.mainRoute}`,
      body,
    };
  }

  if (protocol.version && protocol.key) {
    const encodedName = encodeURIComponent(schoolName);
    const token = Buffer.from(
      `${routes.searchRoute}${encodedName}_${protocol.version}`,
      "ascii",
    ).toString("base64");
    return {
      method: "GET",
      path: `/${routes.mainRoute}?${encodeURIComponent(token)}`,
    };
  }

  const encoded = iconv.encode(schoolName, "euc-kr");
  let binary = "";
  for (const byte of encoded) {
    binary += `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  return {
    method: "GET",
    path: `/${routes.mainRoute}?${routes.searchRoute}l${binary}`,
  };
}

export function buildTimetableRequest(
  session: ComciganSession,
  schoolCode: number,
  weekIndex = 1,
): ComciganApiRequest {
  const { routes, protocol } = session;
  if (protocol.apiStyle === "post-plain") {
    const version = protocol.version ?? "8701";
    const prefix = protocol.timetablePrefix ?? `${routes.timetableRoute}_`;
    const body = Buffer.from(
      `${prefix}${schoolCode}_0_${weekIndex}_${version}`,
      "utf8",
    ).toString("base64");
    return {
      method: "POST",
      path: `/${routes.mainRoute}`,
      body,
    };
  }

  const suffix = protocol.version ? `_${protocol.version}` : "";
  const param = Buffer.from(
    `${routes.timetableRoute}_${schoolCode}_0_${weekIndex}${suffix}`,
    "utf8",
  ).toString("base64");
  return {
    method: "GET",
    path: `/${routes.mainRoute}?${param}`,
  };
}

/** @deprecated use buildSchoolSearchRequest */
export function encodeSchoolSearchPath(
  session: ComciganSession,
  schoolName: string,
): string {
  const req = buildSchoolSearchRequest(session, schoolName);
  if (req.method === "POST") {
    return req.path;
  }
  return req.path;
}

/** @deprecated use buildTimetableRequest */
export function encodeTimetablePath(
  session: ComciganSession,
  schoolCode: number,
  weekIndex = 1,
): string {
  return buildTimetableRequest(session, schoolCode, weekIndex).path;
}

export { BASE as COMCI_BASE_URL };