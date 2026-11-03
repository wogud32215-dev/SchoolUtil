import { useEffect, useState } from "react";
import { SettingsSegmented } from "@/components/settings/SettingsSegmented";

type FeedbackCategory = "inquiry" | "feature";

type Props = {
  open: boolean;
  onClose: () => void;
};

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string }[] = [
  { value: "inquiry", label: "문의" },
  { value: "feature", label: "기능 요청" },
];

export function FeedbackModal({ open, onClose }: Props) {
  const [category, setCategory] = useState<FeedbackCategory>("inquiry");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategory("inquiry");
    setSubject("");
    setBody("");
    setReplyEmail("");
    setSending(false);
    setError(null);
    setSuccess(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.documentElement.classList.add("feedback-modal-open");
    void window.schoolUtil?.wakeForInput?.();
    return () => {
      document.documentElement.classList.remove("feedback-modal-open");
    };
  }, [open]);

  if (!open) return null;

  function handleClose() {
    if (sending) return;
    onClose();
  }

  async function handleSubmit() {
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    const trimmedReply = replyEmail.trim();

    if (!trimmedSubject || !trimmedBody) {
      setError("제목과 본문을 입력해 주세요.");
      return;
    }

    const api = window.schoolUtil?.submitFeedback;
    if (!api) {
      setError(
        "Electron 앱 창에서만 보낼 수 있습니다. Chrome 탭(localhost)이나 광고 차단 확장은 formsubmit.co를 막을 수 있습니다.",
      );
      return;
    }

    setSending(true);
    setError(null);
    try {
      const res = await api({
        category,
        subject: trimmedSubject,
        body: trimmedBody,
        replyEmail: trimmedReply,
      });
      if (res.ok) {
        setSuccess(true);
        window.setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setError(res.error);
      }
    } catch {
      setError("전송 중 오류가 났습니다.");
    } finally {
      setSending(false);
    }
  }

  async function handleMailto() {
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    const trimmedReply = replyEmail.trim();

    if (!trimmedSubject || !trimmedBody) {
      setError("제목과 본문을 입력해 주세요.");
      return;
    }

    const api = window.schoolUtil?.openFeedbackMailto;
    if (!api) {
      setError("Electron 앱 창에서만 메일 앱을 열 수 있습니다.");
      return;
    }

    setError(null);
    const res = await api({
      category,
      subject: trimmedSubject,
      body: trimmedBody,
      replyEmail: trimmedReply,
    });
    if (!res.ok) {
      setError(res.error);
    }
  }

  return (
    <div
      className="feedback-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="feedback-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
      >
        <header className="feedback-modal-header">
          <h2 id="feedback-modal-title">문의·요청 보내기</h2>
          <button
            type="button"
            className="settings-modal-close"
            onClick={handleClose}
            disabled={sending}
            aria-label="닫기"
          >
            ×
          </button>
        </header>
        <div className="feedback-modal-body">
          {success ? (
            <p className="feedback-modal-success" role="status">
              보냈습니다. 확인 후 필요하면 회신드리겠습니다.
            </p>
          ) : (
            <>
              <label className="feedback-modal-field">
                <span className="feedback-modal-label">구분</span>
                <SettingsSegmented
                  value={category}
                  options={CATEGORY_OPTIONS}
                  onChange={setCategory}
                  aria-label="문의 구분"
                />
              </label>
              <label className="feedback-modal-field">
                <span className="feedback-modal-label">제목</span>
                <input
                  className="settings-control"
                  type="text"
                  maxLength={120}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="한 줄로 요약"
                  disabled={sending}
                />
              </label>
              <label className="feedback-modal-field">
                <span className="feedback-modal-label">내용</span>
                <textarea
                  className="settings-control feedback-modal-textarea"
                  rows={8}
                  maxLength={4000}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="증상, 원하는 기능, 재현 방법 등을 적어 주세요."
                  disabled={sending}
                />
              </label>
              <label className="feedback-modal-field">
                <span className="feedback-modal-label">회신 이메일 (선택)</span>
                <input
                  className="settings-control"
                  type="email"
                  autoComplete="email"
                  value={replyEmail}
                  onChange={(e) => setReplyEmail(e.target.value)}
                  placeholder="답변이 필요하면 입력"
                  disabled={sending}
                />
              </label>
              <p className="muted feedback-modal-hint">
                앱 버전·OS·설정에 적힌 학교 이름만 함께 전송됩니다. NEIS 키·포털
                비밀번호 등은 포함되지 않습니다. «보내기»는 앱 밖(메인)에서
                전송하므로 DevTools의 <code>ERR_BLOCKED_BY_CLIENT</code>와
                무관합니다.
              </p>
              {error ? (
                <p className="feedback-modal-error" role="alert">
                  {error}
                </p>
              ) : null}
            </>
          )}
        </div>
        {!success ? (
          <footer className="feedback-modal-footer">
            <button
              type="button"
              className="settings-inline-btn feedback-modal-mailto"
              onClick={() => void handleMailto()}
              disabled={sending}
            >
              메일 앱으로 보내기
            </button>
            <div className="feedback-modal-footer-actions">
              <button
                type="button"
                className="settings-inline-btn"
                onClick={handleClose}
                disabled={sending}
              >
                취소
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleSubmit()}
                disabled={sending}
              >
                {sending ? "보내는 중…" : "보내기"}
              </button>
            </div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
