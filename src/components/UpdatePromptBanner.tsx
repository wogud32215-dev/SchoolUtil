import type { AppUpdateUiPhase } from "@/hooks/useAppUpdatePrompt";

type Props = {
  version: string | null;
  phase: AppUpdateUiPhase;
  percent: number;
  transferred: number;
  total: number;
  error: string | null;
  onDismissAvailable: () => void;
  onDeferInstall: () => void;
  onDownload: () => void;
  onInstall: () => void;
};

function formatSizeMb(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function progressDetail(
  percent: number,
  transferred: number,
  total: number,
): string {
  const pct = Math.round(Math.min(100, Math.max(0, percent)));
  const got = formatSizeMb(transferred);
  const all = formatSizeMb(total);
  if (got && all) {
    return `${pct}% · ${got} / ${all}`;
  }
  if (pct > 0) {
    return `${pct}%`;
  }
  return "서버에 연결하는 중…";
}

export function UpdatePromptBanner({
  version,
  phase,
  percent,
  transferred,
  total,
  error,
  onDismissAvailable,
  onDeferInstall,
  onDownload,
  onInstall,
}: Props) {
  if (!version && phase !== "downloaded") return null;

  const clampedPercent = Math.min(100, Math.max(0, percent));
  const showBar = phase === "downloading";
  const barWidth = clampedPercent >= 1 ? clampedPercent : 8;

  const label =
    phase === "downloaded"
      ? version
        ? `버전 ${version} 다운로드를 마쳤습니다.`
        : "업데이트 다운로드를 마쳤습니다."
      : phase === "downloading"
        ? version
          ? `버전 ${version} 업데이트 다운로드 중`
          : "업데이트 다운로드 중"
        : `새 버전 ${version}이 있습니다.`;

  return (
    <div
      className={`update-prompt-banner${showBar ? " update-prompt-banner--downloading" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="update-prompt-banner-body">
        <span className="update-prompt-banner-text">{label}</span>
        {showBar ? (
          <div className="update-prompt-progress-block">
            <div
              className={`update-prompt-progress-track${clampedPercent < 1 ? " update-prompt-progress-track--pending" : ""}`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(clampedPercent)}
              aria-label="업데이트 다운로드 진행률"
            >
              <div
                className="update-prompt-progress-fill"
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className="update-prompt-progress-detail">
              {progressDetail(clampedPercent, transferred, total)}
            </span>
          </div>
        ) : null}
        {error ? (
          <span className="update-prompt-banner-error">{error}</span>
        ) : null}
      </div>
      <div className="update-prompt-banner-actions">
        {phase === "available" ? (
          <>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void onDownload()}
            >
              지금 받기
            </button>
            <button type="button" onClick={onDismissAvailable}>
              나중에
            </button>
          </>
        ) : null}
        {phase === "downloaded" ? (
          <>
            <button type="button" className="btn-primary" onClick={onInstall}>
              지금 설치·재시작
            </button>
            <button type="button" onClick={onDeferInstall}>
              다음 실행 시
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
