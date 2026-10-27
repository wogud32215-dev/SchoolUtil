import { useEffect, useState } from "react";
import type { AppSettings, LayoutPreset } from "@/types/state";
import { SettingsWidget } from "@/widgets/SettingsWidget";

type Props = {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (settings: AppSettings) => Promise<boolean>;
  onApplyLayoutPreset: (preset: LayoutPreset) => Promise<boolean>;
  onResetLayout: () => void;
  onPreviewTodayGlance?: () => void;
};

export function SettingsModal({
  open,
  settings,
  onClose,
  onSave,
  onApplyLayoutPreset,
  onResetLayout,
  onPreviewTodayGlance,
}: Props) {
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    window.schoolUtil?.getAppVersion?.().then(setAppVersion).catch(() => {});
  }, [open]);

  if (!open) return null;

  const peek = settings.designPeek;

  return (
    <div
      className={`settings-modal-backdrop${peek ? " settings-modal-backdrop--peek" : ""}`}
      role="presentation"
      onClick={(e) => {
        if (peek) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`settings-modal${peek ? " settings-modal--peek" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        <header className="settings-modal-header">
          <div className="settings-modal-title-block">
            <h2 id="settings-modal-title">설정</h2>
            {appVersion ? (
              <span className="settings-modal-version">v{appVersion}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="settings-modal-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </header>
        <div className="settings-modal-body">
          <SettingsWidget
            settings={settings}
            onSave={onSave}
            onApplyLayoutPreset={onApplyLayoutPreset}
            onResetLayout={onResetLayout}
            onPreviewTodayGlance={onPreviewTodayGlance}
          />
        </div>
      </div>
    </div>
  );
}
