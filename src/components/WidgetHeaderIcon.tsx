import type { WidgetId } from "@/widgets/registry";

type Props = {
  id: WidgetId;
  size?: number;
  className?: string;
};

/** 대시보드 위젯 제목 앞 작은 아이콘 (설정 탭과 같은 스트로크 톤) */
export function WidgetHeaderIcon({ id, size = 15, className }: Props) {
  const common = {
    className,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (id) {
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "weather":
      return (
        <svg {...common}>
          <path d="M8 18h9a3.5 3.5 0 0 0 .5-7 4.5 4.5 0 0 0-8.7-1.2A3.5 3.5 0 0 0 8 18z" />
          <path d="M12 3v2M5.5 6.5l1.4 1.4M18.5 6.5l-1.4 1.4" />
        </svg>
      );
    case "meal":
      return (
        <svg {...common}>
          <path d="M8 3v8a2 2 0 0 0 4 0V3" />
          <path d="M10 3v18" />
          <path d="M16 3v7c0 2.2 1.5 4 3 4v8" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
      );
    case "dday":
      return (
        <svg {...common}>
          <path d="M5 4h14v16H5z" />
          <path d="M9 4V2h6v2" />
          <path d="M8 14h8M12 10v8" />
        </svg>
      );
    case "memo":
      return (
        <svg {...common}>
          <path d="M6 4h10l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
          <path d="M14 4v4h4M8 13h8M8 17h5" />
        </svg>
      );
    case "todo":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M8.5 12.5l2.5 2.5 5-5.5" />
        </svg>
      );
    case "timetable":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M9 9v11M15 9v11" />
        </svg>
      );
    case "schoolsched":
      return (
        <svg {...common}>
          <path d="M3 10l9-6 9 6v10H3V10z" />
          <path d="M9 21V12h6v9" />
        </svg>
      );
    case "workportal":
      return (
        <svg {...common}>
          <circle cx="8" cy="9" r="3.5" />
          <path d="M3 19c0-2.8 2.2-5 5-5s5 2.2 5 5" />
          <path d="M16 11h5v8h-5z" />
          <path d="M18.5 14v2" />
        </svg>
      );
    case "quicklaunch":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <path d="M7.5 15.5h9M12 13v5" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2" />
        </svg>
      );
    default:
      return null;
  }
}
