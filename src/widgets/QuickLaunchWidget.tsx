import type { DockShortcutItem } from "@/types/state";

type Props = {
  shortcuts: DockShortcutItem[];
};

export function QuickLaunchWidget({ shortcuts }: Props) {
  if (shortcuts.length === 0) {
    return (
      <p className="quick-launch-empty muted">
        설정 → 표시 → 「자주 쓰는 앱」에서 바로가기를 추가하면 여기에
        표시됩니다. 카드 제목줄을 끌어 다른 위치에 고정할 수 있습니다.
      </p>
    );
  }

  return (
    <div className="quick-launch-widget" role="list">
      {shortcuts.map((item) => (
        <button
          key={item.id}
          type="button"
          className="quick-launch-item"
          role="listitem"
          title={item.label}
          aria-label={`${item.label} 실행`}
          onClick={() => {
            void window.schoolUtil?.launchDockShortcut?.(item.sourcePath);
          }}
        >
          <img
            className="quick-launch-item-img"
            src={item.iconDataUrl}
            alt=""
            width={40}
            height={40}
            draggable={false}
          />
          <span className="quick-launch-item-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
