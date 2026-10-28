import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import {
  WidgetEmpty,
  WidgetFetchError,
  WidgetLoading,
} from "@/components/WidgetFetchState";
import { useNeisKeyStatus } from "@/hooks/useNeisKeyStatus";
import type { AppSettings, NeisMealDay } from "@/types/state";
import { WidgetHeaderIcon } from "@/components/WidgetHeaderIcon";
import {
  addDaysYmd,
  localNeisYmd,
  mealWidgetTitle,
} from "@/utils/mealDisplay";

type Props = {
  settings: AppSettings;
};

const RANGE_HALF = 15;

function mergeMealDays(existing: NeisMealDay[], incoming: NeisMealDay[]): NeisMealDay[] {
  const map = new Map<string, NeisMealDay>();
  for (const day of existing) {
    map.set(`${day.ymd}|${day.mealName}`, day);
  }
  for (const day of incoming) {
    map.set(`${day.ymd}|${day.mealName}`, day);
  }
  return [...map.values()].sort((a, b) => {
    const d = a.ymd.localeCompare(b.ymd);
    if (d !== 0) return d;
    return a.mealName.localeCompare(b.mealName);
  });
}

export function MealWidget({ settings }: Props) {
  const { neisReady } = useNeisKeyStatus();
  const [selectedYmd, setSelectedYmd] = useState(() => localNeisYmd());
  const [allDays, setAllDays] = useState<NeisMealDay[]>([]);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRange = useCallback(
    async (centerYmd: string) => {
      const api = window.schoolUtil;
      if (!api?.fetchNeisMeal) {
        setError("Electron 앱에서만 급식을 불러올 수 있습니다.");
        setAllDays([]);
        return;
      }
      const from = addDaysYmd(centerYmd, -RANGE_HALF);
      const to = addDaysYmd(centerYmd, RANGE_HALF);
      setLoading(true);
      setError(null);
      const res = await api.fetchNeisMeal({ fromYmd: from, toYmd: to });
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRangeFrom(from);
      setRangeTo(to);
      setAllDays((prev) => mergeMealDays(prev, res.days));
    },
    [],
  );

  useEffect(() => {
    setSelectedYmd(localNeisYmd());
    setAllDays([]);
    setRangeFrom("");
    setRangeTo("");
    if (!neisReady) return;
    void fetchRange(localNeisYmd());
  }, [neisReady, settings.neisOfficeCode, settings.neisSchoolCode, fetchRange]);

  useEffect(() => {
    if (!neisReady || !rangeFrom || !rangeTo) return;
    if (selectedYmd < rangeFrom || selectedYmd > rangeTo) {
      void fetchRange(selectedYmd);
    }
  }, [selectedYmd, rangeFrom, rangeTo, neisReady, fetchRange]);

  const mealsForDay = useMemo(
    () => allDays.filter((d) => d.ymd === selectedYmd),
    [allDays, selectedYmd],
  );

  const isToday = selectedYmd === localNeisYmd();

  function goPrev() {
    setSelectedYmd((ymd) => addDaysYmd(ymd, -1));
  }

  function goNext() {
    setSelectedYmd((ymd) => addDaysYmd(ymd, 1));
  }

  function goToday() {
    const today = localNeisYmd();
    setSelectedYmd(today);
  }

  if (!neisReady && !loading && allDays.length === 0) {
    return (
      <WidgetEmpty>
        학교를 선택하면 급식을 볼 수 있습니다.
      </WidgetEmpty>
    );
  }

  function stopGridDrag(e: MouseEvent | PointerEvent) {
    e.stopPropagation();
  }

  return (
    <div className="meal-widget">
      <div className="meal-widget-head">
        <h3
          className="meal-widget-title meal-widget-drag"
          title="드래그해 위치 이동"
        >
          <WidgetHeaderIcon
            id="meal"
            size={14}
            className="widget-header-icon meal-widget-icon"
          />
          {mealWidgetTitle(selectedYmd)}
        </h3>
        <nav className="meal-nav" aria-label="급식 날짜">
          <button
            type="button"
            className="meal-nav-btn"
            onMouseDown={stopGridDrag}
            onPointerDown={stopGridDrag}
            onClick={goPrev}
            aria-label="이전 날"
          >
            ‹
          </button>
          {!isToday ? (
            <button
              type="button"
              className="meal-today-btn"
              onMouseDown={stopGridDrag}
              onPointerDown={stopGridDrag}
              onClick={goToday}
            >
              오늘
            </button>
          ) : null}
          <button
            type="button"
            className="meal-nav-btn"
            onMouseDown={stopGridDrag}
            onPointerDown={stopGridDrag}
            onClick={goNext}
            aria-label="다음 날"
          >
            ›
          </button>
        </nav>
      </div>

      {loading && allDays.length === 0 ? (
        <WidgetLoading label="급식 불러오는 중…" />
      ) : error && mealsForDay.length === 0 ? (
        <WidgetFetchError
          message={error}
          onRetry={() => void fetchRange(selectedYmd)}
        />
      ) : mealsForDay.length === 0 ? (
        <WidgetEmpty>
          {loading ? "불러오는 중…" : "이 날 등록된 급식이 없습니다."}
        </WidgetEmpty>
      ) : (
        <div className="meal-day-view">
          {mealsForDay.map((meal) => (
            <div key={`${meal.ymd}-${meal.mealName}`} className="meal-block">
              {mealsForDay.length > 1 || meal.mealName !== "급식" ? (
                <p className="meal-type">{meal.mealName}</p>
              ) : null}
              <ul className="meal-dish-list">
                {meal.items.map((item, i) => (
                  <li key={i} className="meal-dish-row">
                    <span className="meal-dish-name">{item.name}</span>
                    {item.allergies.length > 0 ? (
                      <span className="meal-allergy-tag">
                        {item.allergies.join(".")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
