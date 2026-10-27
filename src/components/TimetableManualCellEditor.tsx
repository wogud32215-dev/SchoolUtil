import { useEffect, useRef } from "react";
import { SettingsSegmented } from "@/components/settings/SettingsSegmented";
import type { TimetableManualScope } from "@/types/state";
import { TIMETABLE_DAY_LABELS } from "@/utils/timetableSubstitute";

type Props = {
  open: boolean;
  dayIndex: number;
  period: number;
  label: string;
  scope: TimetableManualScope;
  onLabelChange: (label: string) => void;
  onScopeChange: (scope: TimetableManualScope) => void;
  onSave: () => void;
  onRemove: () => void;
  onClose: () => void;
};

export function TimetableManualCellEditor({
  open,
  dayIndex,
  period,
  label,
  scope,
  onLabelChange,
  onScopeChange,
  onSave,
  onRemove,
  onClose,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open, dayIndex, period]);

  if (!open) return null;

  const day = TIMETABLE_DAY_LABELS[dayIndex] ?? "";

  return (
    <div
      className="tt-manual-editor-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="tt-manual-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tt-manual-editor-title"
      >
        <h3 id="tt-manual-editor-title" className="tt-manual-editor-title">
          수업 추가 · {day} {period}교시
        </h3>
        <p className="tt-manual-editor-hint muted">
          컴시간에 없는 칸(창체 등)을 채울 때 사용합니다.
        </p>
        <div className="tt-manual-editor-scope">
          <SettingsSegmented
            aria-label="반복"
            value={scope}
            onChange={(v) => onScopeChange(v as TimetableManualScope)}
            options={[
              { value: "weekly", label: "매주" },
              { value: "week", label: "이번 주만" },
            ]}
          />
        </div>
        <input
          ref={inputRef}
          className="tt-manual-editor-input"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="예: 창체"
          maxLength={40}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onClose();
          }}
        />
        <div className="tt-manual-editor-actions">
          <button type="button" className="tt-manual-editor-remove" onClick={onRemove}>
            삭제
          </button>
          <button type="button" className="btn-primary" onClick={onSave}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
