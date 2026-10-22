import { app, BrowserWindow } from "electron";
import electronUpdater from "electron-updater";

const { autoUpdater } = electronUpdater;

export function initAutoUpdate(mainWindow: () => BrowserWindow | null): void {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    mainWindow()?.webContents.send("update:available", {
      version: info.version,
    });
  });

  autoUpdater.on("update-not-available", () => {
    mainWindow()?.webContents.send("update:not-available", {});
  });

  autoUpdater.on("error", (err) => {
    mainWindow()?.webContents.send("update:error", {
      message: err.message,
    });
  });

  autoUpdater.on("download-progress", (p) => {
    mainWindow()?.webContents.send("update:progress", {
      percent: p.percent,
    });
  });

  autoUpdater.on("update-downloaded", () => {
    mainWindow()?.webContents.send("update:downloaded", {});
  });

}

export async function checkForUpdates(): Promise<
  | { ok: true; status: "checking" }
  | { ok: false; error: string }
> {
  if (!app.isPackaged) {
    return { ok: false, error: "개발 모드에서는 업데이트를 확인할 수 없습니다." };
  }
  try {
    await autoUpdater.checkForUpdates();
    return { ok: true, status: "checking" };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "업데이트 확인에 실패했습니다.",
    };
  }
}

export async function downloadUpdate(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "업데이트 다운로드에 실패했습니다.",
    };
  }
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}
