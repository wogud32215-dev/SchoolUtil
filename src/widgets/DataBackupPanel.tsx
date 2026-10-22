import { useEffect, useState } from "react";

export function DataBackupPanel() {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unavail = window.schoolUtil?.onUpdateAvailable?.((payload) => {
      if (
        window.confirm(
          `새 버전 ${payload.version}이 있습니다. 지금 받을까요?`,
        )
      ) {
        setBusy(true);
        setStatus("업데이트 다운로드 중…");
        void window.schoolUtil?.downloadUpdate?.().then((res) => {
          setBusy(false);
          if (!res?.ok) {
            setStatus(res?.error ?? "다운로드에 실패했습니다.");
          }
        });
      }
    });
    const undown = window.schoolUtil?.onUpdateDownloaded?.(() => {
      if (window.confirm("다운로드를 마쳤습니다. 지금 설치하고 다시 시작할까요?")) {
        void window.schoolUtil?.installUpdate?.();
      } else {
        setStatus("다음 실행 시 업데이트가 적용됩니다.");
      }
    });
    return () => {
      unavail?.();
      undown?.();
    };
  }, []);

  async function exportData() {
    setBusy(true);
    setStatus(null);
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
    setStatus(null);
    const res = await window.schoolUtil?.checkForUpdates?.();
    setBusy(false);
    if (!res?.ok) {
      setStatus(res?.error ?? "업데이트를 확인할 수 없습니다.");
      return;
    }
    setStatus("업데이트 확인 중… 잠시 후 알림이 뜹니다.");
  }

  return (
    <div className="backup-panel">
      <p className="muted" style={{ margin: "0 0 8px" }}>
        저장할 때마다 `%APPDATA%\\SchoolUtil`에 자동 백업이 남습니다.
      </p>
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
