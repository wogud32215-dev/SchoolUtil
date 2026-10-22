import { useMemo } from "react";

export function CalendarWidget() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const items: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) items.push(null);
    for (let d = 1; d <= daysInMonth; d++) items.push(d);
    return items;
  }, [year, month]);

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>
        {year}년 {month + 1}월
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          fontSize: "0.8rem",
          textAlign: "center",
        }}
      >
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="muted">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const isToday = day === today.getDate();
          return (
            <div
              key={i}
              style={{
                padding: 4,
                borderRadius: 6,
                background: isToday ? "var(--accent-soft)" : "transparent",
                color: isToday ? "var(--accent)" : "inherit",
                fontWeight: isToday ? 700 : 400,
              }}
            >
              {day ?? ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
