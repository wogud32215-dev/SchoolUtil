import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GridLayout, { type Layout } from "react-grid-layout";
import { useDashboardWidth } from "@/hooks/useDashboardWidth";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useWidgetShape } from "@/hooks/useWidgetShape";
import type {
  AppSettings,
  LayoutItem,
  LayoutPreset,
  PersistedState,
} from "@/types/state";
import { CalendarWidget } from "@/widgets/CalendarWidget";
import { ClockWidget } from "@/widgets/ClockWidget";
import { DDayWidget } from "@/widgets/DDayWidget";
import { MealWidget } from "@/widgets/MealWidget";
import { gridMetricsForDensity } from "@/utils/gridDensity";
import {
  DEFAULT_LAYOUT,
  layoutForPreset,
  visibleWidgetIds,
  widgetHeaderLabel,
  type WidgetId,
} from "@/widgets/registry";
import { SchoolScheduleWidget } from "@/widgets/SchoolScheduleWidget";
import { TimetableWidget } from "@/widgets/TimetableWidget";
import { TodoWidget } from "@/widgets/TodoWidget";
import { WeatherWidget } from "@/widgets/WeatherWidget";
import { MemoWidget } from "@/widgets/MemoWidget";
import { WorkPortalWidget } from "@/widgets/WorkPortalWidget";
import { AppSettingsDock } from "@/components/AppSettingsDock";
import { SettingsModal } from "@/components/SettingsModal";
import { SettingsIcon } from "@/components/SettingsIcon";
import { WidgetHeaderIcon } from "@/components/WidgetHeaderIcon";
import { TodayGlanceModal } from "@/components/TodayGlanceModal";
import { ComciganSubstituteModal } from "@/components/ComciganSubstituteModal";
import { timetableSubstituteFingerprint } from "@/utils/timetableSubstitute";
import {
  buildTodayGlanceSyncContent,
  hasTodayGlanceContent,
  localYmd,
  resolveTodayGlanceSettings,
  sectionEnabled,
} from "@/utils/todayGlance";

const WIDGET_INTERACTIVE_SELECTOR =
  ".widget-card, .title-bar, .onboarding-banner, .persist-banner, .app-settings-dock, .settings-modal, .settings-modal-backdrop, .cal-day-modal, .cal-day-modal-backdrop, .today-glance-backdrop, .today-glance-modal, .comcigan-substitute-backdrop, .comcigan-substitute-modal, .tt-manual-editor-backdrop, .tt-manual-editor, .todo-cat-select-menu";

function toGridLayout(
  ids: WidgetId[],
  layout: Record<string, LayoutItem>,
): Layout[] {
  return ids.map((id) => {
    const item = layout[id] ?? DEFAULT_LAYOUT[id];
    return { i: id, ...item };
  });
}

function fromGridLayout(items: Layout[]): Record<string, LayoutItem> {
  const next: Record<string, LayoutItem> = {};
  for (const item of items) {
    next[item.i] = { x: item.x, y: item.y, w: item.w, h: item.h };
  }
  return next;
}

function renderWidgetBody(
  id: WidgetId,
  state: PersistedState,
  patch: (partial: Partial<PersistedState>) => Promise<PersistedState | null>,
) {
  switch (id) {
    case "clock":
      return <ClockWidget />;
    case "weather":
      return <WeatherWidget settings={state.settings} />;
    case "meal":
      return <MealWidget settings={state.settings} />;
    case "calendar":
      return (
        <CalendarWidget
          settings={state.settings}
          todos={state.todos}
          onTodosChange={(todos) => void patch({ todos })}
        />
      );
    case "dday":
      return (
        <DDayWidget
          items={state.ddays}
          onChange={(ddays) => void patch({ ddays })}
        />
      );
    case "memo":
      return (
        <MemoWidget
          memos={state.memos}
          onChange={(memos) => void patch({ memos })}
        />
      );
    case "todo":
      return (
        <TodoWidget
          todos={state.todos}
          onChange={(todos) => void patch({ todos })}
        />
      );
    case "timetable":
      return (
        <TimetableWidget
          data={state.timetable}
          onChange={(timetable) => void patch({ timetable })}
          autoSync={state.settings.timetableAutoSync}
        />
      );
    case "schoolsched":
      return <SchoolScheduleWidget settings={state.settings} />;
    case "workportal":
      return <WorkPortalWidget settings={state.settings} />;
    case "settings":
      return null;
    default:
      return null;
  }
}

