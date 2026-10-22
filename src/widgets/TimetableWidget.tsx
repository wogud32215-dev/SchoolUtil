import { useState } from "react";
import type { TimetableData } from "@/types/state";
import { emptyGrid, normalizeTimetable } from "@/utils/timetable";

const DAYS = ["월", "화", "수", "목", "금"];

type Props = {
  data: TimetableData;
  onChange: (data: TimetableData) => void;
};

export function TimetableWidget({ data, onChange }: Props) {
  const tt = normalizeTimetable(data);
  const [edit, setEdit] = useState(false);

  function setCell(day: number, period: number, value: string) {
    const grid = tt.grid.map((row, di) =>
      row.map((cell, pi) => (di === day && pi === period ? value : cell)),
    );
    onChange({ ...tt, grid });
  }

  function setPeriodCount(n: number) {
    const periodCount = Math.min(12, Math.max(1, n));
    const grid = emptyGrid(periodCount);
    for (let d = 0; d < 5; d++) {
      for (let p = 0; p < periodCount; p++) {
        grid[d][p] = tt.grid[d]?.[p] ?? "";
      }
    }
    onChange({ ...tt, periodCount, grid });
  }

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
        <button
          type="button"
          className="btn-primary"
          onClick={() => setEdit((v) => !v)}
        >
          {edit ? "완료" : "편집"}
        </button>
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
              {DAYS.map((d) => (
                <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: tt.periodCount }, (_, pi) => (
              <tr key={pi}>
                <th>{pi + 1}</th>
                {DAYS.map((_, di) => (
                  <td key={di}>
                    {edit ? (
                      <input
                        value={tt.grid[di][pi]}
                        onChange={(e) => setCell(di, pi, e.target.value)}
                        placeholder="—"
                      />
                    ) : (
                      tt.grid[di][pi] || (
                        <span className="muted">—</span>
                      )
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!edit && (
        <p className="muted" style={{ margin: "8px 0 0", fontSize: "0.8rem" }}>
          오늘(
          {DAYS[(new Date().getDay() + 6) % 7] ?? ""}
          ):{" "}
          {(() => {
            const dayIdx = (new Date().getDay() + 6) % 7;
            if (dayIdx > 4) return "주말";
            const line = tt.grid[dayIdx]
              .map((s, i) => (s.trim() ? `${i + 1} ${s.trim()}` : null))
              .filter(Boolean)
              .join(" · ");
            return line || "입력된 수업 없음";
          })()}
        </p>
      )}
    </>
  );
}
