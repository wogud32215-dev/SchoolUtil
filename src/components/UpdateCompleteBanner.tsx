import { UpdateReleaseNotesList } from "@/components/UpdateReleaseNotesList";

type Props = {
  version: string;
  previousVersion: string | null;
  releaseNotes: string[];
  onDismiss: () => void;
};

export function UpdateCompleteBanner({
  version,
  previousVersion,
  releaseNotes,
  onDismiss,
}: Props) {
  const versionLabel =
    previousVersion && previousVersion !== version
      ? `v${previousVersion} → v${version}`
      : `v${version}`;

  return (
    <div
      className="update-prompt-banner update-prompt-banner--completed"
      role="status"
      aria-live="polite"
    >
      <div className="update-prompt-banner-body">
        <span className="update-prompt-banner-text">{versionLabel}</span>
        <span className="update-prompt-banner-subtitle">기능 개선</span>
        <UpdateReleaseNotesList notes={releaseNotes} />
      </div>
      <div className="update-prompt-banner-actions">
        <button type="button" className="btn-primary" onClick={onDismiss}>
          확인
        </button>
      </div>
    </div>
  );
}
