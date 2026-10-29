import { useEffect, useState } from "react";
import type {
  AppSettings,
  LayoutPreset,
  TodayGlanceSections,
} from "@/types/state";
import { defaultTodayGlanceSections } from "@/utils/todayGlance";
import { DesignSettingsSection } from "@/components/DesignSettingsSection";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSegmented } from "@/components/settings/SettingsSegmented";
import { SettingsSwitch } from "@/components/settings/SettingsSwitch";
import { SettingsCheckbox } from "@/components/settings/SettingsCheckbox";
import {
  SettingsToggleChip,
  SettingsToggleChipGrid,
} from "@/components/settings/SettingsToggleChip";
import { SettingsTabNav } from "@/components/settings/SettingsTabNav";
import {
  labelForSettingsTab,
  type SettingsTabId,
} from "@/components/settings/settingsTabs";
import { DataBackupPanel } from "@/widgets/DataBackupPanel";
import { useNeisKeyStatus } from "@/hooks/useNeisKeyStatus";
import { NeisAppKeyAdminPanel } from "@/widgets/NeisAppKeyAdminPanel";
import { ComciganTimetableSection } from "@/components/ComciganTimetableSection";
import { SchoolSearchPanel } from "@/widgets/SchoolSearchPanel";
import { WeatherPlaceSearch } from "@/widgets/WeatherPlaceSearch";
import { WorkPortalSettingsSection } from "@/widgets/WorkPortalSettingsSection";
import { DockShortcutsSettingsSection } from "@/components/settings/DockShortcutsSettingsSection";
import type { DockShortcutItem } from "@/types/state";
import {
  LAYOUT_PRESET_OPTIONS,
  WIDGET_TOGGLE_LABELS,
  type WidgetId,
} from "@/widgets/registry";

type Props = {
  settings: AppSettings;
  onSave: (settings: AppSettings) => Promise<boolean>;
  onApplyLayoutPreset: (preset: LayoutPreset) => Promise<boolean>;
  onResetLayout: () => void;
  onPreviewTodayGlance?: () => void;
};

const TODAY_GLANCE_SECTION_LABELS: {
  key: keyof TodayGlanceSections;
  label: string;
}[] = [
  { key: "todos", label: "할 일" },
  { key: "timetable", label: "오늘 수업" },
  { key: "meal", label: "급식" },
  { key: "calendar", label: "오늘 일정" },
  { key: "dday", label: "D-Day" },
  { key: "memo", label: "메모" },
  { key: "weather", label: "날씨" },
];

function todayGlanceSectionsEqual(
  a: TodayGlanceSections,
  b: TodayGlanceSections,
): boolean {
  const keys = Object.keys(defaultTodayGlanceSections()) as (keyof TodayGlanceSections)[];
  return keys.every((k) => a[k] === b[k]);
}

function disabledEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function dockShortcutsEqual(
  a: DockShortcutItem[],
  b: DockShortcutItem[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (item, i) =>
      item.id === b[i].id &&
      item.label === b[i].label &&
      item.sourcePath === b[i].sourcePath &&
      item.iconDataUrl === b[i].iconDataUrl,
  );
}

