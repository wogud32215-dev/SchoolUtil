import { BrowserWindow } from "electron";

/** 자동 로그인 중 Chrome·인증서 창이 앱 뒤에 가려지지 않도록 앱 창을 잠시 최소화합니다. */
export function minimizeAppWindowsForPortal(): () => void {
  const minimized: BrowserWindow[] = [];
  for (const w of BrowserWindow.getAllWindows()) {
    if (w.isDestroyed() || !w.isVisible() || w.isMinimized()) continue;
    w.minimize();
    minimized.push(w);
  }
  return () => {
    for (const w of minimized) {
      if (w.isDestroyed()) continue;
      w.restore();
      w.show();
    }
  };
}
