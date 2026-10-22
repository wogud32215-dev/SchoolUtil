import { net } from "electron";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type NeisSchoolRow = {
  officeCode: string;
  schoolCode: string;
  name: string;
  address: string;
  kind: string;
};

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await net.fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": UA },
    });
    if (!res.ok) throw new Error(`NEIS HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("학교 검색 시간 초과(15초).");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function asRows(row: unknown): Record<string, string>[] {
  if (!row) return [];
  if (Array.isArray(row)) return row as Record<string, string>[];
  if (typeof row === "object") return [row as Record<string, string>];
  return [];
}

export async function searchSchools(
  apiKey: string,
  query: string,
): Promise<{ ok: true; schools: NeisSchoolRow[] } | { ok: false; error: string }> {
  const key = apiKey.trim();
  const q = query.trim();
  if (!key) {
    return {
      ok: false,
      error: "NEIS API 키를 먼저 입력하고 «설정 저장»을 누르세요.",
    };
  }
  if (q.length < 2) {
    return { ok: false, error: "학교 이름을 두 글자 이상 입력하세요." };
  }

  const params = new URLSearchParams({
    KEY: key,
    Type: "json",
    pIndex: "1",
    pSize: "25",
    SCHUL_NM: q,
  });

  try {
    const json = await fetchJson(
      `https://open.neis.go.kr/hub/schoolInfo?${params.toString()}`,
    );
    const root = json as {
      schoolInfo?: [{ head?: unknown[] }, { row?: unknown }];
      RESULT?: { CODE?: string; MESSAGE?: string };
    };
    const result = root.RESULT;
    if (result?.CODE && result.CODE !== "INFO-000" && result.CODE !== "INFO-200") {
      return {
        ok: false,
        error: result.MESSAGE || `NEIS 오류 (${result.CODE})`,
      };
    }
    const raw = root.schoolInfo?.[1]?.row;
    const schools = asRows(raw)
      .map((r) => ({
        officeCode: String(r.ATPT_OFCDC_SC_CODE ?? "").trim(),
        schoolCode: String(r.SD_SCHUL_CODE ?? "").trim(),
        name: String(r.SCHUL_NM ?? "").trim(),
        address: String(r.ORG_RDNMA ?? r.ORG_RDNDA ?? "").trim(),
        kind: String(r.SCHUL_KND_SC_NM ?? "").trim(),
      }))
      .filter((s) => s.officeCode && s.schoolCode && s.name);
    return { ok: true, schools };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "학교 검색에 실패했습니다.";
    return { ok: false, error: msg };
  }
}
