import { app, BrowserWindow, Notification } from "electron";
import electronUpdater from "electron-updater";

const { autoUpdater } = electronUpdater;

export type UpdateDownloadPhase = "idle" | "downloading" | "downloaded";

export type UpdateStatus = {
  available: boolean;
  version: string | null;
  downloadPhase: UpdateDownloadPhase;
  downloadPercent: number;
  lastError: string | null;
  checking: boolean;
};

let mainWindowRef: (() => BrowserWindow | null) | null = null;

const status: UpdateStatus = {
  available: false,
  version: null,
  downloadPhase: "idle",
  downloadPercent: 0,
  lastError: null,
  checking: false,
};

function sendToRenderer(channel: string, payload: unknown): void {
  mainWindowRef?.()?.webContents.send(channel, payload);
}

function showUpdateNotification(title: string, body: string): void {
  const win = mainWindowRef?.() ?? null;
  if (win?.isFocused()) return;
  if (!Notification.isSupported()) return;
  const notification = new Notification({ title, body });
  notification.on("click", () => {
    win?.show();
    win?.focus();
  });
  notification.show();
}

export function getUpdateStatus(): UpdateStatus {
  return { ...status };
}

function setAvailable(version: string): void {
  status.available = true;
  status.version = version;
  status.lastError = null;
  status.checking = false;
  sendToRenderer("update:available", { version });
  showUpdateNotification(
    "SchoolUtil 업데이트",
    `새 버전 ${version}이 있습니다. 앱을 열어 받을 수 있습니다.`,
  );
}

export function initAutoUpdate(mainWindow: () => BrowserWindow | null): void {
  if (!app.isPackaged) return;

  mainWindowRef = mainWindow;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    setAvailable(info.version);
  });

  autoUpdater.on("update-not-available", () => {
    status.available = false;
    status.version = null;
    status.checking = false;
    status.lastError = null;
    sendToRenderer("update:not-available", {});
  });

  autoUpdater.on("error", (err) => {
    status.checking = false;
    status.lastError = err.message;
    if (status.downloadPhase === "downloading") {
      status.downloadPhase = "idle";
      status.downloadPercent = 0;
    }
    sendToRenderer("update:error", {
      message: err.message,
    });
  });

  autoUpdater.on("download-progress", (p) => {
    status.downloadPhase = "downloading";
    status.downloadPercent = p.percent;
    sendToRenderer("update:progress", {
      percent: p.percent,
    });
  });

  autoUpdater.on("update-downloaded", () => {
    status.downloadPhase = "downloaded";
    status.downloadPercent = 100;
    status.lastError = null;
    sendToRenderer("update:downloaded", {});
    const ver = status.version;
    showUpdateNotification(
      "SchoolUtil 업데이트",
      ver
        ? `버전 ${ver} 다운로드를 마쳤습니다. 앱을 열어 설치할 수 있습니다.`
        : "업데이트 다운로드를 마쳤습니다. 앱을 열어 설치할 수 있습니다.",
    );
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
    status.checking = true;
    status.lastError = null;
    await autoUpdater.checkForUpdates();
    return { ok: true, status: "checking" };
  } catch (e) {
    status.checking = false;
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
  if (!status.available || !status.version) {
    return { ok: false, error: "받을 업데이트가 없습니다." };
  }
  try {
    status.downloadPhase = "downloading";
    status.downloadPercent = 0;
    status.lastError = null;
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (e) {
    status.downloadPhase = "idle";
    status.downloadPercent = 0;
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