function settingsEqual(a: AppSettings, b: AppSettings): boolean {
  return (
    a.theme === b.theme &&
    a.fontFamily === b.fontFamily &&
    a.fontWeightLevel === b.fontWeightLevel &&
    a.uiDensity === b.uiDensity &&
    a.cardTexture === b.cardTexture &&
    a.accentCard === b.accentCard &&
    a.backgroundFill === b.backgroundFill &&
    a.cardOpacity === b.cardOpacity &&
    a.designPeek === b.designPeek &&
    a.layoutPreset === b.layoutPreset &&
    a.openAtLogin === b.openAtLogin &&
    a.neisApiKey === b.neisApiKey &&
    a.neisOfficeCode === b.neisOfficeCode &&
    a.neisSchoolCode === b.neisSchoolCode &&
    a.schoolName === b.schoolName &&
    a.onboardingDone === b.onboardingDone &&
    a.displayMode === b.displayMode &&
    a.widgetMonitor === b.widgetMonitor &&
    a.widgetLockToScreen === b.widgetLockToScreen &&
    a.settingsDockX === b.settingsDockX &&
    a.settingsDockY === b.settingsDockY &&
    dockShortcutsEqual(a.dockShortcuts, b.dockShortcuts) &&
    a.globalShortcuts === b.globalShortcuts &&
    a.weatherLabel === b.weatherLabel &&
    a.weatherLat === b.weatherLat &&
    a.weatherLon === b.weatherLon &&
    disabledEqual(a.disabledWidgets, b.disabledWidgets) &&
    a.todayGlanceEnabled === b.todayGlanceEnabled &&
    a.todayGlanceLastShownDate === b.todayGlanceLastShownDate &&
    a.todayGlanceFontSize === b.todayGlanceFontSize &&
    todayGlanceSectionsEqual(a.todayGlanceSections, b.todayGlanceSections) &&
    a.portalBrowser === b.portalBrowser &&
    a.portals.nice.enabled === b.portals.nice.enabled &&
    a.portals.nice.url === b.portals.nice.url &&
    a.portals.edufine.enabled === b.portals.edufine.enabled &&
    a.portals.edufine.url === b.portals.edufine.url &&
    a.portals.goePortal.enabled === b.portals.goePortal.enabled &&
    a.portals.goePortal.url === b.portals.goePortal.url &&
    a.portalNiceUser === b.portalNiceUser &&
    a.portalNicePassword === b.portalNicePassword &&
    a.portalEdufineUser === b.portalEdufineUser &&
    a.portalEdufinePassword === b.portalEdufinePassword &&
    a.portalGoeUser === b.portalGoeUser &&
    a.portalGoePassword === b.portalGoePassword &&
    a.portalEducationOffice === b.portalEducationOffice &&
    a.portalLoginMode === b.portalLoginMode &&
    a.portalAutoLogin === b.portalAutoLogin &&
    a.portalAutoLoginDelay === b.portalAutoLoginDelay &&
    a.portalAutomationTarget === b.portalAutomationTarget &&
    a.portalSessionExtend === b.portalSessionExtend &&
    a.portalSessionExtendMinutes === b.portalSessionExtendMinutes &&
    a.portalOsCertInput === b.portalOsCertInput &&
    a.brityMessengerEnabled === b.brityMessengerEnabled &&
    a.brityMessengerExePath === b.brityMessengerExePath &&
    a.brityMessengerCertLabel === b.brityMessengerCertLabel &&
    a.brityMessengerShareGoeCredentials ===
      b.brityMessengerShareGoeCredentials &&
    a.brityMessengerPassword === b.brityMessengerPassword &&
    a.timetableAutoSync === b.timetableAutoSync &&
    a.timetableFetchMode === b.timetableFetchMode &&
    a.timetableProxyBaseUrl === b.timetableProxyBaseUrl &&
    a.comciganSchoolCode === b.comciganSchoolCode &&
    a.comciganSchoolName === b.comciganSchoolName &&
    a.comciganTeacherName === b.comciganTeacherName &&
    a.comciganTeacherIndex === b.comciganTeacherIndex &&
    a.comciganClassLabelMode === b.comciganClassLabelMode
  );
}

function setWidgetEnabled(
  draft: AppSettings,
  id: WidgetId,
  enabled: boolean,
): AppSettings {
  const disabled = new Set(draft.disabledWidgets);
  if (enabled) {
    disabled.delete(id);
  } else {
    disabled.add(id);
  }
  return { ...draft, disabledWidgets: [...disabled] };
}

type DisplayOption = {
  id: number;
  label: string;
  primary: boolean;
};

function widgetMonitorSelectValue(
  monitor: AppSettings["widgetMonitor"],
): string {
  if (monitor === "all") return "all";
  if (typeof monitor === "number") return `id:${monitor}`;
  return "primary";
}

function widgetMonitorFromSelect(value: string): AppSettings["widgetMonitor"] {
  if (value === "all") return "all";
  if (value === "primary") return "primary";
  if (value.startsWith("id:")) {
    const id = Number(value.slice(3));
    if (Number.isFinite(id)) return id;
  }
  return "primary";
}

