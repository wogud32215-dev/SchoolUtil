import { net } from "electron";
import type {
  WeatherDailyRow,
  WeatherForecastData,
  WeatherHourlyRow,
  WeatherSnapshot,
} from "../src/types/weather";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type { WeatherSnapshot, WeatherForecastData };

function seoulYmd(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    now,
  );
}

function numAt(arr: unknown, i: number): number | null {
  if (!Array.isArray(arr)) return null;
  const v = arr[i];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

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

export async function fetchWeatherForecast(
  lat: number,
  lon: number,
): Promise<
  { ok: true; data: WeatherForecastData } | { ok: false; error: string }
> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { ok: false, error: "날씨 좌표가 올바르지 않습니다." };
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,weather_code,wind_speed_10m" +
    "&hourly=temperature_2m,weather_code,precipitation_probability" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
    "&timezone=Asia%2FSeoul&forecast_days=7";

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
      hourly?: {
        time?: string[];
        temperature_2m?: number[];
        weather_code?: number[];
        precipitation_probability?: number[];
      };
      daily?: {
        time?: string[];
        weather_code?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
      };
    };

    const c = json.current;
    const current: WeatherSnapshot = {
      temp: typeof c?.temperature_2m === "number" ? c.temperature_2m : null,
      code: typeof c?.weather_code === "number" ? c.weather_code : null,
      wind: typeof c?.wind_speed_10m === "number" ? c.wind_speed_10m : null,
    };

    const today = seoulYmd();
    const hourlyTimes = json.hourly?.time ?? [];
    const hourlyToday: WeatherHourlyRow[] = [];
    for (let i = 0; i < hourlyTimes.length; i++) {
      const raw = hourlyTimes[i];
      if (typeof raw !== "string" || !raw.startsWith(today)) continue;
      const timePart = raw.includes("T") ? raw.split("T")[1] : raw;
      const hh = timePart.slice(0, 5);
      hourlyToday.push({
        time: hh.length === 5 ? hh : timePart,
        temp: numAt(json.hourly?.temperature_2m, i),
        code: numAt(json.hourly?.weather_code, i),
        precipProbability: numAt(json.hourly?.precipitation_probability, i),
      });
    }

    const dailyTimes = json.daily?.time ?? [];
    const daily: WeatherDailyRow[] = [];
    for (let i = 0; i < dailyTimes.length; i++) {
      const date = dailyTimes[i];
      if (typeof date !== "string") continue;
      daily.push({
        date,
        tempMin: numAt(json.daily?.temperature_2m_min, i),
        tempMax: numAt(json.daily?.temperature_2m_max, i),
        code: numAt(json.daily?.weather_code, i),
      });
    }

    return { ok: true, data: { current, hourlyToday, daily } };
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
