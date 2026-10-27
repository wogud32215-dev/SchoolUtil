import { useEffect, useState } from "react";

export function ClockWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const seconds = String(now.getSeconds()).padStart(2, "0");

  const date = now.toLocaleDateString("ko-KR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="clock-widget">
      <div className="clock-time">
        {hours}
        <span className="clock-seconds" aria-hidden="true">
          :{seconds}
        </span>
      </div>
      <div className="clock-date">{date}</div>
    </div>
  );
}
