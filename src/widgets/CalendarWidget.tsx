import { useMemo, useState } from "react";
import { CalendarDayModal } from "@/components/CalendarDayModal";
import { useNeisMonthSchedule } from "@/hooks/useNeisMonthSchedule";
import type { AppSettings, TodoItem } from "@/types/state";
import { ymdForLocalDate } from "@/utils/dueLabel";
import { neisYmdToDash } from "@/utils/neisYmd";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const MAX_CHIPS = 3;

type DayChip = {
  key: string;
  label: string;
  kind: "neis" | "todo";
  done?: boolean;
  category?: string;
};

type Props = {
  settings: AppSettings;
  todos: TodoItem[];
  onTodosChange: (todos: TodoItem[]) => void;
};

function sameYmd(a: string, b: string): boolean {
  return a === b;
}

export function CalendarWidget({
  settings,
  todos,
  onTodosChange,
}: Props) {
  const today = new Date();
  const todayYmd = ymdForLocalDate(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { items: neisItems, error: neisError } = useNeisMonthSchedule(
    settings,
    viewYear,
    viewMonth,
  );

  const neisByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const it of neisItems) {
      const dash = neisYmdToDash(it.ymd);
      const list = map.get(dash) ?? [];
      list.push(it.name);
      map.set(dash, list);
    }
    return map;
  }, [neisItems]);

  const todosByDay = useMemo(() => {
    const map = new Map<string, TodoItem[]>();
    for (const t of todos) {
      if (!t.dueDate) continue;
      const list = map.get(t.dueDate) ?? [];
      list.push(t);
      map.set(t.dueDate, list);
    }
    for (const [ymd, list] of map) {
      list.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return b.createdAt.localeCompare(a.createdAt);
      });
      map.set(ymd, list);
    }
    return map;
  }, [todos]);

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

  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  function openDay(ymd: string) {
    setSelectedYmd(ymd);
    setModalOpen(true);
  }

  function goToYmd(ymd: string) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
    if (!m) return;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const date = new Date(y, mo - 1, d);
    if (
      date.getFullYear() !== y ||
      date.getMonth() !== mo - 1 ||
      date.getDate() !== d
    ) {
      return;
    }
    setViewYear(y);
    setViewMonth(mo - 1);
    setSelectedYmd(ymd);
  }

  function handleModalDateChange(newYmd: string) {
    const prevYmd = selectedYmd;
    if (!prevYmd || prevYmd === newYmd) {
      goToYmd(newYmd);
      return;
    }
    onTodosChange(
      todos.map((t) =>
        t.dueDate === prevYmd ? { ...t, dueDate: newYmd } : t,
      ),
    );
    goToYmd(newYmd);
  }

  function chipsForDay(ymd: string): { shown: DayChip[]; more: number } {
    const chips: DayChip[] = [];
    for (const t of todosByDay.get(ymd) ?? []) {
      chips.push({
        key: t.id,
        label: t.text,
        kind: "todo",
        done: t.done,
        category: t.category,
      });
    }
    const neis = neisByDay.get(ymd) ?? [];
    for (const name of neis) {
      chips.push({ key: `n-${name}`, label: name, kind: "neis" });
    }
    const shown = chips.slice(0, MAX_CHIPS);
    return { shown, more: chips.length - shown.length };
  }

  return (
    <div className="cal-root">
      <div className="cal-toolbar">
        <button
          type="button"
          className="btn-secondary cal-nav-btn"
          onClick={() => shiftMonth(-1)}
          aria-label="이전 달"
        >
          ‹
        </button>
        <div className="cal-month-title">
          {viewYear}년 {viewMonth + 1}월
        </div>
        <button
          type="button"
          className="btn-secondary cal-nav-btn"
          onClick={() => shiftMonth(1)}
          aria-label="다음 달"
        >
          ›
        </button>
        <button type="button" className="btn-secondary cal-today-btn" onClick={goToday}>
          오늘
        </button>
      </div>
      {neisError && (
        <p className="cal-neis-hint muted" role="status">
          학사일정: {neisError}
        </p>
      )}
      <div className="cal-weekdays" aria-hidden="true">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`cal-weekday muted${i === 0 ? " cal-weekday--sun" : ""}${i === 6 ? " cal-weekday--sat" : ""}`}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="cal-month-grid" role="grid" aria-label={`${viewYear}년 ${viewMonth + 1}월`}>
        {cells.map((day, i) => {
          if (day === null) {
            return (
              <div
                key={`pad-${i}`}
                className="cal-day cal-day--pad"
                aria-hidden="true"
              />
            );
          }
          const ymd = ymdForLocalDate(viewYear, viewMonth + 1, day);
          const isToday = sameYmd(ymd, todayYmd);
          const isSelected = selectedYmd === ymd && modalOpen;
          const { shown, more } = chipsForDay(ymd);
          const dow = new Date(viewYear, viewMonth, day).getDay();
          const dowClass =
            dow === 0 ? " cal-day--sun" : dow === 6 ? " cal-day--sat" : "";

          return (
            <button
              key={`d-${day}`}
              type="button"
              className={`cal-day cal-day-btn${dowClass}${isToday ? " cal-day-today" : ""}${isSelected ? " cal-day-selected" : ""}`}
              onClick={() => openDay(ymd)}
              aria-label={`${viewMonth + 1}월 ${day}일`}
            >
              <span className="cal-day-num">{day}</span>
              {shown.length > 0 && (
                <div className="cal-day-chips">
                  {shown.map((c) => (
                    <span
                      key={c.key}
                      className={`cal-chip cal-chip--${c.kind}${c.done ? " cal-chip--done" : ""}`}
                      data-cat={
                        c.kind === "todo" ? c.category?.trim() || "none" : undefined
                      }
                      title={c.label}
                    >
                      {c.label}
                    </span>
                  ))}
                  {more > 0 && (
                    <span className="cal-chip-more">+{more}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedYmd && (
        <CalendarDayModal
          open={modalOpen}
          dateYmd={selectedYmd}
          onClose={() => setModalOpen(false)}
          neisItems={neisItems}
          todos={todos}
          onTodosChange={onTodosChange}
          onDateChange={handleModalDateChange}
        />
      )}
    </div>
  );
}
