import type { AppUpdateUiPhase } from "@/hooks/useAppUpdatePrompt";

type Props = {
  version: string | null;
  phase: AppUpdateUiPhase;
  percent: number;
  error: string | null;
  onDismissAvailable: () => void;
  onDeferInstall: () => void;
  onDownload: () => void;
  onInstall: () => void;
};

export function UpdatePromptBanner({
  version,
  phase,
  percent,
  error,
  onDismissAvailable,
  onDeferInstall,
  onDownload,
  onInstall,
}: Props) {
  if (!version && phase !== "downloaded") return null;

  const label =
    phase === "downloaded"
      ? version
        ? `버전 ${version} 다운로드를 마쳤습니다.`
        : "업데이트 다운로드를 마쳤습니다."
      : phase === "downloading"
        ? `버전 ${version} 다운로드 중… ${Math.round(percent)}%`
        : `새 버전 ${version}이 있습니다.`;

  return (
    <div className="update-prompt-banner" role="status" aria-live="polite">
      <span className="update-prompt-banner-text">{label}</span>
      {error ? (
        <span className="update-prompt-banner-error">{error}</span>
      ) : null}
      <div className="update-prompt-banner-actions">
        {phase === "available" ? (
          <>
            <button type="button" className="btn-primary" onClick={() => void onDownload()}>
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
