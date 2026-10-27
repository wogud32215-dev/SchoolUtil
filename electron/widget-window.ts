import type { BrowserWindow } from "electron";
import { screen } from "electron";
import type { AppSettings } from "./store";

function unionWorkAreas(
  displays: Electron.Display[],
): Electron.Rectangle {
  if (displays.length === 0) {
    return screen.getPrimaryDisplay().workArea;
  }
  let minX = displays[0].workArea.x;
  let minY = displays[0].workArea.y;
  let maxX = displays[0].workArea.x + displays[0].workArea.width;
  let maxY = displays[0].workArea.y + displays[0].workArea.height;
  for (const d of displays) {
    const w = d.workArea;
    minX = Math.min(minX, w.x);
    minY = Math.min(minY, w.y);
    maxX = Math.max(maxX, w.x + w.width);
    maxY = Math.max(maxY, w.y + w.height);
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/** 위젯 모드 창 bounds (설정의 widgetMonitor). */
export function getWidgetWindowBounds(
  settings?: Pick<AppSettings, "widgetMonitor">,
): Electron.Rectangle {
  const mode = settings?.widgetMonitor ?? "primary";
  const displays = screen.getAllDisplays();

  if (mode === "all") {
    return unionWorkAreas(displays);
  }

  if (typeof mode === "number") {
    const match = displays.find((d) => d.id === mode);
    if (match) return match.workArea;
  }

  return screen.getPrimaryDisplay().workArea;
}

export function fitWidgetWindowBounds(
  win: BrowserWindow,
  settings?: Pick<AppSettings, "widgetMonitor" | "widgetLockToScreen">,
): void {
  if (win.isDestroyed()) return;
  const bounds = getWidgetWindowBounds(settings);
  const lock = settings?.widgetLockToScreen !== false;
  win.setBounds(bounds);
  win.setResizable(!lock);
  if (lock) {
    win.setMinimumSize(bounds.width, bounds.height);
    win.setMaximumSize(bounds.width, bounds.height);
    win.setMovable(false);
  } else {
    win.setMinimumSize(0, 0);
    win.setMaximumSize(0, 0);
    win.setMovable(true);
  }
}
