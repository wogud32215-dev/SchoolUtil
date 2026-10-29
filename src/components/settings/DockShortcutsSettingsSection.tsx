import type { DockShortcutItem } from "@/types/state";

export function DockShortcutsSettingsSection({
  shortcuts,
  onChange,
  onStatus,
}: {
  shortcuts: DockShortcutItem[];
  onChange: (next: DockShortcutItem[]) => void;
  onStatus?: (message: string) => void;
}) {
  const max = 12;

  async function addShortcut() {
    const api = window.schoolUtil;
    if (!api?.pickDockShortcut) {
      onStatus?.("Electron 창에서만 바로가기를 추가할 수 있습니다.");
      return;
    }
    const res = await api.pickDockShortcut(shortcuts.length);
    if (!res.ok) {
      if ("cancelled" in res && res.cancelled) return;
      onStatus?.("error" in res ? res.error : "추가하지 못했습니다.");
      return;
    }
    onChange([...shortcuts, res.item]);
    onStatus?.(`「${res.item.label}」 바로가기를 추가했습니다.`);
  }

  function removeShortcut(id: string) {
    onChange(shortcuts.filter((s) => s.id !== id));
  }

  function patchLabel(id: string, label: string) {
    onChange(
      shortcuts.map((s) => (s.id === id ? { ...s, label: label.slice(0, 60) } : s)),
    );
  }

  return (
    <div className="dock-shortcuts-settings">
      <p className="muted" style={{ margin: "0 0 12px" }}>
        바탕화면·시작 메뉴의 .lnk 또는 exe를 고르면 앱 아이콘을 가져와 「앱
        바로가기» 위젯에 표시합니다. (최대 {max}개)
      </p>
      {shortcuts.length > 0 ? (
        <ul className="dock-shortcuts-list">
          {shortcuts.map((item) => (
            <li key={item.id} className="dock-shortcuts-list-item">
              <img
                className="dock-shortcuts-list-icon"
                src={item.iconDataUrl}
                alt=""
                width={32}
                height={32}
              />
              <input
                type="text"
                className="dock-shortcuts-list-label"
                value={item.label}
                aria-label="바로가기 이름"
                onChange={(e) => patchLabel(item.id, e.target.value)}
              />
              <button
                type="button"
                className="settings-inline-btn dock-shortcuts-remove"
                onClick={() => removeShortcut(item.id)}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted" style={{ margin: "0 0 12px" }}>
          아직 추가한 바로가기가 없습니다.
        </p>
      )}
      <button
        type="button"
        className="settings-inline-btn"
        disabled={shortcuts.length >= max}
        onClick={() => void addShortcut()}
      >
        바로가기 추가…
      </button>
    </div>
  );
}