export function SettingsWidget({
  settings,
  onSave,
  onApplyLayoutPreset,
  onResetLayout,
  onPreviewTodayGlance,
}: Props) {
  const [tab, setTab] = useState<SettingsTabId>("design");
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [storePath, setStorePath] = useState<string | null>(null);
  const [displays, setDisplays] = useState<DisplayOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPersonalNeisKey, setShowPersonalNeisKey] = useState(false);
  const { status: neisKeyStatus, refresh: refreshNeisKey } = useNeisKeyStatus();

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    if (settings.neisApiKey.trim()) {
      setShowPersonalNeisKey(true);
    }
  }, [settings.neisApiKey]);

  useEffect(() => {
    window.schoolUtil?.getStorePath?.().then(setStorePath).catch(() => {});
    window.schoolUtil
      ?.listDisplays?.()
      .then((list) => setDisplays(list))
      .catch(() => {});
  }, []);

  const dirty = !settingsEqual(draft, settings);

  function patch(partial: Partial<AppSettings>) {
    setDraft((prev) => ({ ...prev, ...partial }));
    setSavedHint(null);
  }

  async function save() {
    setSaving(true);
    setSavedHint(null);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) {
      await refreshNeisKey();
      setSavedHint(
        "저장되었습니다. 화면 배치를 바꿨으면 창이 다시 열립니다. 학사일정은 새로고침하세요.",
      );
      window.setTimeout(() => setSavedHint(null), 5000);
    } else {
      setSavedHint("저장에 실패했습니다. Electron 앱 창인지 확인하세요.");
    }
  }

  async function applyLayoutPreset(preset: LayoutPreset) {
    if (preset === draft.layoutPreset) return;
    const label =
      LAYOUT_PRESET_OPTIONS.find((o) => o.id === preset)?.label ?? preset;
    const ok = window.confirm(
      `「${label}」 배치로 바꿉니다. 카드 위치·크기가 프리셋대로 바뀝니다. 계속할까요?`,
    );
    if (!ok) return;
    await onApplyLayoutPreset(preset);
  }

  return (
    <div className="settings-panel settings-panel--tabbed">
      <div className="settings-tab-nav-wrap">
        <SettingsTabNav active={tab} onChange={setTab} />
      </div>

      <div className="settings-tab-scroll">
        {tab === "design" && (
          <DesignSettingsSection settings={settings} onDesignSave={onSave} />
        )}

        {tab === "widget" && (
          <section
            className="settings-tab-pane"
            aria-label={labelForSettingsTab("widget")}
          >
            <SettingsRow
              title="제일 메이트"
              hint="앱을 켜면 하루 한 번(약 5초 후) 모아 보여 줍니다. 내용이 없으면 안내 문구만 나옵니다."
            >
              <div className="settings-mate-card">
                <SettingsSwitch
                  checked={draft.todayGlanceEnabled}
                  onChange={(v) => patch({ todayGlanceEnabled: v })}
                  label="실행 시 자동으로 보기"
                />
                <div className="settings-field">
                  <span className="settings-field-label">글자 크기</span>
                  <SettingsSegmented
                    aria-label="글자 크기"
                    value={draft.todayGlanceFontSize}
                    options={[
                      { value: "normal", label: "보통" },
                      { value: "large", label: "크게" },
                      { value: "xlarge", label: "아주 크게" },
                    ]}
                    onChange={(v) => patch({ todayGlanceFontSize: v })}
                  />
                </div>
                <div className="settings-field">
                  <span className="settings-field-label">보일 칸</span>
                  <SettingsToggleChipGrid>
                    {TODAY_GLANCE_SECTION_LABELS.map(({ key, label }) => (
                      <SettingsToggleChip
                        key={key}
                        pressed={draft.todayGlanceSections[key]}
                        onPressedChange={(on) =>
                          patch({
                            todayGlanceSections: {
                              ...draft.todayGlanceSections,
                              [key]: on,
                            },
                          })
                        }
                      >
                        {label}
                      </SettingsToggleChip>
                    ))}
                  </SettingsToggleChipGrid>
                </div>
                {onPreviewTodayGlance ? (
                  <button
                    type="button"
                    className="settings-inline-btn settings-inline-btn--primary settings-mate-preview"
                    onClick={onPreviewTodayGlance}
                  >
                    지금 한 번 보기
                  </button>
                ) : null}
              </div>
            </SettingsRow>

            <SettingsRow
              title="화면 배치"
              hint="카드 크기·위치 프리셋입니다. 적용 시 기존 배치가 바뀝니다."
            >
              <div
                className="design-layout-grid"
                role="radiogroup"
                aria-label="화면 배치"
              >
                {LAYOUT_PRESET_OPTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    className="design-layout-chip"
                    role="radio"
                    aria-checked={settings.layoutPreset === id}
                    onClick={() => void applyLayoutPreset(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </SettingsRow>

            <SettingsRow
              title="배치 초기화"
              hint="카드가 겹치거나 잘리면 눌러 보세요. 제목줄을 드래그해 위치·크기를 조절할 수 있습니다."
            >
              <button type="button" className="settings-inline-btn" onClick={onResetLayout}>
                위젯 배치 기본값으로
              </button>
            </SettingsRow>

            <SettingsRow
              title="표시할 위젯"
              hint="끈 위젯은 대시보드에서 숨겨집니다."
            >
              <SettingsToggleChipGrid>
                {WIDGET_TOGGLE_LABELS.map(({ id, label }) => {
                  const enabled = !draft.disabledWidgets.includes(id);
                  return (
                    <SettingsToggleChip
                      key={id}
                      pressed={enabled}
                      onPressedChange={(on) =>
                        setDraft((prev) => setWidgetEnabled(prev, id, on))
                      }
                    >
                      {label}
                    </SettingsToggleChip>
                  );
                })}
              </SettingsToggleChipGrid>
            </SettingsRow>
          </section>
        )}

        {tab === "screen" && (
          <section
            className="settings-tab-pane"
            aria-label={labelForSettingsTab("screen")}
          >
            <SettingsRow title="시작 프로그램">
              <SettingsCheckbox
                checked={draft.openAtLogin}
                onChange={(v) => patch({ openAtLogin: v })}
              >
                Windows 시작 시 SchoolUtil 실행
              </SettingsCheckbox>
            </SettingsRow>

            <SettingsRow
              title="표시 방식"
              hint="위젯 모드는 바탕화면 위에 카드만 띄웁니다. 일반 창은 앱 창 전체를 씁니다."
            >
              <select
                className="settings-control"
                value={draft.displayMode}
                onChange={(e) =>
                  patch({
                    displayMode: e.target.value as AppSettings["displayMode"],
                  })
                }
              >
                <option value="widget">위젯 (바탕화면에 얹기)</option>
                <option value="window">일반 창 (전체 화면)</option>
              </select>
            </SettingsRow>

            {draft.displayMode === "widget" && (
              <SettingsRow title="위젯 모니터">
                <select
                  className="settings-control"
                  value={widgetMonitorSelectValue(draft.widgetMonitor)}
                  onChange={(e) =>
                    patch({
                      widgetMonitor: widgetMonitorFromSelect(e.target.value),
                    })
                  }
                >
                  <option value="primary">주 모니터</option>
                  {displays
                    .filter((d) => !d.primary)
                    .map((d) => (
                      <option key={d.id} value={`id:${d.id}`}>
                        {d.label}
                      </option>
                    ))}
                  {displays.length > 1 && (
                    <option value="all">
                      모든 모니터 (드래그로 보조 화면에 배치)
                    </option>
                  )}
                </select>
                {draft.widgetMonitor === "all" ? (
                  <p className="settings-row-hint" style={{ marginTop: 8 }}>
                    그리드가 넓어집니다. 카드를 오른쪽으로 드래그하면 보조 모니터에
                    놓을 수 있습니다.
                  </p>
                ) : null}
              </SettingsRow>
            )}

            {draft.displayMode === "widget" && (
              <SettingsRow
                title="화면에 맞춰 고정"
                hint="위젯 창을 선택한 모니터 작업 영역(작업 표시줄 제외)에 맞춥니다. 해상도·배율이 바뀌면 자동으로 다시 맞춥니다."
              >
                <SettingsSwitch
                  checked={draft.widgetLockToScreen}
                  onChange={(v) => patch({ widgetLockToScreen: v })}
                  label="모니터에 자동 맞춤·고정"
                />
                <button
                  type="button"
                  className="settings-inline-btn"
                  style={{ marginTop: 12 }}
                  onClick={() => void window.schoolUtil?.fitWidgetToScreen?.()}
                >
                  지금 화면에 맞추기
                </button>
              </SettingsRow>
            )}

            <SettingsRow
              title="자주 쓰는 앱"
              hint="「앱 바로가기» 위젯에 표시됩니다. 제목줄을 끌어 원하는 위치·크기로 고정하세요. 설정 → 카드에서 위젯을 끌 수 있습니다."
            >
              <DockShortcutsSettingsSection
                shortcuts={draft.dockShortcuts}
                onChange={(dockShortcuts) => patch({ dockShortcuts })}
              />
            </SettingsRow>

            <SettingsRow
              title="단축키"
              hint="숨기기·맨 앞 보기 Ctrl+Alt+D · 비상 탈출 Ctrl+Alt+Shift+D"
            >
              <SettingsCheckbox
                checked={draft.globalShortcuts}
                onChange={(v) => patch({ globalShortcuts: v })}
              >
                전역 단축키 사용 (다른 앱 위에서도 동작)
              </SettingsCheckbox>
            </SettingsRow>
          </section>
        )}

        {tab === "school" && (
          <section
            className="settings-tab-pane"
            aria-label={labelForSettingsTab("school")}
          >
            {neisKeyStatus?.hasAppKey && (
              <p className="muted" style={{ margin: "0 0 12px" }}>
                급식·학사일정은 앱에 연결된 NEIS 키로 불러옵니다. 학교만 검색해
                선택하면 됩니다.
              </p>
            )}

            <SettingsRow title="학교 검색" hint="이름으로 검색해 코드를 채웁니다.">
              <SchoolSearchPanel draft={draft} onApply={(p) => patch(p)} />
            </SettingsRow>

            <ComciganTimetableSection draft={draft} onPatch={(p) => patch(p)} />

            {neisKeyStatus && (
              <NeisAppKeyAdminPanel
                status={neisKeyStatus}
                onUpdated={refreshNeisKey}
              />
            )}

            <SettingsRow
              title="내 NEIS 키 (선택)"
              hint="앱 키가 한도에 걸리거나 오류가 나면 data.go.kr에서 발급한 키를 넣으세요."
            >
              <div className="settings-field-stack">
                {!showPersonalNeisKey ? (
                  <button
                    type="button"
                    className="settings-inline-btn"
                    onClick={() => setShowPersonalNeisKey(true)}
                  >
                    본인 키 입력
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="settings-inline-btn settings-inline-btn--primary"
                      onClick={() =>
                        void window.schoolUtil?.openExternal(
                          "https://open.neis.go.kr/",
                        )
                      }
                    >
                      NEIS 키 발급 페이지
                    </button>
                    <input
                      className="settings-control"
                      type="password"
                      autoComplete="off"
                      value={draft.neisApiKey}
                      onChange={(e) => patch({ neisApiKey: e.target.value })}
                      placeholder={
                        neisKeyStatus?.hasPersonalKey
                          ? "저장된 키가 있습니다. 바꾸려면 새 키 입력"
                          : "발급받은 API Key"
                      }
                    />
                    {neisKeyStatus?.hasPersonalKey && (
                      <p className="muted" style={{ margin: 0 }}>
                        개인 키는 이 PC에만 암호화 저장되며 백업 JSON에는 포함되지
                        않습니다.
                      </p>
                    )}
                  </>
                )}
              </div>
            </SettingsRow>

            <SettingsRow title="교육청 코드">
              <input
                className="settings-control"
                value={draft.neisOfficeCode}
                onChange={(e) => patch({ neisOfficeCode: e.target.value })}
                placeholder="예: B10 (ATPT_OFCDC_SC_CODE)"
              />
            </SettingsRow>

            <SettingsRow title="학교 코드">
              <input
                className="settings-control"
                value={draft.neisSchoolCode}
                onChange={(e) => patch({ neisSchoolCode: e.target.value })}
                placeholder="SD_SCHUL_CODE"
              />
            </SettingsRow>

            <SettingsRow
              title="날씨"
              hint="Open-Meteo 무료 API · 학교 선택 시 좌표가 자동 설정되며, 아래 검색으로 세부 위치를 고를 수 있습니다."
            >
              <div className="settings-field-stack">
                <WeatherPlaceSearch
                  onPick={(place, label) =>
                    patch({
                      weatherLat: place.lat,
                      weatherLon: place.lon,
                      weatherLabel: label,
                    })
                  }
                />
                <input
                  className="settings-control"
                  value={draft.weatherLabel}
                  onChange={(e) => patch({ weatherLabel: e.target.value })}
                  placeholder="지역 이름 (표시용)"
                />
                <div className="settings-coord-row">
                  <label className="settings-coord-field">
                    <span>위도</span>
                    <input
                      className="settings-control"
                      type="number"
                      step="0.0001"
                      value={draft.weatherLat}
                      onChange={(e) =>
                        patch({
                          weatherLat: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                  <label className="settings-coord-field">
                    <span>경도</span>
                    <input
                      className="settings-control"
                      type="number"
                      step="0.0001"
                      value={draft.weatherLon}
                      onChange={(e) =>
                        patch({
                          weatherLon: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            </SettingsRow>
          </section>
        )}

        {tab === "data" && (
          <section
            className="settings-tab-pane"
            aria-label={labelForSettingsTab("data")}
          >
            <SettingsRow
              title="백업 · 업데이트"
              hint="위 안내를 확인한 뒤 보내기·불러오기를 사용하세요."
            >
              <DataBackupPanel />
            </SettingsRow>
            {storePath ? (
              <p className="settings-footnote">데이터 파일: {storePath}</p>
            ) : null}
          </section>
        )}

        {tab === "portal" && (
          <section
            className="settings-tab-pane settings-tab-pane--portal"
            aria-label={labelForSettingsTab("portal")}
          >
            <WorkPortalSettingsSection
              draft={draft}
              onPatch={(p) => patch(p)}
              onSave={async () => {
                await save();
              }}
            />
          </section>
        )}

        {tab === "help" && (
          <section
            className="settings-tab-pane"
            aria-label={labelForSettingsTab("help")}
          >
            <SettingsRow
              title="사용 설명서"
              hint="카드·설정·학교 연동·내선번호 등 기능별 안내입니다."
            >
              <p className="settings-plain-text">
                브라우저에서 목차와 함께 볼 수 있습니다. 설치 폴더{" "}
                <code>docs/사용설명서.html</code>과 같은 내용이에요.
              </p>
              <button
                type="button"
                className="btn-primary"
                style={{ marginTop: 8 }}
                onClick={() => {
                  void window.schoolUtil?.openUserGuide?.().then((res) => {
                    if (res && !res.ok) {
                      window.alert(res.error);
                    }
                  });
                }}
              >
                사용 설명서 열기
              </button>
            </SettingsRow>
            <SettingsRow title="단축키">
              <ul className="settings-help-list">
                <li><kbd>Ctrl+Alt+D</kbd> — 위젯 숨기기 / 다시 맨 앞에 보기</li>
                <li><kbd>Ctrl+Alt+Shift+D</kbd> — 비상 탈출 (일반 창)</li>
              </ul>
            </SettingsRow>
            <SettingsRow title="위젯 모드">
              <p className="settings-plain-text">
                카드 밖 영역은 바탕화면이 보입니다. 설정은 제목줄 톱니바퀴,
                내선번호는 전화 아이콘으로 엽니다.
              </p>
            </SettingsRow>
            <SettingsRow title="문서">
              <button
                type="button"
                className="settings-inline-btn"
                onClick={() =>
                  void window.schoolUtil?.openExternal(
                    "https://github.com/wogud32215-dev/SchoolUtil",
                  )
                }
              >
                GitHub 저장소
              </button>
            </SettingsRow>
          </section>
        )}
      </div>

      <footer className="settings-panel-footer">
        <div className="settings-save-row">
          <button
            type="button"
            className="btn-primary"
            onClick={() => void save()}
            disabled={!dirty || saving}
          >
            {saving ? "저장 중…" : "설정 저장"}
          </button>
          {dirty && !saving && (
            <span className="muted" style={{ fontSize: "0.85rem" }}>
              변경 내용이 있습니다
            </span>
          )}
          {savedHint && (
            <span
              className={
                savedHint.startsWith("저장되었")
                  ? "settings-saved"
                  : "sched-error"
              }
              role="status"
            >
              {savedHint}
            </span>
          )}
        </div>
        {!dirty && !savedHint && tab !== "design" && (
          <p className="settings-footnote">
            테마 탭의 색·질감은 누르면 바로 저장됩니다. 그 외 항목은 «설정 저장»을
            눌러야 반영됩니다.
          </p>
        )}
      </footer>
    </div>
  );
}
