import { useState } from "react";
import type { WeatherGeocodePlace } from "@/types/weather";
import { formatGeocodeLabel } from "@/utils/weatherGeocode";

type Props = {
  onPick: (place: WeatherGeocodePlace, label: string) => void;
};

export function WeatherPlaceSearch({ onPick }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<WeatherGeocodePlace[]>([]);

  async function search() {
    setLoading(true);
    setError(null);
    setResults([]);
    const api = window.schoolUtil;
    if (!api?.searchWeatherPlaces) {
      setError("Electron 앱에서만 지역 검색을 할 수 있습니다.");
      setLoading(false);
      return;
    }
    const res = await api.searchWeatherPlaces(query);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResults(res.places);
  }

  function pick(place: WeatherGeocodePlace) {
    onPick(place, formatGeocodeLabel(place));
    setResults([]);
    setError(null);
  }

  return (
    <div className="settings-weather-search">
      <p className="muted" style={{ margin: "0 0 8px" }}>
        동·역·구 이름으로 검색한 뒤 목록에서 선택하면 좌표가 채워집니다.
      </p>
      <div className="input-row">
        <input
          className="settings-control"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 역삼동, 강남역"
          onKeyDown={(e) => {
            if (e.key === "Enter") void search();
          }}
        />
        <button
          type="button"
          className="btn-primary"
          disabled={loading || query.trim().length < 2}
          onClick={() => void search()}
        >
          {loading ? "검색 중…" : "지역 검색"}
        </button>
      </div>
      {error && <p className="sched-error">{error}</p>}
      {results.length > 0 && (
        <ul className="school-search-list">
          {results.map((p) => {
            const label = formatGeocodeLabel(p);
            const key = `${p.lat}-${p.lon}-${p.name}`;
            return (
              <li key={key}>
                <button type="button" className="school-pick" onClick={() => pick(p)}>
                  <strong>{label}</strong>
                  <span className="muted">
                    {p.lat.toFixed(4)}, {p.lon.toFixed(4)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
