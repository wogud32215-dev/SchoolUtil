import { useEffect, useState } from "react";
import type { AppSettings } from "@/types/state";
import { DataBackupPanel } from "@/widgets/DataBackupPanel";
import { SchoolSearchPanel } from "@/widgets/SchoolSearchPanel";
import {
  WIDGET_TOGGLE_LABELS,
  type WidgetId,
} from "@/widgets/registry";

type Props = {
  settings: AppSettings;
  onSave: (settings: AppSettings) => Promise<boolean>;
  onResetLayout: () => void;
};

function disabledEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function settingsEqual(a: AppSettings, b: AppSettings): boolean {
  return (
    a.theme === b.theme &&
    a.openAtLogin === b.openAtLogin &&
    a.neisApiKey === b.neisApiKey &&
    a.neisOfficeCode === b.neisOfficeCode &&
    a.neisSchoolCode === b.neisSchoolCode &&
    a.schoolName === b.schoolName &&
    a.onboardingDone === b.onboardingDone &&
    a.displayMode === b.displayMode &&
    a.globalShortcuts === b.globalShortcuts &&
    a.weatherLabel === b.weatherLabel &&
    a.weatherLat === b.weatherLat &&
    a.weatherLon === b.weatherLon &&
    disabledEqual(a.disabledWidgets, b.disabledWidgets)
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

export function SettingsWidget({
  settings,
  onSave,
  onResetLayout,
}: Props) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [storePath, setStorePath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    window.schoolUtil?.getStorePath?.().then(setStorePath).catch(() => {});
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
      setSavedHint(
        "저장되었습니다. 화면 배치를 바꿨으면 창이 다시 열립니다. 학사일정은 새로고침하세요.",
      );
      window.setTimeout(() => setSavedHint(null), 5000);
    } else {
      setSavedHint("저장에 실패했습니다. Electron 앱 창인지 확인하세요.");
    }
  }

  return (
    <div className="settings-panel">
      <label>
        테마
        <select
          value={draft.theme}
          onChange={(e) =>
            patch({ theme: e.target.value as AppSettings["theme"] })
          }
        >
          <option value="blue">파랑</option>
          <option value="green">초록</option>
          <option value="dark">다크</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={draft.openAtLogin}
          onChange={(e) => patch({ openAtLogin: e.target.checked })}
        />{" "}
        Windows 시작 시 실행
      </label>
      <label>
        화면 배치
        <select
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
      </label>
      <p className="muted" style={{ margin: 0 }}>
        위젯 모드: 카드 밖은 바탕화면이 보입니다. 앞으로 보기 Ctrl+Alt+D · 비상
        탈출 Ctrl+Alt+Shift+D
      </p>
      <button type="button" onClick={onResetLayout}>
        위젯 배치 기본값으로
      </button>
      <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
        카드가 겹치거나 잘리면 눌러 보세요. 크기·위치는 카드 제목줄을 드래그해
        조절할 수 있습니다.
      </p>
      <label>
        <input
          type="checkbox"
          checked={draft.globalShortcuts}
          onChange={(e) => patch({ globalShortcuts: e.target.checked })}
        />{" "}
        전역 단축키 사용 (앞으로 보기 · 비상 탈출)
      </label>
      <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />
      <p className="muted" style={{ margin: "0 0 4px" }}>
        표시할 위젯 (설정 카드는 항상 표시)
      </p>
      <div className="settings-widget-toggles">
        {WIDGET_TOGGLE_LABELS.map(({ id, label }) => {
          const enabled = !draft.disabledWidgets.includes(id);
          return (
            <label key={id}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) =>
                  setDraft((prev) => setWidgetEnabled(prev, id, e.target.checked))
                }
              />
              {label}
            </label>
          );
        })}
      </div>
      <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />
      <p className="muted" style={{ margin: 0 }}>
        날씨 (Open-Meteo, 무료)
      </p>
      <label>
        지역 이름
        <input
          value={draft.weatherLabel}
          onChange={(e) => patch({ weatherLabel: e.target.value })}
          placeholder="예: 서울"
        />
      </label>
      <label>
        위도
        <input
          type="number"
          step="0.0001"
          value={draft.weatherLat}
          onChange={(e) =>
            patch({ weatherLat: Number.parseFloat(e.target.value) || 0 })
          }
        />
      </label>
      <label>
        경도
        <input
          type="number"
          step="0.0001"
          value={draft.weatherLon}
          onChange={(e) =>
            patch({ weatherLon: Number.parseFloat(e.target.value) || 0 })
          }
        />
      </label>
      <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />
      <p className="muted" style={{ margin: 0 }}>
        학사일정 · 급식 · 학교 검색(NEIS) —{" "}
        <button
          type="button"
          className="btn-primary"
          style={{ padding: "2px 8px", fontSize: "0.8rem" }}
          onClick={() =>
            window.schoolUtil?.openExternal("https://open.neis.go.kr/")
          }
        >
          NEIS 키 발급
        </button>
      </p>
      <label>
        NEIS API Key
        <input
          value={draft.neisApiKey}
          onChange={(e) => patch({ neisApiKey: e.target.value })}
          placeholder="발급받은 키"
        />
      </label>
      <SchoolSearchPanel draft={draft} onApply={(p) => patch(p)} />
      <label>
        교육청 코드 (ATPT_OFCDC_SC_CODE)
        <input
          value={draft.neisOfficeCode}
          onChange={(e) => patch({ neisOfficeCode: e.target.value })}
          placeholder="예: B10"
        />
      </label>
      <label>
        학교 코드 (SD_SCHUL_CODE)
        <input
          value={draft.neisSchoolCode}
          onChange={(e) => patch({ neisSchoolCode: e.target.value })}
          placeholder="학교 고유 코드"
        />
      </label>
      <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />
      <p className="muted" style={{ margin: 0 }}>데이터 백업 · 업데이트</p>
      <DataBackupPanel />
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
      {storePath && (
        <p className="muted" style={{ margin: 0, fontSize: "0.75rem" }}>
          데이터 파일: {storePath}
        </p>
      )}
      {!dirty && !savedHint && (
        <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
          «설정 저장»을 누르면 위 경로에 기록됩니다. npm run dev를 다시 켜도
          유지됩니다.
        </p>
      )}
    </div>
  );
}
