import { net } from "electron";

export type NeisScheduleRow = {
  ymd: string;
  name: string;
  content: string;
};

type NeisSettings = {
  neisApiKey: string;
  neisOfficeCode: string;
  neisSchoolCode: string;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function asRowArray(row: unknown): Record<string, string>[] {
  if (!row) return [];
  if (Array.isArray(row)) return row as Record<string, string>[];
  if (typeof row === "object") return [row as Record<string, string>];
  return [];
}

function neisErrorMessage(json: unknown): string | null {
  const root = json as {
    RESULT?: { CODE?: string; MESSAGE?: string };
    SchoolSchedule?: [{ head?: { RESULT?: { CODE?: string; MESSAGE?: string } }[] }];
  };
  const top = root.RESULT;
  if (
    top?.CODE &&
    top.CODE !== "INFO-000" &&
    top.CODE !== "INFO-200"
  ) {
    return top.MESSAGE || `NEIS 오류 (${top.CODE})`;
  }
  const heads = root.SchoolSchedule?.[0]?.head;
  if (Array.isArray(heads)) {
    for (const h of heads) {
      const R = h.RESULT;
      if (
        R?.CODE &&
        R.CODE !== "INFO-000" &&
        R.CODE !== "INFO-200"
      ) {
        return R.MESSAGE || `NEIS 오류 (${R.CODE})`;
      }
    }
  }
  return null;
}

function parsePage(json: unknown): {
  rows: NeisScheduleRow[];
  total: number;
} {
  const err = neisErrorMessage(json);
  if (err) throw new Error(err);

  const root = json as {
    SchoolSchedule?: [
      { head?: { list_total_count?: number }[] },
      { row?: unknown },
    ];
  };
  const head0 = root.SchoolSchedule?.[0]?.head?.[0];
  const total =
    typeof head0?.list_total_count === "number"
      ? head0.list_total_count
      : 0;
  const raw = root.SchoolSchedule?.[1]?.row;
  const rows = asRowArray(raw).map((r) => ({
    ymd: String(r.AA_YMD ?? ""),
    name: String(r.EVENT_NM ?? "").trim(),
    content: String(r.EVENT_CNTNT ?? "").trim(),
  }));
  return { rows, total: total || rows.length };
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await net.fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": UA },
    });
    if (!res.ok) {
      throw new Error(`NEIS HTTP ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("NEIS 요청 시간 초과(15초). 네트워크·프록시를 확인하세요.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function buildUrl(
  settings: NeisSettings,
  fromYmd: string,
  toYmd: string,
  pSize: number,
): string {
  const params = new URLSearchParams({
    KEY: settings.neisApiKey,
    Type: "json",
    pIndex: "1",
    pSize: String(pSize),
    ATPT_OFCDC_SC_CODE: settings.neisOfficeCode,
    SD_SCHUL_CODE: settings.neisSchoolCode,
    AA_FROM_YMD: fromYmd,
    AA_TO_YMD: toYmd,
  });
  return `https://open.neis.go.kr/hub/SchoolSchedule?${params.toString()}`;
}

function ymdAdd(ymd: string, days: number): string {
  const y = +ymd.slice(0, 4);
  const m = +ymd.slice(4, 6) - 1;
  const d = +ymd.slice(6, 8);
  const dt = new Date(y, m, d + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`;
}

async function fetchRange(
  settings: NeisSettings,
  fromYmd: string,
  toYmd: string,
  depth: number,
): Promise<NeisScheduleRow[]> {
  const url = buildUrl(settings, fromYmd, toYmd, 1000);
  const json = await fetchJson(url);
  const { rows, total } = parsePage(json);

  if (total <= rows.length || fromYmd === toYmd || depth > 6) {
    return rows;
  }

  const mid = ymdAdd(
    fromYmd,
    Math.floor(
      (new Date(
        +toYmd.slice(0, 4),
        +toYmd.slice(4, 6) - 1,
        +toYmd.slice(6, 8),
      ).getTime() -
        new Date(
          +fromYmd.slice(0, 4),
          +fromYmd.slice(4, 6) - 1,
          +fromYmd.slice(6, 8),
        ).getTime()) /
        86400000 /
        2,
    ),
  );

  const left = await fetchRange(settings, fromYmd, mid, depth + 1);
  const right = await fetchRange(settings, ymdAdd(mid, 1), toYmd, depth + 1);
  return [...left, ...right];
}

export async function fetchSchoolSchedule(
  settings: NeisSettings,
  fromYmd: string,
  toYmd: string,
): Promise<{ ok: true; items: NeisScheduleRow[] } | { ok: false; error: string }> {
  const { neisApiKey, neisOfficeCode, neisSchoolCode } = settings;
  if (!neisApiKey?.trim() || !neisOfficeCode?.trim() || !neisSchoolCode?.trim()) {
    return {
      ok: false,
      error: "학교를 선택했는지 확인하세요. NEIS 키가 필요하면 설정에서 본인 키를 입력할 수 있습니다.",
    };
  }

  try {
    const raw = await fetchRange(
      {
        neisApiKey: neisApiKey.trim(),
        neisOfficeCode: neisOfficeCode.trim(),
        neisSchoolCode: neisSchoolCode.trim(),
      },
      fromYmd,
      toYmd,
      0,
    );

    const seen = new Set<string>();
    const items = raw
      .filter((r) => r.name && r.name !== "토요휴업일")
      .filter((r) => {
        const k = `${r.ymd}|${r.name}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a, b) => a.ymd.localeCompare(b.ymd));

    return { ok: true, items };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "학사일정을 불러오지 못했습니다.";
    return { ok: false, error: msg };
  }
}
