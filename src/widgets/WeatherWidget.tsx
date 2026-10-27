import { useCallback, useEffect, useState } from "react";
import { WeatherDetailModal } from "@/components/WeatherDetailModal";
import {
  WidgetFetchError,
  WidgetLoading,
} from "@/components/WidgetFetchState";
import type { AppSettings } from "@/types/state";
import { wmoLabel } from "@/utils/weatherWmo";

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
  const [detailOpen, setDetailOpen] = useState(false);
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

  const desc = wmoLabel(data.code);

  return (
    <>
      <button
        type="button"
        className="weather-widget weather-widget--clickable"
        onClick={() => setDetailOpen(true)}
        aria-label="날씨 상세 보기"
      >
        <div className="weather-temp">
          {data.temp != null ? `${data.temp}°C` : "—"}
        </div>
        <div className="weather-place">{settings.weatherLabel || "지역"}</div>
        <div className="weather-desc">{desc}</div>
        {data.wind != null && (
          <div className="weather-meta">풍속 {data.wind} km/h</div>
        )}
      </button>
      <WeatherDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        placeLabel={settings.weatherLabel}
      />
    </>
  );
}
