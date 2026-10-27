import type { ReactNode } from "react";

type Props = {
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  children: ReactNode;
};

export function SettingsToggleChip({
  pressed,
  onPressedChange,
  children,
}: Props) {
  return (
    <button
      type="button"
      className={`settings-toggle-chip${pressed ? " is-on" : ""}`}
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
    >
      {children}
    </button>
  );
}

export function SettingsToggleChipGrid({ children }: { children: ReactNode }) {
  return <div className="settings-chip-grid">{children}</div>;
}
