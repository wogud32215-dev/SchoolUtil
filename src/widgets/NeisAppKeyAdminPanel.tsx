import { useState } from "react";
import type { NeisKeyStatus } from "@/types/state";
import { SettingsRow } from "@/components/settings/SettingsRow";

type Props = {
  status: NeisKeyStatus;
  onUpdated: () => Promise<void>;
};

export function NeisAppKeyAdminPanel({ status, onUpdated }: Props) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!status.canManageAppKey) return null;

  async function save() {
    setBusy(true);
    setMessage(null);
    const api = window.schoolUtil;
    if (!api?.setAppNeisKey) {
      setMessage("Electron 앱에서만 저장할 수 있습니다.");
      setBusy(false);
      return;
    }
    const res = await api.setAppNeisKey(draft);
    setBusy(false);
    if (!res.ok) {
      setMessage(res.error);
      return;
    }
    setDraft("");
    setMessage(
      status.hasAppKey || draft.trim()
        ? "공용 NEIS 키를 저장했습니다. 배포용 설치 파일은 npm run dist 로 다시 만드세요."
        : "공용 NEIS 키를 지웠습니다.",
    );
    await onUpdated();
  }

  return (
    <SettingsRow
      title="배포자 · 공용 NEIS 키"
      hint="Git에 올라가지 않습니다. 사용자 화면에 키가 보이지 않습니다."
    >
      <div className="settings-field-stack">
        <p className="muted" style={{ margin: 0 }}>
          현재:{" "}
          {status.hasAppKey
            ? "공용 키가 설정됨"
            : "공용 키 없음 (개발: config/neis-shared.key)"}
        </p>
        <input
          className="settings-control"
          type="password"
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="새 공용 API 키 (비우고 저장하면 삭제)"
        />
        <button
          type="button"
          className="settings-inline-btn settings-inline-btn--primary"
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? "저장 중…" : "공용 키 저장"}
        </button>
        {message && <p className="muted" style={{ margin: 0 }}>{message}</p>}
      </div>
    </SettingsRow>
  );
}
