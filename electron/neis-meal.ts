import { net } from "electron";

type NeisSettings = {
  neisApiKey: string;
  neisOfficeCode: string;
  neisSchoolCode: string;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

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
      throw new Error("급식 요청 시간 초과(15초).");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchTodayMeal(
  settings: NeisSettings,
): Promise<{ ok: true; lines: string[] } | { ok: false; error: string }> {
  const { neisApiKey, neisOfficeCode, neisSchoolCode } = settings;
  if (!neisApiKey?.trim() || !neisOfficeCode?.trim() || !neisSchoolCode?.trim()) {
    return {
      ok: false,
      error: "설정에서 NEIS API 키·교육청·학교 코드를 입력한 뒤 «설정 저장»을 누르세요.",
    };
  }

  const params = new URLSearchParams({
    KEY: neisApiKey.trim(),
    Type: "json",
    pIndex: "1",
    pSize: "10",
    ATPT_OFCDC_SC_CODE: neisOfficeCode.trim(),
    SD_SCHUL_CODE: neisSchoolCode.trim(),
    MLSV_YMD: todayYmd(),
  });

  try {
    const json = await fetchJson(
      `https://open.neis.go.kr/hub/mealServiceDietInfo?${params.toString()}`,
    );
    const root = json as {
      mealServiceDietInfo?: [{ head?: unknown[] }, { row?: unknown }];
    };
    const rowRaw = root.mealServiceDietInfo?.[1]?.row;
    const row = Array.isArray(rowRaw) ? rowRaw[0] : rowRaw;
    if (!row || typeof row !== "object") {
      return { ok: false, error: "오늘 급식 정보가 없습니다." };
    }
    const dish = String((row as { DDISH_NM?: string }).DDISH_NM ?? "");
    const lines = dish
      .split("<br/>")
      .map((s) => s.replace(/\(\d+\)/g, "").trim())
      .filter(Boolean);
    if (lines.length === 0) {
      return { ok: false, error: "오늘 급식 정보가 없습니다." };
    }
    return { ok: true, lines };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "급식을 불러오지 못했습니다.";
    return { ok: false, error: msg };
  }
}
