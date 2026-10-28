import { useEffect, useState } from "react";
import type { AppSettings, PortalId, PortalRunRecord } from "@/types/state";
import {
  EDUCATION_OFFICE_OPTIONS,
  officePresetUrls,
} from "@/data/portalOffices";
import {
  PORTAL_IDS_ORDER,
  PORTAL_PASSWORD_KEYS,
  PORTAL_USER_KEYS,
  portalLabel,
  portalLastRun,
} from "@/utils/portalSettings";

const PORTALS = PORTAL_IDS_ORDER.map((id) => ({ id, label: portalLabel(id) }));

function formatLastRun(rec?: PortalRunRecord): string | null {
  if (!rec?.at) return null;
  const t = rec.at.replace("T", " ").slice(0, 16);
  return `${t} · ${rec.ok ? "완료" : "실패"} — ${rec.summary}`;
}

type Props = {
  draft: AppSettings;
  onPatch: (partial: Partial<AppSettings>) => void;
  onSave: () => Promise<void>;
};

export function WorkPortalSettingsSection({
  draft,
  onPatch,
  onSave,
}: Props) {
  const [credStatus, setCredStatus] = useState<
    Record<PortalId, { hasUser: boolean; hasPassword: boolean }>
  >(
    Object.fromEntries(
      PORTAL_IDS_ORDER.map((id) => [id, { hasUser: false, hasPassword: false }]),
    ) as Record<PortalId, { hasUser: boolean; hasPassword: boolean }>,
  );
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [brityHasPassword, setBrityHasPassword] = useState(false);

  useEffect(() => {
    const api = window.schoolUtil;
    if (!api?.getPortalCredentialStatus) return;
    void Promise.all(
      PORTALS.map(async (p) => {
        const st = await api.getPortalCredentialStatus(p.id);
        return [p.id, st] as const;
      }),
    ).then((rows) => {
      setCredStatus((prev) => {
        const next = { ...prev };
        for (const [id, st] of rows) next[id] = st;
        return next;
      });
    });
    void api.getPortalDebugHelpUrl?.().then((r) => setDebugUrl(r.url));
    void api.getBrityCredentialStatus?.().then((st) =>
      setBrityHasPassword(st.hasPassword),
    );
  }, [
    draft.portalBrowser,
    draft.portalNiceUser,
    draft.portalEdufineUser,
    draft.portalGoeUser,
    draft.brityMessengerPassword,
    draft.brityMessengerShareGoeCredentials,
  ]);

  function patchPortal(
    id: PortalId,
    partial: Partial<AppSettings["portals"]["nice"]>,
  ) {
    onPatch({
      portals: {
        ...draft.portals,
        [id]: { ...draft.portals[id], ...partial },
      },
    });
  }

  function onEducationOfficeChange(officeId: string) {
    const urls = officePresetUrls(officeId);
    if (urls) {
      const portals = {
        ...draft.portals,
        nice: { ...draft.portals.nice, url: urls.nice },
        edufine: { ...draft.portals.edufine, url: urls.edufine },
      };
      if (urls.goePortal) {
        portals.goePortal = {
          ...draft.portals.goePortal,
          url: urls.goePortal,
        };
      }
      onPatch({
        portalEducationOffice: officeId,
        portals,
      });
      return;
    }
    onPatch({ portalEducationOffice: officeId });
  }

  async function clearCredentials(portalId: PortalId) {
    if (
      !window.confirm(
        `${portalLabel(portalId)} 인증서 정보를 삭제할까요?`,
      )
    ) {
      return;
    }
    await window.schoolUtil?.clearPortalCredentials(portalId);
    onPatch({
      [PORTAL_USER_KEYS[portalId]]: "",
      [PORTAL_PASSWORD_KEYS[portalId]]: "",
    });
    setCredStatus((s) => ({
      ...s,
      [portalId]: { hasUser: false, hasPassword: false },
    }));
    await onSave();
  }

  async function clearBrityCredentials() {
    if (!window.confirm("Brity 메신저 인증서 비밀번호를 삭제할까요?")) {
      return;
    }
    await window.schoolUtil?.clearBrityCredentials();
    onPatch({ brityMessengerPassword: "" });
    setBrityHasPassword(false);
    await onSave();
  }

  async function tryBrityNow() {
    setTestMsg(null);
    setBusy(true);
    await onSave();
    const res = await window.schoolUtil?.launchBrityMessenger();
    setBusy(false);
    if (!res) {
      setTestMsg("Electron 앱에서만 실행할 수 있습니다.");
      return;
    }
    if (!res.ok) {
      setTestMsg(res.error);
      return;
    }
    setTestMsg(res.summary ?? "실행을 마쳤습니다.");
  }

  async function tryNow(portalId: PortalId) {
    setTestMsg(null);
    setBusy(true);
    await onSave();
    const res = await window.schoolUtil?.runPortalAutomation(portalId);
    setBusy(false);
    if (!res) {
      setTestMsg("Electron 앱에서만 실행할 수 있습니다.");
      return;
    }
    if (!res.ok) {
      setTestMsg(res.error);
      return;
    }
    setTestMsg(res.summary ?? "실행을 마쳤습니다.");
  }

  return (
    <>
      <p className="muted" style={{ margin: 0 }}>
        업무포털
      </p>
      <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.8rem" }}>
        기본은 <strong>URL만 열기</strong>입니다. 브라우저에서 공동인증서로
        로그인하세요. 아이디·비밀번호는 저장 시{" "}
        <code>schoolutil-secrets.json</code>에만 보관됩니다.
      </p>

      <label>
        로그인 방식
        <select
          value={draft.portalLoginMode}
          onChange={(e) =>
            onPatch({
              portalLoginMode: e.target.value as AppSettings["portalLoginMode"],
            })
          }
        >
          <option value="url_only">URL만 열기 (권장)</option>
          <option value="automation">자동 로그인 시도 (실험)</option>
        </select>
      </label>

      <label>
        교육청 (URL 프리셋)
        <select
          value={draft.portalEducationOffice}
          onChange={(e) => onEducationOfficeChange(e.target.value)}
        >
          {EDUCATION_OFFICE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </label>

      <label>
        브라우저
        <select
          value={draft.portalBrowser}
          onChange={(e) =>
            onPatch({
              portalBrowser: e.target.value as AppSettings["portalBrowser"],
            })
          }
        >
          <option value="default">시스템 기본</option>
          <option value="chrome">Google Chrome</option>
          <option value="edge">Microsoft Edge</option>
          <option value="whale">Naver Whale</option>
        </select>
      </label>

      {PORTALS.map((p) => (
        <div key={p.id} className="portal-settings-block">
          <div className="portal-settings-block-head">
            <strong>{p.label}</strong>
            <label className="portal-settings-toggle">
              <input
                type="checkbox"
                checked={draft.portals[p.id].enabled}
                onChange={(e) =>
                  patchPortal(p.id, { enabled: e.target.checked })
                }
              />
              카드에 표시
            </label>
          </div>
          {formatLastRun(portalLastRun(draft, p.id)) ? (
            <p className="muted portal-settings-last">
              마지막 실행: {formatLastRun(portalLastRun(draft, p.id))}
            </p>
          ) : null}
          <label>
            URL
            <input
              type="url"
              value={draft.portals[p.id].url}
              onChange={(e) => patchPortal(p.id, { url: e.target.value })}
            />
          </label>
          <label>
            인증서 아이디 (자동 로그인·메모용)
            <input
              type="text"
              autoComplete="off"
              value={draft[PORTAL_USER_KEYS[p.id]] as string}
              onChange={(e) =>
                onPatch({
                  [PORTAL_USER_KEYS[p.id]]: e.target.value,
                } as Partial<AppSettings>)
              }
            />
          </label>
          <label>
            인증서 비밀번호 (로컬 암호화)
            <input
              type="password"
              autoComplete="new-password"
              placeholder={
                credStatus[p.id].hasPassword ? "저장됨 — 변경 시만 입력" : ""
              }
              value={draft[PORTAL_PASSWORD_KEYS[p.id]] as string}
              onChange={(e) =>
                onPatch({
                  [PORTAL_PASSWORD_KEYS[p.id]]: e.target.value,
                } as Partial<AppSettings>)
              }
            />
          </label>
          <div className="portal-settings-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => void tryNow(p.id)}
            >
              지금 한 번 해 보기
            </button>
            {(credStatus[p.id].hasUser || credStatus[p.id].hasPassword) && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => void clearCredentials(p.id)}
              >
                저장 지우기
              </button>
            )}
          </div>
        </div>
      ))}

      <div className="portal-settings-block">
        <div className="portal-settings-block-head">
          <strong>Brity 메신저 (앱)</strong>
          <label className="portal-settings-toggle">
            <input
              type="checkbox"
              checked={draft.brityMessengerEnabled}
              onChange={(e) =>
                onPatch({ brityMessengerEnabled: e.target.checked })
              }
            />
            카드에 표시
          </label>
        </div>
        {formatLastRun(draft.brityMessengerLastRun) ? (
          <p className="muted portal-settings-last">
            마지막 실행: {formatLastRun(draft.brityMessengerLastRun)}
          </p>
        ) : null}
        <p className="muted" style={{ fontSize: "0.8rem", margin: "0 0 8px" }}>
          «로그인 방식»이 <strong>자동 로그인 시도</strong>일 때 인증서 로그인
          선택·«로그인» 클릭 후 K-Sign 등 OS 창에 암호를 넣습니다. 인증서
          목록 선택은 수동입니다.
        </p>
        <label>
          <input
            type="checkbox"
            checked={draft.portalOsCertInput}
            onChange={(e) => onPatch({ portalOsCertInput: e.target.checked })}
          />
          인증서 비밀번호 OS 창 자동 입력 (실험, Brity·업무포털 공용)
        </label>
        <label>
          설치 폴더 또는 실행 파일 (비우면 C:\BrityWorks\BrityMessenger 등 탐색)
          <input
            type="text"
            autoComplete="off"
            placeholder="C:\BrityWorks\BrityMessenger"
            value={draft.brityMessengerExePath}
            onChange={(e) =>
              onPatch({ brityMessengerExePath: e.target.value })
            }
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.brityMessengerShareGoeCredentials}
            onChange={(e) =>
              onPatch({ brityMessengerShareGoeCredentials: e.target.checked })
            }
          />
          경기 업무포털과 같은 인증서 정보 사용
        </label>
        <label>
          인증서 표시 이름 (목록에서 직접 고를 때 참고)
          <input
            type="text"
            autoComplete="off"
            disabled={draft.brityMessengerShareGoeCredentials}
            value={
              draft.brityMessengerShareGoeCredentials
                ? draft.portalGoeUser
                : draft.brityMessengerCertLabel
            }
            onChange={(e) =>
              onPatch({ brityMessengerCertLabel: e.target.value })
            }
          />
        </label>
        {!draft.brityMessengerShareGoeCredentials ? (
          <label>
            인증서 비밀번호 (로컬 암호화)
            <input
              type="password"
              autoComplete="new-password"
              placeholder={brityHasPassword ? "저장됨 — 변경 시만 입력" : ""}
              value={draft.brityMessengerPassword}
              onChange={(e) =>
                onPatch({ brityMessengerPassword: e.target.value })
              }
            />
          </label>
        ) : null}
        <div className="portal-settings-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={busy || !draft.brityMessengerEnabled}
            onClick={() => void tryBrityNow()}
          >
            지금 한 번 해 보기
          </button>
          {!draft.brityMessengerShareGoeCredentials &&
          (brityHasPassword || draft.brityMessengerPassword) ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => void clearBrityCredentials()}
            >
              저장 지우기
            </button>
          ) : null}
        </div>
      </div>

      <details className="portal-settings-advanced">
        <summary>고급 · 자동 로그인 (실험, 공용 PC 비권장)</summary>
        <p className="muted" style={{ fontSize: "0.8rem", margin: "8px 0 0" }}>
          Chrome/Edge CDP·인증서 OS 입력은 POC입니다. 공동인증서 자동 로그인을
          보장하지 않습니다.
        </p>
        <label>
          <input
            type="checkbox"
            checked={draft.portalAutoLogin}
            onChange={(e) => onPatch({ portalAutoLogin: e.target.checked })}
          />
          앱 시작 시 자동 로그인 (기본 꺼짐)
        </label>
        <label>
          시작 지연
          <select
            value={draft.portalAutoLoginDelay}
            onChange={(e) =>
              onPatch({
                portalAutoLoginDelay: e.target
                  .value as AppSettings["portalAutoLoginDelay"],
              })
            }
          >
            <option value="0">바로</option>
            <option value="20">20초 뒤</option>
            <option value="45">45초 뒤</option>
            <option value="manual">직접 누를 때만</option>
          </select>
        </label>
        <label>
          자동 로그인 대상
          <select
            value={draft.portalAutomationTarget}
            onChange={(e) =>
              onPatch({
                portalAutomationTarget: e.target.value as PortalId,
              })
            }
          >
            {PORTALS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>
        {draft.portalLoginMode === "automation" && debugUrl ? (
          <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
            Chrome/Edge 원격 디버깅:{" "}
            <button
              type="button"
              className="btn-primary portal-settings-inline-btn"
              onClick={() => void window.schoolUtil?.openExternal(debugUrl)}
            >
              안내 열기
            </button>
          </p>
        ) : null}
        <label>
          <input
            type="checkbox"
            checked={draft.portalOsCertInput}
            onChange={(e) => onPatch({ portalOsCertInput: e.target.checked })}
          />
          인증서 비밀번호 OS 창 자동 입력 (실험)
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.portalSessionExtend}
            onChange={(e) => onPatch({ portalSessionExtend: e.target.checked })}
          />
          세션 자동 연장 (POC)
        </label>
        {draft.portalSessionExtend && (
          <label>
            연장 주기(분)
            <select
              value={draft.portalSessionExtendMinutes}
              onChange={(e) =>
                onPatch({
                  portalSessionExtendMinutes: Number(
                    e.target.value,
                  ) as AppSettings["portalSessionExtendMinutes"],
                })
              }
            >
              <option value={30}>30</option>
              <option value={40}>40</option>
              <option value={50}>50</option>
            </select>
          </label>
        )}
      </details>

      <button
        type="button"
        className="btn-primary portal-settings-log-btn"
        onClick={() => void window.schoolUtil?.openPortalLog()}
      >
        실행 기록 열기 (portal.log)
      </button>

      {testMsg ? (
        <p className="muted" style={{ fontSize: "0.85rem" }} role="status">
          {testMsg}
        </p>
      ) : null}
    </>
  );
}
