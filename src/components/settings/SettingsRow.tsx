import type { ReactNode } from "react";

type Props = {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

export function SettingsRow({ title, hint, children, className }: Props) {
  return (
    <div className={`settings-row${className ? ` ${className}` : ""}`}>
      <div className="settings-row-label">
        <span className="settings-row-title">{title}</span>
      </div>
      <div className="settings-row-body">
        {children}
        {hint ? <p className="settings-row-hint">{hint}</p> : null}
      </div>
    </div>
  );
}
