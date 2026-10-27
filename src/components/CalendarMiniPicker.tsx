import { useEffect, useMemo, useState } from "react";
import { ymdForLocalDate } from "@/utils/dueLabel";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

type Props = {
  selectedYmd: string;
  onSelect: (ymd: string) => void;
};

function parseYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

export function CalendarMiniPicker({ selectedYmd, onSelect }: Props) {
  const anchor = parseYmd(selectedYmd) ?? new Date();
  const [viewYear, setViewYear] = useState(anchor.getFullYear());
  const [viewMonth, setViewMonth] = useState(anchor.getMonth());

  useEffect(() => {
    const d = parseYmd(selectedYmd);
    if (!d) return;
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [selectedYmd]);

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const items: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) items.push(null);
    for (let d = 1; d <= daysInMonth; d++) items.push(d);
    return items;
  }, [viewYear, viewMonth]);

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  const today = new Date();
  const todayYmd = ymdForLocalDate(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );

  return (
    <div className="cal-mini" role="group" aria-label="날짜 선택">
      <div className="cal-mini-toolbar">
        <button
          type="button"
          className="btn-secondary cal-mini-nav"
          onClick={() => shiftMonth(-1)}
          aria-label="이전 달"
        >
          ‹
        </button>
        <span className="cal-mini-month">
          {viewYear}년 {viewMonth + 1}월
        </span>
        <button
          type="button"
          className="btn-secondary cal-mini-nav"
          onClick={() => shiftMonth(1)}
          aria-label="다음 달"
        >
          ›
        </button>
      </div>
      <div className="cal-mini-weekdays" aria-hidden="true">
        {WEEKDAYS.map((d, i) => (
          <span
            key={d}
            className={`cal-mini-weekday muted${i === 0 ? " cal-mini-weekday--sun" : ""}${i === 6 ? " cal-mini-weekday--sat" : ""}`}
          >
            {d}
          </span>
        ))}
      </div>
      <div className="cal-mini-grid" role="grid">
        {cells.map((day, i) => {
          if (day === null) {
            return (
              <span
                key={`pad-${i}`}
                className="cal-mini-day cal-mini-day--pad"
                aria-hidden="true"
              />
            );
          }
          const ymd = ymdForLocalDate(viewYear, viewMonth + 1, day);
          const isSelected = ymd === selectedYmd;
          const isToday = ymd === todayYmd;
          const dow = new Date(viewYear, viewMonth, day).getDay();
          const dowClass =
            dow === 0 ? " cal-mini-day--sun" : dow === 6 ? " cal-mini-day--sat" : "";

          return (
            <button
              key={`d-${day}`}
              type="button"
              role="gridcell"
              className={`cal-mini-day cal-mini-day-btn${dowClass}${isToday ? " cal-mini-day--today" : ""}${isSelected ? " cal-mini-day--selected" : ""}`}
              onClick={() => onSelect(ymd)}
              aria-label={`${viewMonth + 1}월 ${day}일`}
              aria-selected={isSelected}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
