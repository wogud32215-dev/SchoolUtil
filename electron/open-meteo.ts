import { net } from "electron";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type WeatherSnapshot = {
  temp: number | null;
  code: number | null;
  wind: number | null;
};

export async function fetchCurrentWeather(
  lat: number,
  lon: number,
): Promise<{ ok: true; data: WeatherSnapshot } | { ok: false; error: string }> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { ok: false, error: "날씨 좌표가 올바르지 않습니다." };
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=Asia%2FSeoul`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await net.fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": UA },
    });
    if (!res.ok) {
      return { ok: false, error: `날씨 HTTP ${res.status}` };
    }
    const json = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
    };
    const c = json.current;
    return {
      ok: true,
      data: {
        temp: typeof c?.temperature_2m === "number" ? c.temperature_2m : null,
        code: typeof c?.weather_code === "number" ? c.weather_code : null,
        wind: typeof c?.wind_speed_10m === "number" ? c.wind_speed_10m : null,
      },
    };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, error: "날씨 요청 시간 초과(15초)." };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "날씨를 불러오지 못했습니다.",
    };
  } finally {
    clearTimeout(timer);
  }
}
