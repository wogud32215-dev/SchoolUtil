import { net } from "electron";
import type { WeatherGeocodePlace } from "../src/types/weather";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const MIN_QUERY = 2;
const MAX_QUERY = 80;

export async function searchPlaces(
  query: string,
): Promise<
  { ok: true; places: WeatherGeocodePlace[] } | { ok: false; error: string }
> {
  const q = query.trim();
  if (q.length < MIN_QUERY) {
    return { ok: false, error: "지역 이름을 두 글자 이상 입력하세요." };
  }
  if (q.length > MAX_QUERY) {
    return { ok: false, error: "검색어가 너무 깁니다." };
  }

  const params = new URLSearchParams({
    name: q,
    count: "10",
    language: "ko",
    countryCode: "KR",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await net.fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
      {
        signal: controller.signal,
        headers: { "User-Agent": UA },
      },
    );
    if (!res.ok) {
      return { ok: false, error: `지역 검색 HTTP ${res.status}` };
    }
    const json = (await res.json()) as {
      results?: {
        name?: string;
        latitude?: number;
        longitude?: number;
        admin1?: string;
        country?: string;
        country_code?: string;
      }[];
    };

    const places: WeatherGeocodePlace[] = [];
    for (const row of json.results ?? []) {
      const lat = row.latitude;
      const lon = row.longitude;
      if (typeof lat !== "number" || typeof lon !== "number") continue;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const name = String(row.name ?? "").trim();
      if (!name) continue;
      places.push({
        name,
        lat,
        lon,
        admin1: String(row.admin1 ?? "").trim(),
        country: String(row.country ?? row.country_code ?? "").trim(),
      });
    }

    if (places.length === 0) {
      return { ok: false, error: "검색 결과가 없습니다. 다른 이름으로 시도해 보세요." };
    }

    return { ok: true, places };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, error: "지역 검색 시간 초과(15초)." };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "지역 검색에 실패했습니다.",
    };
  } finally {
    clearTimeout(timer);
  }
}
