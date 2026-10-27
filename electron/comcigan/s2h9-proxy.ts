const DEFAULT_BASE = "https://timetable.s2h9.dev";

export function normalizeS2h9BaseUrl(raw: string | undefined): string {
  const trimmed = (raw ?? DEFAULT_BASE).trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_BASE;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return DEFAULT_BASE;
  }
  if (url.protocol !== "https:") return DEFAULT_BASE;
  return url.origin;
}

export type S2h9Session = {
  baseUrl: string;
  csrfToken: string;
  cookieHeader: string;
};

export async function openS2h9Session(
  baseUrlInput?: string,
): Promise<S2h9Session> {
  const baseUrl = normalizeS2h9BaseUrl(baseUrlInput);
  const home = await fetch(`${baseUrl}/`, {
    headers: {
      "User-Agent": "Mozilla/5.0 SchoolUtil",
    },
    redirect: "follow",
  });
  if (!home.ok) {
    throw new Error(`s2h9 사이트에 연결하지 못했습니다. (${home.status})`);
  }
  const html = await home.text();
  const csrf = html.match(/csrfToken":"([^"]+)/)?.[1] ?? "";
  if (!csrf) {
    throw new Error("s2h9 보안 토큰을 받지 못했습니다.");
  }
  const setCookie = home.headers.getSetCookie?.() ?? [];
  const cookieHeader = setCookie.map((c) => c.split(";")[0]).join("; ");
  return { baseUrl, csrfToken: csrf, cookieHeader };
}

export async function pingS2h9School(
  session: S2h9Session,
  schoolCode: string,
): Promise<{ ok: true; bytes: number } | { ok: false; error: string }> {
  const code = schoolCode.trim();
  if (!/^\d{4,7}$/.test(code)) {
    return { ok: false, error: "학교 코드가 올바르지 않습니다." };
  }
  const url = `${session.baseUrl}/api/getalltimetable?schoolCode=${code}&period=1`;
  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/x-protobuf,application/json",
        "x-csrf-token": session.csrfToken,
        Referer: `${session.baseUrl}/`,
        Cookie: session.cookieHeader,
        "User-Agent": "Mozilla/5.0 SchoolUtil",
      },
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `s2h9 시간표 요청 실패 (${res.status})`,
      };
    }
    const buf = await res.arrayBuffer();
    return { ok: true, bytes: buf.byteLength };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "네트워크 오류";
    return { ok: false, error: msg };
  }
}

/** protobuf 바이너리에서 마스킹된 교사 이름(예: 김○*) 추출 */
export function listTeachersFromS2h9Buffer(buf: ArrayBuffer): string[] {
  const text = Buffer.from(buf).toString("utf8");
  const found = [...text.matchAll(/[\uAC00-\uD7A3]{1,3}\*/g)].map((m) => m[0]);
  return [...new Set(found)].sort((a, b) => a.localeCompare(b, "ko"));
}

export async function listS2h9Teachers(
  schoolCode: string,
  baseUrlInput?: string,
): Promise<string[]> {
  const session = await openS2h9Session(baseUrlInput);
  const ping = await pingS2h9School(session, schoolCode);
  if (!ping.ok) {
    throw new Error(ping.error);
  }
  const url = `${session.baseUrl}/api/getalltimetable?schoolCode=${schoolCode.trim()}&period=1`;
  const res = await fetch(url, {
    headers: {
      accept: "application/x-protobuf",
      "x-csrf-token": session.csrfToken,
      Referer: `${session.baseUrl}/`,
      Cookie: session.cookieHeader,
      "User-Agent": "Mozilla/5.0 SchoolUtil",
    },
  });
  if (!res.ok) {
    throw new Error(`s2h9 교사 목록을 받지 못했습니다. (${res.status})`);
  }
  return listTeachersFromS2h9Buffer(await res.arrayBuffer());
}
