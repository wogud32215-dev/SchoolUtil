import { useCallback, useEffect, useState } from "react";
import {
  WidgetFetchError,
  WidgetLoading,
} from "@/components/WidgetFetchState";
import type { AppSettings } from "@/types/state";

const WMO: Record<number, string> = {
  0: "맑음",
  1: "대체로 맑음",
  2: "구름 조금",
  3: "흐림",
  45: "안개",
  48: "안개",
  51: "이슬비",
  61: "비",
  71: "눈",
  80: "소나기",
  95: "뇌우",
};

type WeatherState = {
  loading: boolean;
  error: string | null;
  temp: number | null;
  code: number | null;
  wind: number | null;
};

type Props = {
  settings: AppSettings;
};

export function WeatherWidget({ settings }: Props) {
  const [data, setData] = useState<WeatherState>({
    loading: true,
    error: null,
    temp: null,
    code: null,
    wind: null,
  });

  const load = useCallback(async () => {
    setData((d) => ({ ...d, loading: true, error: null }));
    const api = window.schoolUtil;
    if (api?.fetchWeather) {
      const res = await api.fetchWeather();
      if (res.ok) {
        setData({
          loading: false,
          error: null,
          temp: res.data.temp,
          code: res.data.code,
          wind: res.data.wind,
        });
      } else {
        setData({
          loading: false,
          error: res.error,
          temp: null,
          code: null,
          wind: null,
        });
      }
      return;
    }
    setData({
      loading: false,
      error: "Electron 앱에서만 날씨를 불러올 수 있습니다.",
      temp: null,
      code: null,
      wind: null,
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load, settings.weatherLat, settings.weatherLon]);

  if (data.loading) {
    return <WidgetLoading label="날씨 불러오는 중…" />;
  }
  if (data.error) {
    return (
      <WidgetFetchError message={data.error} onRetry={() => void load()} />
    );
  }

  const desc =
    data.code != null ? (WMO[data.code] ?? `코드 ${data.code}`) : "—";

  return (
    <div className="weather-widget">
      <div className="weather-temp">
        {data.temp != null ? `${data.temp}°C` : "—"}
      </div>
      <div className="weather-place">{settings.weatherLabel || "지역"}</div>
      <div className="weather-desc">{desc}</div>
      {data.wind != null && (
        <div className="weather-meta">풍속 {data.wind} km/h</div>
      )}
    </div>
  );
}
