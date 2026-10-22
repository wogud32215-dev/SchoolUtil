import { useCallback, useEffect, useMemo, useState } from "react";
import GridLayout, { type Layout } from "react-grid-layout";
import { useDashboardWidth } from "@/hooks/useDashboardWidth";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useWidgetShape } from "@/hooks/useWidgetShape";
import type { AppSettings, LayoutItem, PersistedState } from "@/types/state";
import { CalendarWidget } from "@/widgets/CalendarWidget";
import { ClockWidget } from "@/widgets/ClockWidget";
import { DDayWidget } from "@/widgets/DDayWidget";
import { MealWidget } from "@/widgets/MealWidget";
import {
  DEFAULT_LAYOUT,
  visibleWidgetIds,
  WIDGET_TITLES,
  type WidgetId,
} from "@/widgets/registry";
import { SchoolScheduleWidget } from "@/widgets/SchoolScheduleWidget";
import { SettingsWidget } from "@/widgets/SettingsWidget";
import { TimetableWidget } from "@/widgets/TimetableWidget";
import { TodoWidget } from "@/widgets/TodoWidget";
import { WeatherWidget } from "@/widgets/WeatherWidget";
import { MemoWidget } from "@/widgets/MemoWidget";

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
  saveSettings: (settings: AppSettings) => Promise<boolean>,
) {
  switch (id) {
    case "clock":
      return <ClockWidget />;
    case "weather":
      return <WeatherWidget settings={state.settings} />;
    case "meal":
      return <MealWidget settings={state.settings} />;
    case "calendar":
      return <CalendarWidget />;
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
        />
      );
    case "schoolsched":
      return <SchoolScheduleWidget settings={state.settings} />;
    case "settings":
      return (
        <SettingsWidget
          settings={state.settings}
          onSave={saveSettings}
          onResetLayout={() => void patch({ layout: {} })}
        />
      );
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

  const layoutKey = useMemo(
    () => `${JSON.stringify(layout)}-${activeIds.join(",")}`,
    [layout, activeIds],
  );

  const displayMode = state?.settings.displayMode ?? "window";
  const widgetMode = displayMode === "widget";

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

  const theme = state.settings.theme;

  return (
    <div
      className={`app-shell${widgetMode ? " widget-mode" : ""}`}
      data-theme={theme}
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
            NEIS API 키를 넣고 학교를 검색해 보세요. 설정 카드에서 할 수
            있습니다.
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
          «앞으로 보기»는 Ctrl+Alt+D · 비상 탈출은 Ctrl+Alt+Shift+D
        </div>
      )}
      {widgetMode && pinned && (
        <div className="pin-banner" role="status">
          앞으로 보기 중 — 다른 창 위에 표시됩니다.
          <button
            type="button"
            onClick={() => void window.schoolUtil?.togglePinToFront()}
          >
            바탕화면으로 (Ctrl+Alt+D)
          </button>
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
              onClick={() => void window.schoolUtil?.togglePinToFront()}
            >
              {pinned ? "바탕화면으로" : "앞으로 보기"}
            </button>
          )}
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
          rowHeight={36}
          width={gridWidth}
          onLayoutChange={onLayoutChange}
          onDrag={scheduleWindowShapeUpdate}
          onDragStop={onGridInteractionEnd}
          onResize={scheduleWindowShapeUpdate}
          onResizeStop={onGridInteractionEnd}
          draggableHandle=".widget-header"
          compactType="vertical"
        >
          {activeIds.map((id) => (
            <div key={id}>
              <div className="widget-card">
                <div className="widget-header">{WIDGET_TITLES[id]}</div>
                <div className="widget-body">
                  {renderWidgetBody(id, state, patch, saveSettings)}
                </div>
              </div>
            </div>
          ))}
        </GridLayout>
      </main>
    </div>
  );
}
