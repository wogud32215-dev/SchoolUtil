import { app, BrowserWindow, Notification } from "electron";
import electronUpdater from "electron-updater";
import { getState } from "./store";
import {
  notificationBodyForRelease,
  resolveReleaseHighlights,
} from "./release-notes";
import { formatReleaseNotesForNotification } from "../src/data/releaseNotes";

const { autoUpdater } = electronUpdater;

export type UpdateDownloadPhase = "idle" | "downloading" | "downloaded";

export type UpdateStatus = {
  available: boolean;
  version: string | null;
  releaseNotes: string[];
  downloadPhase: UpdateDownloadPhase;
  downloadPercent: number;
  downloadTransferred: number;
  downloadTotal: number;
  lastError: string | null;
  checking: boolean;
};

let mainWindowRef: (() => BrowserWindow | null) | null = null;

const status: UpdateStatus = {
  available: false,
  version: null,
  releaseNotes: [],
  downloadPhase: "idle",
  downloadPercent: 0,
  downloadTransferred: 0,
  downloadTotal: 0,
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

function setAvailable(version: string, updaterRaw: unknown): void {
  const releaseNotes = resolveReleaseHighlights(version, updaterRaw);
  status.available = true;
  status.version = version;
  status.releaseNotes = releaseNotes;
  status.lastError = null;
  status.checking = false;
  sendToRenderer("update:available", { version, releaseNotes });
  showUpdateNotification(
    "SchoolUtil 업데이트",
    notificationBodyForRelease(version, updaterRaw),
  );
}

export function initAutoUpdate(mainWindow: () => BrowserWindow | null): void {
  if (!app.isPackaged) return;

  mainWindowRef = mainWindow;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    setAvailable(info.version, info.releaseNotes ?? info.releaseName);
  });

  autoUpdater.on("update-not-available", () => {
    status.available = false;
    status.version = null;
    status.releaseNotes = [];
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
    status.downloadTransferred = p.transferred;
    status.downloadTotal = p.total;
    sendToRenderer("update:progress", {
      percent: p.percent,
      transferred: p.transferred,
      total: p.total,
    });
  });

  autoUpdater.on("update-downloaded", () => {
    status.downloadPhase = "downloaded";
    status.downloadPercent = 100;
    status.lastError = null;
    sendToRenderer("update:downloaded", {
      version: status.version,
      releaseNotes: status.releaseNotes,
    });
    const ver = status.version;
    showUpdateNotification(
      "SchoolUtil 업데이트",
      ver
        ? `다운로드 완료 — ${formatReleaseNotesForNotification(ver, status.releaseNotes)}`
        : "업데이트 다운로드를 마쳤습니다. 앱을 열어 설치할 수 있습니다.",
    );
  });
}

/** 재시작 후 이전 실행 버전과 다를 때 OS 알림 (배너는 렌더러) */
export function notifyIfAppWasUpgraded(): void {
  if (!app.isPackaged) return;
  const current = app.getVersion();
  const last = getState().settings.lastLaunchedAppVersion?.trim() ?? "";
  if (!last || last === current) return;
  const highlights = resolveReleaseHighlights(current, null);
  showUpdateNotification(
    "SchoolUtil 업데이트 완료",
    formatReleaseNotesForNotification(current, highlights),
  );
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
    status.downloadTransferred = 0;
    status.downloadTotal = 0;
    status.lastError = null;
    sendToRenderer("update:progress", {
      percent: 0,
      transferred: 0,
      total: 0,
    });
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
  autoUpdater.quitAndInstall(false, true);
}
