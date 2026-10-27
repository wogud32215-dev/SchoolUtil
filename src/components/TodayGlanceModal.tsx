import { useEffect, useMemo, useState } from "react";
import type { PersistedState } from "@/types/state";
import {
  buildTodayGlanceSyncContent,
  closingLineForDay,
  formatTodayGlanceDate,
  localYmd,
  resolveTodayGlanceSettings,
  sectionEnabled,
  todayGlanceGreeting,
} from "@/utils/todayGlance";
import { wmoLabel } from "@/utils/weatherWmo";

type Props = {
  open: boolean;
  state: PersistedState;
  previewEmpty?: boolean;
  onClose: () => void;
  onDismissToday: () => void;
};

type FetchExtras = {
  mealLines: string[];
  mealLoading: boolean;
  weatherText: string | null;
  weatherLoading: boolean;
};

export function TodayGlanceModal({
  open,
  state,
  previewEmpty,
  onClose,
  onDismissToday,
}: Props) {
  const glance = resolveTodayGlanceSettings(state.settings);
  const sections = glance.todayGlanceSections;
  const fontSize = glance.todayGlanceFontSize;
  const settings = state.settings;
  const sync = useMemo(
    () => buildTodayGlanceSyncContent(state),
    [state],
  );
  const todayYmd = localYmd();
  const closing = closingLineForDay(todayYmd, settings.schoolName);

  const [extras, setExtras] = useState<FetchExtras>({
    mealLines: [],
    mealLoading: false,
    weatherText: null,
    weatherLoading: false,
  });

  useEffect(() => {
    if (!open) return;
    const api = window.schoolUtil;
    let cancelled = false;

    async function loadMeal() {
      if (!sectionEnabled(sections, "meal") || !api?.fetchNeisMeal) {
        setExtras((e) => ({ ...e, mealLines: [], mealLoading: false }));
        return;
      }
      setExtras((e) => ({ ...e, mealLoading: true }));
      const todayNeis = new Date();
      const y = todayNeis.getFullYear();
      const m = String(todayNeis.getMonth() + 1).padStart(2, "0");
      const d = String(todayNeis.getDate()).padStart(2, "0");
      const ymd = `${y}${m}${d}`;
      const res = await api.fetchNeisMeal({ fromYmd: ymd, toYmd: ymd });
      if (cancelled) return;
      setExtras((e) => ({
        ...e,
        mealLoading: false,
        mealLines: res.ok ? res.days.flatMap((day) => day.lines) : [],
      }));
    }

    async function loadWeather() {
      if (!sectionEnabled(sections, "weather") || !api?.fetchWeather) {
        setExtras((e) => ({ ...e, weatherText: null, weatherLoading: false }));
        return;
      }
      setExtras((e) => ({ ...e, weatherLoading: true }));
      const res = await api.fetchWeather();
      if (cancelled) return;
      const temp = res.ok ? res.data.temp : null;
      if (!res.ok || temp === null) {
        setExtras((e) => ({ ...e, weatherLoading: false, weatherText: null }));
        return;
      }
      const label = settings.weatherLabel || "날씨";
      const code = res.data.code;
      const desc = wmoLabel(code);
      setExtras((e) => ({
        ...e,
        weatherLoading: false,
        weatherText: `${label} ${Math.round(temp)}° · ${desc}`,
      }));
    }

    void loadMeal();
    void loadWeather();

    return () => {
      cancelled = true;
    };
  }, [open, sections, settings.weatherLabel]);

  if (!open) return null;

  const sizeClass =
    fontSize === "xlarge"
      ? "today-glance--xlarge"
      : fontSize === "normal"
        ? "today-glance--normal"
        : "today-glance--large";

  const showTodos =
    sectionEnabled(sections, "todos") &&
    (sync.todos.items.length > 0 || sync.todos.moreCount > 0);
  const showClasses =
    sectionEnabled(sections, "timetable") && sync.classes.length > 0;
  const showMeal =
    sectionEnabled(sections, "meal") &&
    (extras.mealLoading || extras.mealLines.length > 0);
  const showCalendar =
    sectionEnabled(sections, "calendar") && sync.calendar.length > 0;
  const showDday = sectionEnabled(sections, "dday") && sync.ddays.length > 0;
  const showMemo =
    sectionEnabled(sections, "memo") && sync.memos.length > 0;
  const showWeather =
    sectionEnabled(sections, "weather") &&
    (extras.weatherLoading || extras.weatherText);

  const anySection =
    showTodos ||
    showClasses ||
    showMeal ||
    showCalendar ||
    showDday ||
    showMemo ||
    showWeather;

  return (
    <div
      className="today-glance-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`today-glance-modal ${sizeClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="today-glance-title"
      >
        <header className="today-glance-header">
          <p className="today-glance-brand" id="today-glance-title">제일 메이트</p>
          <p className="today-glance-greeting">
            {todayGlanceGreeting()}
          </p>
          <p className="today-glance-date">{formatTodayGlanceDate()}</p>
        </header>

        <div className="today-glance-body">
          {previewEmpty && !anySection ? (
            <p className="today-glance-empty">
              고른 칸에 오늘 보여 줄 내용이 없습니다. 할 일·시간표·일정을
              채우거나 설정에서 보일 칸을 바꿔 보세요.
            </p>
          ) : null}

          {showTodos ? (
            <section className="today-glance-section">
              <h3>오늘 할 일</h3>
              <ul>
                {sync.todos.items.map((t) => (
                  <li key={t.id} className="today-glance-strong">
                    {t.text}
                  </li>
                ))}
              </ul>
              {sync.todos.moreCount > 0 ? (
                <p className="today-glance-more">
                  그 밖에 {sync.todos.moreCount}개
                </p>
              ) : null}
            </section>
          ) : null}

          {showClasses ? (
            <section className="today-glance-section">
              <h3>오늘 수업</h3>
              <ul>
                {sync.classes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {showMeal ? (
            <section className="today-glance-section">
              <h3>오늘 급식</h3>
              {extras.mealLoading ? (
                <p className="today-glance-muted">불러오는 중…</p>
              ) : (
                <ul>
                  {extras.mealLines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {showCalendar ? (
            <section className="today-glance-section">
              <h3>오늘 일정</h3>
              <ul>
                {sync.calendar.map((ev) => (
                  <li key={ev.id}>
                    {ev.time ? `${ev.time} ` : ""}
                    {ev.title}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showDday ? (
            <section className="today-glance-section">
              <h3>다가오는 D-Day</h3>
              <ul>
                {sync.ddays.map(({ item, days }) => (
                  <li key={item.id}>
                    {item.title}{" "}
                    <span className="today-glance-dday">
                      {days === 0 ? "D-Day" : `D-${days}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showMemo ? (
            <section className="today-glance-section">
              <h3>메모</h3>
              <ul>
                {sync.memos.map((m) => (
                  <li key={m.id}>{m.preview}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {showWeather ? (
            <section className="today-glance-section">
              <h3>날씨</h3>
              {extras.weatherLoading ? (
                <p className="today-glance-muted">불러오는 중…</p>
              ) : (
                <p>{extras.weatherText}</p>
              )}
            </section>
          ) : null}
        </div>

        <p className="today-glance-footer-line">{closing}</p>

        <footer className="today-glance-actions">
          <button type="button" className="today-glance-btn subtle" onClick={onDismissToday}>
            다시 안 보기
          </button>
          <button type="button" className="today-glance-btn primary" onClick={onClose}>
            닫기
          </button>
        </footer>
        <p className="today-glance-hint">
          설정 → 위젯 탭 «제일 메이트»에서 다시 켤 수 있습니다.
        </p>
      </div>
    </div>
  );
}
