import type { ComciganClassLabelMode, TimetableData } from "@/types/state";
import { formatClassCodeDisplay } from "@/utils/jeilClassLabels";
import { listSubstituteEntries } from "@/utils/timetableSubstitute";

type Props = {
  open: boolean;
  timetable: TimetableData;
  classLabelMode?: ComciganClassLabelMode;
  onClose: () => void;
};

export function ComciganSubstituteModal({
  open,
  timetable,
  classLabelMode = "jeil",
  onClose,
}: Props) {
  if (!open) return null;

  const entries = listSubstituteEntries(timetable, classLabelMode);

  return (
    <div
      className="comcigan-substitute-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="comcigan-substitute-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="comcigan-substitute-title"
      >
        <header className="comcigan-substitute-header">
          <h2 id="comcigan-substitute-title">교체 시간표 알림</h2>
          <p className="muted">
            아래는 컴시간에서 가져온 교체 수업입니다. 날짜·교시·반·과목을
            확인하세요.
          </p>
        </header>
        <div className="comcigan-substitute-body">
          {entries.length === 0 ? (
            <p className="muted">교체 수업 정보를 찾지 못했습니다.</p>
          ) : (
            <ul className="comcigan-substitute-list">
              {entries.map((e) => (
                <li key={`${e.dateYmd}-${e.period}-${e.classCode}-${e.subject}`}>
                  <p className="comcigan-substitute-when">{e.whenLabel}</p>
                  {e.gradeClassLabel ? (
                    <p className="comcigan-substitute-class">{e.gradeClassLabel}</p>
                  ) : null}
                  <div className="comcigan-substitute-diff">
                    <div className="comcigan-substitute-diff-row">
                      <span className="comcigan-substitute-diff-label">원래</span>
                      <span className="comcigan-substitute-diff-value comcigan-substitute-diff-value--orig">
                        {e.originalSubject}
                      </span>
                    </div>
                    <div className="comcigan-substitute-diff-row">
                      <span className="comcigan-substitute-diff-label">변경</span>
                      <span className="comcigan-substitute-diff-value comcigan-substitute-diff-value--now">
                        {e.classCode
                          ? `${formatClassCodeDisplay(e.classCode, classLabelMode)} ${e.subject}`.trim()
                          : e.subject}
                        <span className="comcigan-substitute-inline-badge">교체</span>
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="comcigan-substitute-footer">
          <button type="button" className="btn-primary" onClick={onClose}>
            확인
          </button>
        </footer>
      </div>
    </div>
  );
}
