import { useState } from "react";
import type { AppSettings, PortalId } from "@/types/state";
import { PORTAL_CARD_LABELS } from "@/utils/portalLabels";
import { PORTAL_IDS_ORDER } from "@/utils/portalSettings";

/** 위젯 카드에는 짧은 이름만 표시 (설정 화면 라벨과 분리) */
const WIDGET_PORTAL_LABELS: Record<PortalId, string> = {
  nice: "나이스",
  edufine: "에듀파인",
  goePortal: "업무포털",
};

type Props = {
  settings: AppSettings;
};

export function WorkPortalWidget({ settings }: Props) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function launch(portalId: PortalId) {
    setErrorMsg(null);
    setBusy(true);
    const res = await window.schoolUtil?.launchPortal(portalId);
    setBusy(false);
    if (!res) {
      setErrorMsg("Electron 앱에서만 실행할 수 있습니다.");
      return;
    }
    if (!res.ok) {
      setErrorMsg(res.error);
    }
  }

  return (
    <div className="work-portal-widget">
      <div className="portal-actions portal-actions--widget">
        {PORTAL_IDS_ORDER.map((id) => {
          const label = WIDGET_PORTAL_LABELS[id] ?? PORTAL_CARD_LABELS[id];
          const entry = settings.portals[id];
          return (
            <button
              key={id}
              type="button"
              className="btn-primary portal-open-btn"
              disabled={busy || !entry.enabled}
              onClick={() => void launch(id)}
            >
              {label} 열기
            </button>
          );
        })}
      </div>
      {errorMsg ? (
        <p className="work-portal-msg work-portal-msg--error" role="alert">
          {errorMsg}
        </p>
      ) : null}
    </div>
  );
}
