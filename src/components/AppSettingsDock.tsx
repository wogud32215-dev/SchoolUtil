import { useCallback, useRef, useState } from "react";
import { SettingsIcon } from "@/components/SettingsIcon";
import {
  clampDockPercent,
  DEFAULT_SETTINGS_DOCK_X,
  DEFAULT_SETTINGS_DOCK_Y,
} from "@/utils/settingsDockPosition";

type Props = {
  x: number;
  y: number;
  onOpenSettings: () => void;
  onPositionCommit: (x: number, y: number) => void;
  onDragEnd?: () => void;
};

const DRAG_THRESHOLD_PX = 5;

export function AppSettingsDock({
  x,
  y,
  onOpenSettings,
  onPositionCommit,
  onDragEnd,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [live, setLive] = useState<{ x: number; y: number } | null>(null);
  const displayX = live?.x ?? x;
  const displayY = live?.y ?? y;
  const dragState = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });

  const positionFromClient = useCallback((clientX: number, clientY: number) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w < 1 || h < 1) {
      return { x: displayX, y: displayY };
    }
    return {
      x: clampDockPercent((clientX / w) * 100),
      y: clampDockPercent((clientY / h) * 100),
    };
  }, [displayX, displayY]);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: x,
      originY: y,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerId !== dragState.current.pointerId) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (!dragState.current.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      dragState.current.moved = true;
      setDragging(true);
    }
    setLive(positionFromClient(e.clientX, e.clientY));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerId !== dragState.current.pointerId) return;
    const wasDrag = dragState.current.moved;
    dragState.current.pointerId = -1;
    setDragging(false);
    if (wasDrag) {
      const pos = positionFromClient(e.clientX, e.clientY);
      setLive(null);
      if (pos) {
        onPositionCommit(pos.x, pos.y);
      }
      onDragEnd?.();
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onOpenSettings();
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerId !== dragState.current.pointerId) return;
    dragState.current.pointerId = -1;
    setDragging(false);
    setLive(null);
    onDragEnd?.();
  };

  const onDoubleClick = () => {
    setLive(null);
    onPositionCommit(DEFAULT_SETTINGS_DOCK_X, DEFAULT_SETTINGS_DOCK_Y);
    onDragEnd?.();
  };

  return (
    <nav
      className={`app-settings-dock${dragging ? " app-settings-dock--dragging" : ""}`}
      aria-label="빠른 실행"
      style={{
        left: `${displayX}%`,
        top: `${displayY}%`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onDoubleClick={onDoubleClick}
    >
      <button
        type="button"
        className="app-settings-dock-btn"
        title="설정 (드래그해 옮기기 · 두 번 눌러 아래 중앙)"
        aria-label="설정 열기"
        tabIndex={-1}
      >
        <SettingsIcon size={24} />
      </button>
    </nav>
  );
}
