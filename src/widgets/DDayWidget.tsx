import { useMemo, useState } from "react";
import { WidgetEmpty } from "@/components/WidgetFetchState";
import type { DDayItem } from "@/types/state";
import { newId } from "@/utils/id";

function daysUntil(dateStr: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return 0;
  const target = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function ddayLabel(d: number): string {
  if (d === 0) return "D-Day";
  if (d > 0) return `D-${d}`;
  return `D+${Math.abs(d)}`;
}

type Props = {
  items: DDayItem[];
  onChange: (items: DDayItem[]) => void;
};

export function DDayWidget({ items, onChange }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        const da = daysUntil(a.date);
        const db = daysUntil(b.date);
        if (da !== db) return da - db;
        return a.title.localeCompare(b.title);
      }),
    [items],
  );

  function add() {
    if (!title.trim() || !date) return;
    onChange([...items, { id: newId(), title: title.trim(), date }]);
    setTitle("");
    setDate("");
  }

  return (
    <>
      <div className="input-row todo-compose">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button type="button" className="btn-primary" onClick={add}>
          추가
        </button>
      </div>
      {sorted.length === 0 ? (
        <WidgetEmpty>D-Day를 추가해 보세요.</WidgetEmpty>
      ) : (
        <ul className="dday-list">
          {sorted.map((item) => {
            const d = daysUntil(item.date);
            const label = ddayLabel(d);
            const past = d < 0;
            return (
              <li key={item.id} className="dday-card">
                <span
                  className={`dday-count${past ? " dday-count--past" : ""}`}
                >
                  {label}
                </span>
                <div className="dday-info">
                  <span className="dday-title">{item.title}</span>
                  <span className="dday-date">{item.date}</span>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() =>
                    onChange(items.filter((x) => x.id !== item.id))
                  }
                  aria-label="삭제"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
