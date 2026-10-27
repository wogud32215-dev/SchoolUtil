type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

export function SettingsSwitch({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`settings-switch${checked ? " is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="settings-switch-track" aria-hidden="true">
        <span className="settings-switch-thumb" />
      </span>
      <span className="settings-switch-label">{label}</span>
    </button>
  );
}
