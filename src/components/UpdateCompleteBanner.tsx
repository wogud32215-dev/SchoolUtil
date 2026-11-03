import { UpdateReleaseNotesList } from "@/components/UpdateReleaseNotesList";

type Props = {
  version: string;
  releaseNotes: string[];
  onDismiss: () => void;
};

export function UpdateCompleteBanner({
  version,
  releaseNotes,
  onDismiss,
}: Props) {
  return (
    <div
      className="update-prompt-banner update-prompt-banner--completed"
      role="status"
      aria-live="polite"
    >
      <div className="update-prompt-banner-body">
        <span className="update-prompt-banner-text">
          버전 {version}으로 업데이트되었습니다.
        </span>
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