export default function App() {
  const { state, ready, patch, persistError, electronOk } = usePersistedState();
  const dashboardMounted = ready && state !== null;
  const { dashboardRef, gridWidth } = useDashboardWidth(dashboardMounted);
  const [bridgeOk, setBridgeOk] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [desktopLayerWarn, setDesktopLayerWarn] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [todayGlanceOpen, setTodayGlanceOpen] = useState(false);
  const [todayGlancePreviewEmpty, setTodayGlancePreviewEmpty] = useState(false);
  const [substituteAlertOpen, setSubstituteAlertOpen] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setBridgeOk(!!window.schoolUtil?.patchState);
  }, [ready]);

  const saveSettings = useCallback(
    async (settings: AppSettings) => {
      const next = await patch({ settings });
      return next !== null;
    },
    [patch],
  );

  const markTodayGlanceShown = useCallback(async () => {
    if (!state) return;
    const today = localYmd();
    if (state.settings.todayGlanceLastShownDate === today) return;
    await patch({
      settings: { ...state.settings, todayGlanceLastShownDate: today },
    });
  }, [patch, state]);

  const closeTodayGlance = useCallback(() => {
    setTodayGlanceOpen(false);
    setTodayGlancePreviewEmpty(false);
    void markTodayGlanceShown();
  }, [markTodayGlanceShown]);

  const dismissSubstituteAlert = useCallback(async () => {
    setSubstituteAlertOpen(false);
    const live = stateRef.current;
    if (!live?.settings.timetableAutoSync) return;
    const key = timetableSubstituteFingerprint(live.timetable);
    if (!key) return;
    if (live.settings.timetableSubstituteNotifiedKey === key) return;
    await patch({
      settings: {
        ...live.settings,
        timetableSubstituteNotifiedKey: key,
      },
    });
  }, [patch]);

  useEffect(() => {
    if (!ready || !state) return;
    if (!state.settings.timetableAutoSync) {
      setSubstituteAlertOpen(false);
      return;
    }
    const key = timetableSubstituteFingerprint(state.timetable);
    if (!key) {
      setSubstituteAlertOpen(false);
      return;
    }
    if (state.settings.timetableSubstituteNotifiedKey === key) return;
    setSubstituteAlertOpen(true);
  }, [
    ready,
    state?.timetable,
    state?.settings.timetableAutoSync,
    state?.settings.timetableSubstituteNotifiedKey,
  ]);

  const previewTodayGlance = useCallback(() => {
    const live = stateRef.current;
    if (!live) return;
    const prefs = resolveTodayGlanceSettings(live.settings);
    const sync = buildTodayGlanceSyncContent(live);
    const hasContent = hasTodayGlanceContent(sync, prefs.todayGlanceSections, {
      mealLines: [],
      weatherOk: false,
    });
    setTodayGlancePreviewEmpty(!hasContent);
    setTodayGlanceOpen(true);
  }, []);

  const glancePrefs = state
    ? resolveTodayGlanceSettings(state.settings)
    : null;

  useEffect(() => {
    if (!ready || !electronOk || !glancePrefs) return;
    if (!glancePrefs.todayGlanceEnabled) return;
    if (glancePrefs.todayGlanceLastShownDate === localYmd()) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const live = stateRef.current;
        if (cancelled || !live) return;
        const prefs = resolveTodayGlanceSettings(live.settings);
        if (!prefs.todayGlanceEnabled) return;
        if (prefs.todayGlanceLastShownDate === localYmd()) return;

        const sync = buildTodayGlanceSyncContent(live);
        const sections = prefs.todayGlanceSections;
        let mealLines: string[] = [];
        let weatherOk = false;
        const api = window.schoolUtil;
        if (
          sectionEnabled(sections, "meal") &&
          live.settings.neisOfficeCode.trim() &&
          live.settings.neisSchoolCode.trim() &&
          api?.fetchNeisMeal
        ) {
          const todayNeis = localYmd().replace(/-/g, "");
          const res = await api.fetchNeisMeal({
            fromYmd: todayNeis,
            toYmd: todayNeis,
          });
          if (res.ok) {
            mealLines = res.days.flatMap((d) => d.lines);
          }
        }
        if (sectionEnabled(sections, "weather") && api?.fetchWeather) {
          const res = await api.fetchWeather();
          weatherOk = res.ok && res.data.temp !== null;
        }
        const hasContent = hasTodayGlanceContent(sync, sections, {
          mealLines,
          weatherOk,
        });
        setTodayGlancePreviewEmpty(!hasContent);
        setTodayGlanceOpen(true);
      })();
    }, 4500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    ready,
    electronOk,
    glancePrefs?.todayGlanceEnabled,
    glancePrefs?.todayGlanceLastShownDate,
  ]);

  const applyLayoutPreset = useCallback(
    async (preset: LayoutPreset) => {
      if (!state) return false;
      const next = await patch({
        layout: layoutForPreset(preset),
        settings: { ...state.settings, layoutPreset: preset },
      });
      return next !== null;
    },
    [patch, state],
  );

  const disabledWidgets = state?.settings.disabledWidgets ?? [];

  const activeIds = useMemo(
    () => visibleWidgetIds(disabledWidgets),
    [disabledWidgets],
  );

  const layout = useMemo(() => {
    if (!state) return toGridLayout(activeIds, DEFAULT_LAYOUT);
    const merged = { ...DEFAULT_LAYOUT, ...state.layout };
    return toGridLayout(activeIds, merged);
  }, [state, activeIds]);

  const displayMode = state?.settings.displayMode ?? "window";
  const widgetMode = displayMode === "widget";

  useEffect(() => {
    if (!todayGlanceOpen || !widgetMode) return;
    void window.schoolUtil?.wakeForInput?.();
  }, [todayGlanceOpen, widgetMode]);

  const widgetLockToScreen = state?.settings.widgetLockToScreen !== false;
  const widgetMonitor = state?.settings.widgetMonitor;

  useEffect(() => {
    if (!ready || !electronOk || !widgetMode || !widgetLockToScreen) return;
    const api = window.schoolUtil;
    if (!api?.fitWidgetToScreen) return;

    const fit = () => {
      void api.fitWidgetToScreen();
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [ready, electronOk, widgetMode, widgetLockToScreen, widgetMonitor]);

  const layoutKey = useMemo(
    () =>
      `${JSON.stringify(layout)}-${activeIds.join(",")}-settings:${settingsOpen}-glance:${todayGlanceOpen}`,
    [layout, activeIds, settingsOpen, todayGlanceOpen],
  );
  const theme = state?.settings.theme ?? "sky";
  const fontFamily = state?.settings.fontFamily ?? "pretendard";
  const fontWeightLevel = state?.settings.fontWeightLevel ?? "medium";
  const uiDensity = state?.settings.uiDensity ?? "cozy";
  const cardTexture = state?.settings.cardTexture ?? "glass";

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.font = fontFamily;
    root.dataset.fontWeight = fontWeightLevel;
    root.dataset.density = uiDensity;
    root.dataset.cardTexture = cardTexture;
    return () => {
      delete root.dataset.theme;
      delete root.dataset.font;
      delete root.dataset.fontWeight;
      delete root.dataset.density;
      delete root.dataset.cardTexture;
    };
  }, [theme, fontFamily, fontWeightLevel, uiDensity, cardTexture]);

  const { scheduleWindowShapeUpdate, runShapeBurst } = useWidgetShape(
    widgetMode,
    layoutKey,
  );

  useEffect(() => {
    document.documentElement.classList.toggle("widget-mode", widgetMode);
    document.body.classList.toggle("widget-mode", widgetMode);
    return () => {
      document.documentElement.classList.remove("widget-mode");
      document.body.classList.remove("widget-mode");
    };
  }, [widgetMode]);

  const appearanceFill = state?.settings.backgroundFill ?? "transparent";
  const appearanceOpacity = state?.settings.cardOpacity ?? 72;

  useEffect(() => {
    document.documentElement.dataset.bgFill = appearanceFill;
    document.documentElement.style.setProperty(
      "--card-opacity-num",
      String(appearanceOpacity),
    );
    return () => {
      delete document.documentElement.dataset.bgFill;
      document.documentElement.style.removeProperty("--card-opacity-num");
    };
  }, [appearanceFill, appearanceOpacity]);

  useEffect(() => {
    const api = window.schoolUtil;
    if (!api?.getPinToFront) return;
    void api.getPinToFront().then(setPinned);
    const offPin = api.onPinChanged?.((v) => setPinned(v));
    const offLayer = api.onDesktopLayerWarning?.((p) => {
      if (!p.ok) setDesktopLayerWarn(true);
    });
    return () => {
      offPin?.();
      offLayer?.();
    };
  }, [ready]);

  useEffect(() => {
    if (!widgetMode) return;
    scheduleWindowShapeUpdate();
    runShapeBurst(240);
  }, [pinned, widgetMode, scheduleWindowShapeUpdate, runShapeBurst]);

  useEffect(() => {
    if (!widgetMode) return;
    const api = window.schoolUtil;
    const wake = () => void api?.wakeForInput?.();
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target;
      if (t instanceof Element && t.closest(WIDGET_INTERACTIVE_SELECTOR)) {
        wake();
      }
    };
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target;
      if (t instanceof Element && t.closest(WIDGET_INTERACTIVE_SELECTOR)) {
        wake();
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
    };
  }, [widgetMode]);

  const onLayoutChange = useCallback(
    (items: Layout[]) => {
      scheduleWindowShapeUpdate();
      if (!state) return;
      void patch({
        layout: { ...state.layout, ...fromGridLayout(items) },
      });
    },
    [patch, scheduleWindowShapeUpdate, state],
  );

  const onGridInteractionEnd = useCallback(() => {
    scheduleWindowShapeUpdate();
    runShapeBurst();
  }, [runShapeBurst, scheduleWindowShapeUpdate]);

  if (!ready || !state) {
    return (
      <div className="app-shell" style={{ padding: 24 }}>
        불러오는 중…
      </div>
    );
  }

  const { accentCard, backgroundFill } = state.settings;
  const { rowHeight, margin: gridMargin } = gridMetricsForDensity(
    uiDensity ?? "cozy",
  );

  return (
    <div
      className={`app-shell${widgetMode ? " widget-mode" : ""}${
        widgetMode && pinned ? " widget-pinned" : ""
      }`}
      data-theme={theme}
      data-font={fontFamily ?? "pretendard"}
      data-font-weight={fontWeightLevel}
      data-density={uiDensity ?? "cozy"}
      data-card-texture={cardTexture ?? "glass"}
      data-bg-fill={backgroundFill ?? "transparent"}
      data-display-mode={displayMode}
    >
      {(persistError || !electronOk) && (
        <div className="persist-banner" role="alert">
          {persistError ??
            "Chrome 탭이 아닌 Electron «SchoolUtil» 창에서 열어야 저장됩니다."}
        </div>
      )}
      {electronOk && !state.settings.onboardingDone && (
        <div className="onboarding-banner" role="region" aria-label="처음 설정">
          <span>
            학교 이름을 검색해 선택해 보세요. 하단 톱니바퀴 «설정 → 학교»에서 할
            수 있습니다.
          </span>
          <button
            type="button"
            onClick={() =>
              void patch({
                settings: { ...state.settings, onboardingDone: true },
              })
            }
          >
            나중에
          </button>
        </div>
      )}
      {desktopLayerWarn && widgetMode && (
        <div className="persist-banner" role="status">
          바탕화면 맨 아래로 보내지 못했습니다. 다른 창을 가릴 수 있습니다.
          숨기기·맨 앞 보기는 Ctrl+Alt+D · 비상 탈출은 Ctrl+Alt+Shift+D
        </div>
      )}
      <header className="title-bar">
        <h1>
          SchoolUtil
          <span
            className={`conn-dot ${bridgeOk ? "on" : "off"}`}
            title={
              bridgeOk
                ? "Electron 저장 연결됨"
                : "Electron 미연결 — 데스크톱 앱 창에서 여세요"
            }
          />
        </h1>
        <div className="title-bar-actions">
          {widgetMode && (
            <button
              type="button"
              onClick={() =>
                void (pinned
                  ? window.schoolUtil?.returnWidgetToDesktop()
                  : window.schoolUtil?.togglePinToFront())
              }
            >
              {pinned ? "바탕화면으로" : "숨기기"}
            </button>
          )}
          <button
            type="button"
            className="title-bar-settings-btn"
            title="설정"
            aria-label="설정 열기"
            onClick={() => setSettingsOpen(true)}
          >
            <SettingsIcon size={18} />
          </button>
          <button type="button" onClick={() => window.schoolUtil?.hide()}>
            숨기기
          </button>
          {!widgetMode && (
            <button type="button" onClick={() => window.schoolUtil?.minimize()}>
              최소화
            </button>
          )}
        </div>
      </header>
      <main className="dashboard" ref={dashboardRef}>
        <GridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={rowHeight}
          margin={[gridMargin, gridMargin]}
          width={gridWidth}
          onLayoutChange={onLayoutChange}
          onDrag={scheduleWindowShapeUpdate}
          onDragStop={onGridInteractionEnd}
          onResize={scheduleWindowShapeUpdate}
          onResizeStop={onGridInteractionEnd}
          draggableHandle=".widget-header, .meal-widget-head"
          compactType="vertical"
        >
          {activeIds.map((id) => (
            <div key={id}>
              <div
                className={`widget-card${
                  accentCard === id ? " widget-card--accent" : ""
                }${id === "meal" ? " widget-card--meal" : ""}`}
              >
                <div className="widget-header">
                  <span className="widget-header-title">
                    <WidgetHeaderIcon
                      id={id}
                      className="widget-header-icon"
                    />
                    <span className="widget-header-text">
                      {widgetHeaderLabel(id, {
                        memoCount: state.memos.length,
                      })}
                    </span>
                  </span>
                </div>
                <div className="widget-body">
                  {renderWidgetBody(id, state, patch)}
                </div>
              </div>
            </div>
          ))}
        </GridLayout>
      </main>
      <AppSettingsDock
        x={state.settings.settingsDockX}
        y={state.settings.settingsDockY}
        onOpenSettings={() => setSettingsOpen(true)}
        onPositionCommit={(settingsDockX, settingsDockY) => {
          void patch({
            settings: {
              ...state.settings,
              settingsDockX,
              settingsDockY,
            },
          });
        }}
        onDragEnd={() => {
          scheduleWindowShapeUpdate();
          runShapeBurst(120);
        }}
      />
      <SettingsModal
        open={settingsOpen}
        settings={state.settings}
        onClose={() => setSettingsOpen(false)}
        onSave={saveSettings}
        onApplyLayoutPreset={applyLayoutPreset}
        onResetLayout={() => void patch({ layout: {} })}
        onPreviewTodayGlance={previewTodayGlance}
      />
      <TodayGlanceModal
        open={todayGlanceOpen}
        state={state}
        previewEmpty={todayGlancePreviewEmpty}
        onClose={closeTodayGlance}
        onDismissToday={closeTodayGlance}
      />
      <ComciganSubstituteModal
        open={substituteAlertOpen}
        timetable={state.timetable}
        onClose={() => void dismissSubstituteAlert()}
      />
    </div>
  );
}
