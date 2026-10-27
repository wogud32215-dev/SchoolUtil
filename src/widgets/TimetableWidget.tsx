import { useMemo, useState } from "react";
import { ComciganTimetableGrid } from "@/components/ComciganTimetableGrid";
import { TimetableManualCellEditor } from "@/components/TimetableManualCellEditor";
import type { TimetableData, TimetableManualScope } from "@/types/state";
import { hasComciganView } from "@/utils/comciganTimetable";
import { emptyGrid, normalizeTimetable } from "@/utils/timetable";
import {
  buildTimetableForDisplay,
  removeManualSlot,
  resolveManualSlotAt,
  upsertManualSlot,
} from "@/utils/timetableManual";
import { isSubstituteCell } from "@/utils/timetableSubstitute";

const DAYS = ["월", "화", "수", "목", "금"];

type Props = {
  data: TimetableData;
  onChange: (data: TimetableData) => void;
  autoSync?: boolean;
};

type ManualEditorState = {
  dayIndex: number;
  periodIndex: number;
  label: string;
  scope: TimetableManualScope;
};

function weekdayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

export function TimetableWidget({ data, onChange, autoSync }: Props) {
  const tt = normalizeTimetable(data);
  const displayTt = useMemo(() => buildTimetableForDisplay(tt), [tt]);
  const [edit, setEdit] = useState(false);
  const [manualEditor, setManualEditor] = useState<ManualEditorState | null>(
    null,
  );
  const todayIdx = weekdayIndex();
  const highlightToday = todayIdx <= 4;
  const comciganMode = Boolean(
    autoSync && hasComciganView(displayTt) && displayTt.comciganView,
  );

  if (comciganMode && displayTt.comciganView) {
    return (
      <div className="tt-comcigan-only">
        <ComciganTimetableGrid
          periodCount={displayTt.periodCount}
          view={displayTt.comciganView}
          todayDayIndex={highlightToday ? todayIdx : -1}
          onManualCellClick={(dayIndex, periodIndex) => {
            const existing = resolveManualSlotAt(tt, dayIndex, periodIndex);
            setManualEditor({
              dayIndex,
              periodIndex,
              label: existing?.label ?? "창체",
              scope: existing?.scope ?? "weekly",
            });
          }}
        />
        <TimetableManualCellEditor
          open={manualEditor !== null}
          dayIndex={manualEditor?.dayIndex ?? 0}
          period={(manualEditor?.periodIndex ?? 0) + 1}
          label={manualEditor?.label ?? ""}
          scope={manualEditor?.scope ?? "weekly"}
          onLabelChange={(label) =>
            setManualEditor((prev) => (prev ? { ...prev, label } : prev))
          }
          onScopeChange={(scope) =>
            setManualEditor((prev) => (prev ? { ...prev, scope } : prev))
          }
          onClose={() => setManualEditor(null)}
          onSave={() => {
            if (!manualEditor) return;
            onChange(
              upsertManualSlot(
                tt,
                manualEditor.dayIndex,
                manualEditor.periodIndex,
                manualEditor.label,
                manualEditor.scope,
              ),
            );
            setManualEditor(null);
          }}
          onRemove={() => {
            if (!manualEditor) return;
            onChange(
              removeManualSlot(
                tt,
                manualEditor.dayIndex,
                manualEditor.periodIndex,
              ),
            );
            setManualEditor(null);
          }}
        />
      </div>
    );
  }

  function setCell(day: number, period: number, value: string) {
    const grid = tt.grid.map((row, di) =>
      row.map((cell, pi) => (di === day && pi === period ? value : cell)),
    );
    onChange({ ...tt, grid, substituteFlags: undefined, comciganView: undefined });
  }

  function setPeriodCount(n: number) {
    const periodCount = Math.min(12, Math.max(1, n));
    const grid = emptyGrid(periodCount);
    for (let d = 0; d < 5; d++) {
      for (let p = 0; p < periodCount; p++) {
        grid[d][p] = tt.grid[d]?.[p] ?? "";
      }
    }
    onChange({
      ...tt,
      periodCount,
      grid,
      substituteFlags: undefined,
      comciganView: undefined,
    });
  }

  const todaySummary = (() => {
    if (todayIdx > 4) return "주말";
    const line = tt.grid[todayIdx]
      .map((s, i) => (s.trim() ? `${i + 1} ${s.trim()}` : null))
      .filter(Boolean)
      .join(" · ");
    return line || "입력된 수업 없음";
  })();

  const todayHasSubstitute =
    autoSync &&
    todayIdx <= 4 &&
    tt.grid[todayIdx].some((_, i) => isSubstituteCell(tt, todayIdx, i));

  return (
    <>
      <div className="input-row tt-toolbar">
        <input
          className="tt-title"
          value={tt.title}
          disabled={!edit}
          onChange={(e) => onChange({ ...tt, title: e.target.value })}
          placeholder="표 제목 (예: 2학년 담임)"
        />
        {!autoSync && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => setEdit((v) => !v)}
          >
            {edit ? "완료" : "편집"}
          </button>
        )}
      </div>
      {edit && (
        <div className="input-row muted" style={{ fontSize: "0.85rem" }}>
          <label>
            교시 수
            <input
              type="number"
              min={1}
              max={12}
              value={tt.periodCount}
              onChange={(e) => setPeriodCount(Number(e.target.value))}
              style={{ width: 56, marginLeft: 8 }}
            />
          </label>
        </div>
      )}
      <div className="tt-scroll">
        <table className="tt-grid">
          <thead>
            <tr>
              <th>교시</th>
              {DAYS.map((d, di) => (
                <th
                  key={d}
                  className={
                    highlightToday && di === todayIdx ? "tt-day-today" : undefined
                  }
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: tt.periodCount }, (_, pi) => (
              <tr key={pi}>
                <th>{pi + 1}</th>
                {DAYS.map((_, di) => (
                  <td
                    key={di}
                    className={
                      highlightToday && di === todayIdx
                        ? "tt-col-today"
                        : undefined
                    }
                  >
                    {edit ? (
                      <input
                        value={tt.grid[di][pi]}
                        onChange={(e) => setCell(di, pi, e.target.value)}
                        placeholder="—"
                      />
                    ) : (
                      tt.grid[di][pi] || <span className="muted">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {autoSync && (
        <p className="tt-sync-hint muted">
          컴시간 자동 갱신 중입니다. 설정 → 학교에서 끌 수 있습니다.
        </p>
      )}
      {!edit && (
        <p
          className={`tt-today-summary muted${todayHasSubstitute ? " tt-today-summary--substitute" : ""}`}
        >
          오늘({DAYS[todayIdx] ?? ""}): {todaySummary}
        </p>
      )}
    </>
  );
}
