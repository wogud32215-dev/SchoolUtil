import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  WidgetFetchError,
  WidgetLoading,
} from "@/components/WidgetFetchState";
import type { WeatherForecastData } from "@/types/weather";
import { wmoLabel } from "@/utils/weatherWmo";

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  placeLabel: string;
};

function formatDailyHeading(dateYmd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYmd);
  if (!m) return dateYmd;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  const wd = WEEKDAY_KO[date.getDay()];
  return `${mo}/${d} (${wd})`;
}

export function WeatherDetailModal({ open, onClose, placeLabel }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WeatherForecastData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const api = window.schoolUtil;
    if (!api?.fetchWeatherForecast) {
      setLoading(false);
      setError("Electron 앱에서만 날씨를 불러올 수 있습니다.");
      setData(null);
      return;
    }
    const res = await api.fetchWeatherForecast();
    if (res.ok) {
      setData(res.data);
      setError(null);
    } else {
      setData(null);
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const current = data?.current;
  const desc = wmoLabel(current?.code ?? null);

  return createPortal(
    <div
      className="weather-detail-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="weather-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="weather-detail-title"
      >
        <header className="weather-detail-header">
          <div className="weather-detail-title-block">
            <h2 id="weather-detail-title" className="weather-detail-title">
              {placeLabel || "지역"}
            </h2>
            {!loading && !error && current ? (
              <p className="weather-detail-current">
                <span className="weather-detail-current-temp">
                  {current.temp != null ? `${Math.round(current.temp)}°C` : "—"}
                </span>
                <span className="weather-detail-current-desc">{desc}</span>
                {current.wind != null ? (
                  <span className="weather-detail-current-wind">
                    풍속 {current.wind} km/h
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="weather-detail-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </header>

        <div className="weather-detail-body">
          {loading ? (
            <WidgetLoading label="예보 불러오는 중…" />
          ) : error ? (
            <WidgetFetchError message={error} onRetry={() => void load()} />
          ) : data ? (
            <>
              <section className="weather-detail-section">
                <h3 className="weather-detail-section-title">오늘 시간별</h3>
                {data.hourlyToday.length === 0 ? (
                  <p className="weather-detail-muted">시간별 데이터가 없습니다.</p>
                ) : (
                  <ul className="weather-hourly-list">
                    {data.hourlyToday.map((row) => (
                      <li key={row.time} className="weather-hourly-card">
                        <span className="weather-hourly-time">{row.time}</span>
                        <span className="weather-hourly-temp">
                          {row.temp != null ? `${Math.round(row.temp)}°` : "—"}
                        </span>
                        <span className="weather-hourly-desc">
                          {wmoLabel(row.code)}
                        </span>
                        {row.precipProbability != null &&
                        row.precipProbability > 0 ? (
                          <span className="weather-hourly-precip">
                            {Math.round(row.precipProbability)}%
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="weather-detail-section">
                <h3 className="weather-detail-section-title">주간 (7일)</h3>
                <ul className="weather-daily-list">
                  {data.daily.map((row) => (
                    <li key={row.date} className="weather-daily-row">
                      <span className="weather-daily-date">
                        {formatDailyHeading(row.date)}
                      </span>
                      <span className="weather-daily-desc">
                        {wmoLabel(row.code)}
                      </span>
                      <span className="weather-daily-temps">
                        {row.tempMin != null && row.tempMax != null
                          ? `${Math.round(row.tempMin)}° / ${Math.round(row.tempMax)}°`
                          : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
