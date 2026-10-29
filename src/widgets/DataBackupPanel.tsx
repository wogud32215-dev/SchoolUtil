import { useEffect, useState } from "react";
import {
  clearUpdateCheckFeedback,
  markUpdateCheckStarted,
  useUpdateCheckFeedback,
} from "@/hooks/useAppUpdatePrompt";

export function DataBackupPanel() {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const checkFeedback = useUpdateCheckFeedback();

  useEffect(() => {
    if (checkFeedback) {
      setStatus(checkFeedback);
    }
  }, [checkFeedback]);

  async function exportData() {
    setBusy(true);
    setStatus(null);
    clearUpdateCheckFeedback();
    const res = await window.schoolUtil?.exportBackup?.();
    setBusy(false);
    if (!res) {
      setStatus("Electron 앱에서만 사용할 수 있습니다.");
      return;
    }
    if (!res.ok && "cancelled" in res && res.cancelled) return;
    if (res.ok) {
      setStatus("백업 파일을 저장했습니다.");
    } else if (!res.ok && "error" in res) {
      setStatus(res.error ?? "보내기에 실패했습니다.");
    }
  }

  async function importData() {
    if (
      !window.confirm(
        "백업 파일로 덮어씁니다. 현재 데이터는 직전 백업으로 남습니다. 계속할까요?",
      )
    ) {
      return;
    }
    setBusy(true);
    setStatus(null);
    clearUpdateCheckFeedback();
    const res = await window.schoolUtil?.importBackup?.();
    setBusy(false);
    if (!res) {
      setStatus("Electron 앱에서만 사용할 수 있습니다.");
      return;
    }
    if (!res.ok && "cancelled" in res && res.cancelled) return;
    if (res.ok) {
      setStatus("백업을 불러왔습니다. 화면이 갱신됩니다.");
      window.location.reload();
    } else if (!res.ok && "error" in res) {
      setStatus(res.error ?? "불러오기에 실패했습니다.");
    }
  }

  async function checkUpdate() {
    setBusy(true);
    clearUpdateCheckFeedback();
    markUpdateCheckStarted();
    const res = await window.schoolUtil?.checkForUpdates?.();
    setBusy(false);
    if (!res?.ok) {
      setStatus(res?.error ?? "업데이트를 확인할 수 없습니다.");
    }
  }

  return (
    <div className="backup-panel">
      <div className="backup-panel-guide" role="note" aria-label="백업 안내">
        <p className="backup-panel-guide-title">백업 안내</p>
        <ul className="backup-panel-guide-list">
          <li>
            <strong>자동</strong> — 할 일·설정 등을 저장할 때마다{" "}
            <code className="backup-panel-code">%APPDATA%\SchoolUtil</code>에
            직전 파일(
            <code className="backup-panel-code">schoolutil-data.backup.json</code>
            )과 날짜별 백업(최근 5일)이 남습니다.
          </li>
          <li>
            <strong>권장</strong> — 학기 시작이나 중요한 입력 후 아래{" "}
            <strong>보내기</strong>로 JSON을 USB·OneDrive 등에 따로 보관하세요.
          </li>
          <li>
            <strong>주의</strong> — Chrome 탭이 아닌 <strong>SchoolUtil</strong>{" "}
            앱 창에서만 디스크에 저장됩니다. 보내기 파일에는 API 키·비밀번호가
            들어갈 수 있으니 공유·공개 폴더에 올리지 마세요.
          </li>
          <li>
            <strong>업데이트</strong> — GitHub Releases에서 설치한 버전은 앱
            실행·12시간마다 자동으로 새 버전을 확인합니다. 상단 배너에서 받을
            수 있습니다.
          </li>
        </ul>
      </div>
      <div className="input-row">
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={() => void exportData()}
        >
          보내기
        </button>
        <button type="button" disabled={busy} onClick={() => void importData()}>
          불러오기
        </button>
        <button type="button" disabled={busy} onClick={() => void checkUpdate()}>
          업데이트 확인
        </button>
      </div>
      {status && (
        <p className="muted" style={{ margin: "8px 0 0" }} role="status">
          {status}
        </p>
      )}
    </div>
  );
}
