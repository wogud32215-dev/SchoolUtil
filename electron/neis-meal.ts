import { net } from "electron";

type NeisSettings = {
  neisApiKey: string;
  neisOfficeCode: string;
  neisSchoolCode: string;
};

export type NeisMealItem = {
  name: string;
  allergies: string[];
};

export type NeisMealDay = {
  ymd: string;
  mealName: string;
  items: NeisMealItem[];
  lines: string[];
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const DEFAULT_RANGE_DAYS = 30;
const PAGE_SIZE = 100;

function localYmd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function addDaysYmd(ymd: string, days: number): string {
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(4, 6)) - 1;
  const d = Number(ymd.slice(6, 8));
  const dt = new Date(y, m, d);
  dt.setDate(dt.getDate() + days);
  return localYmd(dt);
}

function parseDishItem(raw: string): NeisMealItem | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(.+?)\s*\(([\d.]+)\)\s*$/);
  if (match) {
    const allergies = match[2]
      .split(".")
      .map((s) => s.trim())
      .filter(Boolean);
    return { name: match[1].trim(), allergies };
  }
  return { name: trimmed, allergies: [] };
}

function parseDishItems(dish: string): NeisMealItem[] {
  return dish
    .split("<br/>")
    .map((s) => parseDishItem(s))
    .filter((item): item is NeisMealItem => item !== null);
}

function asRowArray(row: unknown): Record<string, string>[] {
  if (!row) return [];
  if (Array.isArray(row)) return row as Record<string, string>[];
  if (typeof row === "object") return [row as Record<string, string>];
  return [];
}

function mealApiError(json: unknown): string | null {
  const root = json as {
    RESULT?: { CODE?: string; MESSAGE?: string };
    mealServiceDietInfo?: [{ head?: { RESULT?: { CODE?: string; MESSAGE?: string } }[] }];
  };
  const top = root.RESULT;
  if (top?.CODE && top.CODE !== "INFO-000" && top.CODE !== "INFO-200") {
    return top.MESSAGE || `NEIS 오류 (${top.CODE})`;
  }
  const heads = root.mealServiceDietInfo?.[0]?.head;
  if (Array.isArray(heads)) {
    for (const h of heads) {
      const R = h.RESULT;
      if (R?.CODE && R.CODE !== "INFO-000" && R.CODE !== "INFO-200") {
        return R.MESSAGE || `NEIS 오류 (${R.CODE})`;
      }
    }
  }
  return null;
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await net.fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": UA },
    });
    if (!res.ok) throw new Error(`NEIS HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("급식 요청 시간 초과(20초).");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function parseMealPage(json: unknown): { rows: NeisMealDay[]; total: number } {
  const err = mealApiError(json);
  if (err) throw new Error(err);

  const root = json as {
    mealServiceDietInfo?: [
      { head?: { list_total_count?: number }[] },
      { row?: unknown },
    ];
  };
  const head0 = root.mealServiceDietInfo?.[0]?.head?.[0];
  const total =
    typeof head0?.list_total_count === "number"
      ? head0.list_total_count
      : 0;
  const raw = root.mealServiceDietInfo?.[1]?.row;
  const rows = asRowArray(raw)
    .map((r) => {
      const ymd = String(r.MLSV_YMD ?? "").trim();
      const dish = String(r.DDISH_NM ?? "");
      const items = parseDishItems(dish);
      const lines = items.map((i) => i.name);
      const mealName =
        String(r.MMEAL_SC_NM ?? "").trim() ||
        mealNameFromCode(String(r.MMEAL_SC_CODE ?? "").trim());
      return { ymd, mealName, items, lines };
    })
    .filter((r) => r.ymd && r.items.length > 0);

  return { rows, total: total || rows.length };
}

function mealNameFromCode(code: string): string {
  if (code === "1") return "조식";
  if (code === "2") return "중식";
  if (code === "3") return "석식";
  return "급식";
}

function sortMeals(days: NeisMealDay[]): NeisMealDay[] {
  const order = (name: string) => {
    if (name.includes("조")) return 1;
    if (name.includes("중")) return 2;
    if (name.includes("석")) return 3;
    return 4;
  };
  return [...days].sort((a, b) => {
    const d = a.ymd.localeCompare(b.ymd);
    if (d !== 0) return d;
    return order(a.mealName) - order(b.mealName);
  });
}

async function fetchMealRangePage(
  settings: NeisSettings,
  fromYmd: string,
  toYmd: string,
  page: number,
): Promise<{ rows: NeisMealDay[]; total: number }> {
  const params = new URLSearchParams({
    KEY: settings.neisApiKey.trim(),
    Type: "json",
    pIndex: String(page),
    pSize: String(PAGE_SIZE),
    ATPT_OFCDC_SC_CODE: settings.neisOfficeCode.trim(),
    SD_SCHUL_CODE: settings.neisSchoolCode.trim(),
    MLSV_FROM_YMD: fromYmd,
    MLSV_TO_YMD: toYmd,
  });
  const json = await fetchJson(
    `https://open.neis.go.kr/hub/mealServiceDietInfo?${params.toString()}`,
  );
  return parseMealPage(json);
}

export async function fetchMeals(
  settings: NeisSettings,
  fromYmd?: string,
  toYmd?: string,
): Promise<{ ok: true; days: NeisMealDay[] } | { ok: false; error: string }> {
  const { neisApiKey, neisOfficeCode, neisSchoolCode } = settings;
  if (!neisApiKey?.trim() || !neisOfficeCode?.trim() || !neisSchoolCode?.trim()) {
    return {
      ok: false,
      error: "학교를 선택했는지 확인하세요. NEIS 키가 필요하면 설정에서 본인 키를 입력할 수 있습니다.",
    };
  }

  const from = (fromYmd?.trim() || localYmd()).slice(0, 8);
  const to = (toYmd?.trim() || addDaysYmd(from, DEFAULT_RANGE_DAYS - 1)).slice(
    0,
    8,
  );
  if (from.length !== 8 || to.length !== 8 || from > to) {
    return { ok: false, error: "급식 조회 날짜가 올바르지 않습니다." };
  }

  try {
    const all: NeisMealDay[] = [];
    let page = 1;
    let total = 0;
    do {
      const { rows, total: t } = await fetchMealRangePage(
        settings,
        from,
        to,
        page,
      );
      total = t;
      all.push(...rows);
      if (rows.length === 0) break;
      page += 1;
    } while (all.length < total && page <= 20);

    const days = sortMeals(all);
    if (days.length === 0) {
      return {
        ok: false,
        error: "이 기간에 등록된 급식이 없습니다.",
      };
    }
    return { ok: true, days };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "급식을 불러오지 못했습니다.";
    return { ok: false, error: msg };
  }
}

/** 오늘만 (기존 호출 호환) */
export async function fetchTodayMeal(
  settings: NeisSettings,
): Promise<{ ok: true; lines: string[] } | { ok: false; error: string }> {
  const today = localYmd();
  const res = await fetchMeals(settings, today, today);
  if (!res.ok) return res;
  const lines = res.days.flatMap((d) => d.lines);
  if (lines.length === 0) {
    return { ok: false, error: "오늘 급식 정보가 없습니다." };
  }
  return { ok: true, lines };
}
