import { useState } from "react";
import type { DDayItem } from "@/types/state";
import { newId } from "@/utils/id";

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

type Props = {
  items: DDayItem[];
  onChange: (items: DDayItem[]) => void;
};

export function DDayWidget({ items, onChange }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  function add() {
    if (!title.trim() || !date) return;
    onChange([
      ...items,
      { id: newId(), title: title.trim(), date },
    ]);
    setTitle("");
    setDate("");
  }

  return (
    <>
      <div className="input-row">
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
      <ul>
        {items.length === 0 && (
          <li className="muted">D-Day를 추가해 보세요.</li>
        )}
        {items.map((item) => {
          const d = daysUntil(item.date);
          const label =
            d === 0 ? "D-Day" : d > 0 ? `D-${d}` : `D+${Math.abs(d)}`;
          return (
            <li key={item.id} className="todo-item">
              <span>
                <strong>{item.title}</strong>{" "}
                <span className="muted">{item.date}</span>
              </span>
              <span style={{ color: "var(--accent)", fontWeight: 700 }}>
                {label}
              </span>
              <button type="button" onClick={() => onChange(items.filter((x) => x.id !== item.id))}>
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
