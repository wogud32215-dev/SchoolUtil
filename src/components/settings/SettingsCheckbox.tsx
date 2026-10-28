import type { ReactNode } from "react";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

export function SettingsCheckbox({
  checked,
  onChange,
  children,
  className,
  disabled,
}: Props) {
  return (
    <label
      className={`settings-checkbox${className ? ` ${className}` : ""}${
        disabled ? " is-disabled" : ""
      }`}
    >
      <input
        type="checkbox"
        className="settings-checkbox-input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="settings-checkbox-box" aria-hidden="true">
        <svg
          className="settings-checkbox-mark"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2.5 6.2 5 8.8 9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="settings-checkbox-label">{children}</span>
    </label>
  );
}
