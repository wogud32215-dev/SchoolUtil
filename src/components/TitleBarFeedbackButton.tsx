type Props = {
  onClick: () => void;
};

/** 제목줄 우측 — 내선번호 버튼 옆 */
export function TitleBarFeedbackButton({ onClick }: Props) {
  return (
    <button
      type="button"
      className="title-bar-feedback-btn"
      title="문의·요청 보내기"
      aria-label="문의하기"
      onClick={onClick}
    >
      문의하기
    </button>
  );
}
