type Props = {
  size?: number;
  className?: string;
};

/** 내선번호 도크·버튼용 전화 아이콘 */
export function PhoneIcon({ size = 22, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M5.5 4.5h3l1.2 2.8a1 1 0 0 1-.23 1.05l-1.4 1.4a12.5 12.5 0 0 0 5.48 5.48l1.4-1.4a1 1 0 0 1 1.05-.23l2.8 1.2v3a1.5 1.5 0 0 1-1.5 1.5C9.6 19.3 4.7 14.4 4.5 6A1.5 1.5 0 0 1 5.5 4.5Z"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
