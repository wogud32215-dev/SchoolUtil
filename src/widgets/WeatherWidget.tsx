import { useCallback, useEffect, useState } from "react";
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

  if (data.loading) return <p className="muted">불러오는 중…</p>;
  if (data.error) {
    return (
      <div>
        <p className="muted">{data.error}</p>
        <button type="button" className="btn-primary" onClick={() => void load()}>
          다시 불러오기
        </button>
      </div>
    );
  }

  const desc =
    data.code != null ? (WMO[data.code] ?? `코드 ${data.code}`) : "—";

  return (
    <div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
        {data.temp != null ? `${data.temp}°C` : "—"}
      </div>
      <div>{settings.weatherLabel}</div>
      <div className="muted">{desc}</div>
      {data.wind != null && (
        <div className="muted">풍속 {data.wind} km/h</div>
      )}
    </div>
  );
}
