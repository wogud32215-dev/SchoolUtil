import { useState } from "react";
import type { AppSettings, NeisSchoolRow } from "@/types/state";
import {
  formatGeocodeLabel,
  geocodeQueryForSchool,
} from "@/utils/weatherGeocode";

type Props = {
  draft: AppSettings;
  onApply: (partial: Partial<AppSettings>) => void;
};

export function SchoolSearchPanel({ draft, onApply }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<NeisSchoolRow[]>([]);
  const [weatherNote, setWeatherNote] = useState<string | null>(null);

  async function search() {
    setLoading(true);
    setError(null);
    setWeatherNote(null);
    setResults([]);
    const api = window.schoolUtil;
    if (!api?.searchNeisSchools) {
      setError("Electron 앱에서만 학교 검색을 할 수 있습니다.");
      setLoading(false);
      return;
    }
    const res = await api.searchNeisSchools(query, draft.neisApiKey);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResults(res.schools);
    if (res.schools.length === 0) {
      setError("검색 결과가 없습니다. 이름을 바꿔 보세요.");
    }
  }

  async function pick(school: NeisSchoolRow) {
    setWeatherNote(null);
    onApply({
      schoolName: school.name,
      neisOfficeCode: school.officeCode,
      neisSchoolCode: school.schoolCode,
      onboardingDone: true,
    });
    setResults([]);
    setError(null);

    const api = window.schoolUtil;
    if (!api?.searchWeatherPlaces) {
      setWeatherNote("날씨 좌표는 설정에서 직접 지정할 수 있습니다.");
      return;
    }

    const geoQuery = geocodeQueryForSchool(school);
    if (geoQuery.length < 2) {
      setWeatherNote("학교 주소가 없어 날씨 좌표를 자동 설정하지 못했습니다.");
      return;
    }

    const geo = await api.searchWeatherPlaces(geoQuery);
    if (!geo.ok) {
      setWeatherNote(
        geo.error ||
          "날씨 좌표를 찾지 못했습니다. 설정에서 지역 검색을 이용하세요.",
      );
      return;
    }

    const place = geo.places[0];
    onApply({
      weatherLat: place.lat,
      weatherLon: place.lon,
      weatherLabel: formatGeocodeLabel(place),
    });
    setWeatherNote("학교 위치 기준으로 날씨 좌표를 설정했습니다.");
  }

  return (
    <div className="school-search">
      <p className="muted" style={{ margin: "0 0 8px" }}>
        학교 이름만 검색해 선택하면 급식·학사일정 코드와 날씨 좌표가 채워집니다.
      </p>
      <div className="input-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: ○○초등학교"
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
          {loading ? "검색 중…" : "검색"}
        </button>
      </div>
      {draft.schoolName && (
        <p className="muted" style={{ margin: "8px 0 0" }}>
          선택된 학교: <strong>{draft.schoolName}</strong>
        </p>
      )}
      {weatherNote && (
        <p className="muted" style={{ margin: "8px 0 0" }}>
          {weatherNote}
        </p>
      )}
      {error && <p className="sched-error">{error}</p>}
      {results.length > 0 && (
        <ul className="school-search-list">
          {results.map((s) => (
            <li key={`${s.officeCode}-${s.schoolCode}`}>
              <button type="button" className="school-pick" onClick={() => void pick(s)}>
                <strong>{s.name}</strong>
                <span className="muted">
                  {s.kind} · {s.address || s.locationName || "주소 없음"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
