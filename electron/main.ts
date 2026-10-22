import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  shell,
  Tray,
} from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkForUpdates,
  downloadUpdate,
  initAutoUpdate,
  quitAndInstall,
} from "./auto-update";
import { exportStateToFile, importStateFromFile } from "./backup";
import { fetchSchoolSchedule } from "./neis";
import { fetchTodayMeal } from "./neis-meal";
import { searchSchools } from "./neis-school";
import { fetchCurrentWeather } from "./open-meteo";
import { normalizeSettings } from "./settings-normalize";
import {
  getState,
  getStorePath,
  initPersistence,
  patchState,
  replaceState,
  type AppSettings,
  type PersistedState,
} from "./store";
import { sendWindowToDesktopBottom } from "./win32-zorder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(__dirname, "../public");

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let pinnedToFront = false;

const isDev = !app.isPackaged;
const PIN_SHORTCUT = "CommandOrControl+Alt+D";
const EMERGENCY_SHORTCUT = "CommandOrControl+Alt+Shift+D";

type ShapeRect = { x: number; y: number; width: number; height: number };

function resolvePreloadPath(): string {
  const dirs = [
    path.join(app.getAppPath(), "dist-electron"),
    __dirname,
  ];
  const names = ["preload.cjs", "preload.js", "preload.mjs"];
  for (const dir of dirs) {
    for (const name of names) {
      const full = path.join(dir, name);
      if (fs.existsSync(full)) return full;
    }
  }
  return path.join(__dirname, "preload.cjs");
}

function getTrayIcon() {
  const iconPath = path.join(process.env.VITE_PUBLIC!, "icon.png");
  const image = nativeImage.createFromPath(iconPath);
  if (image.isEmpty()) {
    return nativeImage.createEmpty();
  }
  return image.resize({ width: 16, height: 16 });
}

function currentSettings(): AppSettings {
  return normalizeSettings(getState().settings);
}

function isWidgetMode(settings = currentSettings()): boolean {
  return settings.displayMode === "widget";
}

function applyLoginItem(openAtLogin: boolean) {
  app.setLoginItemSettings({
    openAtLogin,
    path: process.execPath,
    args: isDev ? [path.resolve(process.argv[1])] : [],
  });
}

function isAllowedExternalUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function broadcastPinState() {
  mainWindow?.webContents.send("widget:pin-changed", pinnedToFront);
}

function applyDesktopLayer() {
  const win = mainWindow;
  if (!win || win.isDestroyed()) return;
  const widget = isWidgetMode();
  if (!widget || pinnedToFront) {
    return;
  }
  const ok = sendWindowToDesktopBottom(win.getNativeWindowHandle());
  if (!ok) {
    win.webContents.send("widget:desktop-layer", { ok: false });
  }
}

function applyPinState() {
  const win = mainWindow;
  if (!win || win.isDestroyed()) return;
  const widget = isWidgetMode();

  if (pinnedToFront) {
    win.setAlwaysOnTop(true, "screen-saver");
    win.show();
    win.focus();
  } else {
    win.setAlwaysOnTop(false);
    if (widget) {
      applyDesktopLayer();
    }
  }
  broadcastPinState();
  refreshTrayMenu();
}

function togglePinToFront() {
  if (!isWidgetMode()) {
    mainWindow?.show();
    mainWindow?.focus();
    return;
  }
  pinnedToFront = !pinnedToFront;
  applyPinState();
}

function emergencyWidgetEscape() {
  pinnedToFront = false;
  applyPinState();
  mainWindow?.show();
  mainWindow?.webContents.send("widget:emergency-reset");
  if (tray) {
    tray.displayBalloon({
      title: "SchoolUtil",
      content: "안전 모드로 전환했습니다. 앞으로 보기를 껐습니다.",
    });
  }
}

function unregisterGlobalShortcuts() {
  globalShortcut.unregister(PIN_SHORTCUT);
  globalShortcut.unregister(EMERGENCY_SHORTCUT);
}

function registerGlobalShortcuts() {
  unregisterGlobalShortcuts();
  const settings = currentSettings();
  if (!settings.globalShortcuts) return;

  const pinOk = globalShortcut.register(PIN_SHORTCUT, () => {
    togglePinToFront();
  });
  const emergencyOk = globalShortcut.register(EMERGENCY_SHORTCUT, () => {
    emergencyWidgetEscape();
  });
  if (!pinOk || !emergencyOk) {
    console.warn("[SchoolUtil] global shortcut registration failed");
  }
}

function loadWindowContent(win: BrowserWindow) {
  if (isDev) {
    void win.loadURL("http://localhost:5173/");
    if (process.env.SCHOOLUTIL_DEVTOOLS === "1") {
      win.webContents.openDevTools({ mode: "detach" });
    }
  } else {
    void win.loadFile(path.join(process.env.DIST!, "index.html"));
  }
}

function createWindow(): BrowserWindow {
  const settings = currentSettings();
  const widget = settings.displayMode === "widget";
  const primary = screen.getPrimaryDisplay();
  const { width, height } = primary.workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    x: primary.workArea.x,
    y: primary.workArea.y,
    frame: false,
    transparent: widget,
    resizable: !widget,
    skipTaskbar: widget,
    show: false,
    hasShadow: !widget,
    backgroundColor: widget ? "#00000000" : "#0f172a",
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  pinnedToFront = false;

  mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error("[SchoolUtil] preload failed:", preloadPath, error);
  });

  mainWindow.setMenuBarVisibility(false);

  loadWindowContent(mainWindow);

  mainWindow.once("ready-to-show", () => {
    if (!mainWindow) return;
    mainWindow.show();
    if (widget && !pinnedToFront) {
      applyDesktopLayer();
    }
    broadcastPinState();
  });

  mainWindow.on("close", (event) => {
    if (!(app as Electron.App & { isQuitting?: boolean }).isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("focus", () => {
    if (isWidgetMode() && !pinnedToFront) {
      applyDesktopLayer();
    }
  });

  return mainWindow;
}

function recreateWindowIfNeeded(prevMode: AppSettings["displayMode"]) {
  const next = currentSettings().displayMode;
  if (prevMode === next || !mainWindow) return;
  const wasVisible = mainWindow.isVisible();
  const bounds = mainWindow.getBounds();
  mainWindow.removeAllListeners();
  mainWindow.destroy();
  mainWindow = null;
  const win = createWindow();
  if (!wasVisible) {
    win.hide();
  } else {
    win.setBounds(bounds);
  }
}

function refreshTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(buildTrayMenu());
  const pinHint = pinnedToFront ? " (앞으로 보기 중)" : "";
  tray.setToolTip(`SchoolUtil${pinHint} · Ctrl+Alt+D`);
}

function buildTrayMenu() {
  const widget = isWidgetMode();
  const items: Electron.MenuItemConstructorOptions[] = [
    {
      label: "SchoolUtil 열기",
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: "숨기기",
      click: () => mainWindow?.hide(),
    },
  ];

  if (widget) {
    items.push({
      label: pinnedToFront
        ? "다시 바탕화면으로 (Ctrl+Alt+D)"
        : "앞으로 보기 (Ctrl+Alt+D)",
      click: () => togglePinToFront(),
    });
  }

  items.push(
    { type: "separator" },
    {
      label: "종료",
      click: () => {
        (app as Electron.App & { isQuitting?: boolean }).isQuitting = true;
        app.quit();
      },
    },
  );

  return Menu.buildFromTemplate(items);
}

function createTray() {
  tray = new Tray(getTrayIcon());
  refreshTrayMenu();
  tray.on("double-click", () => {
    if (widgetModeDoubleClick()) return;
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function widgetModeDoubleClick(): boolean {
  if (!isWidgetMode()) return false;
  togglePinToFront();
  return true;
}

function parseShapeRects(raw: unknown): ShapeRect[] {
  if (!Array.isArray(raw)) return [];
  const out: ShapeRect[] = [];
  for (const item of raw.slice(0, 48)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const x = Number(r.x);
    const y = Number(r.y);
    const width = Number(r.width);
    const height = Number(r.height);
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width < 1 ||
      height < 1
    ) {
      continue;
    }
    out.push({
      x: Math.max(0, Math.round(x)),
      y: Math.max(0, Math.round(y)),
      width: Math.round(width),
      height: Math.round(height),
    });
  }
  return out;
}

function registerIpc() {
  ipcMain.handle("store:get", () => getState());
  ipcMain.handle("store:path", () => getStorePath());

  ipcMain.handle("store:patch", (_event, partial: unknown) => {
    const prevMode = currentSettings().displayMode;
    const next = patchState(partial as Partial<PersistedState>);
    const settings = normalizeSettings(next.settings);
    applyLoginItem(settings.openAtLogin);
    registerGlobalShortcuts();
    recreateWindowIfNeeded(prevMode);
    refreshTrayMenu();
    return { ...next, settings };
  });

  ipcMain.handle("backup:export", async () => {
    const result = await dialog.showSaveDialog({
      title: "SchoolUtil 데이터 보내기",
      defaultPath: `schoolutil-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (result.canceled || !result.filePath) {
      return { ok: false, cancelled: true as const };
    }
    try {
      exportStateToFile(result.filePath, getState());
      return { ok: true as const };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "보내기 실패",
      };
    }
  });

  ipcMain.handle("backup:import", async () => {
    const result = await dialog.showOpenDialog({
      title: "SchoolUtil 데이터 불러오기",
      filters: [{ name: "JSON", extensions: ["json"] }],
      properties: ["openFile"],
    });
    if (result.canceled || !result.filePaths[0]) {
      return { ok: false, cancelled: true as const };
    }
    try {
      const imported = importStateFromFile(result.filePaths[0]);
      replaceState(imported);
      return { ok: true as const };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "불러오기 실패",
      };
    }
  });

  ipcMain.handle(
    "neis:search-schools",
    async (_event, payload: { query?: string; apiKey?: string }) => {
      const query = payload?.query;
      if (typeof query !== "string") {
        return { ok: false as const, error: "검색어가 올바르지 않습니다." };
      }
      const key =
        typeof payload?.apiKey === "string" && payload.apiKey.trim()
          ? payload.apiKey.trim()
          : getState().settings.neisApiKey;
      return searchSchools(key, query);
    },
  );

  ipcMain.handle("update:check", () => checkForUpdates());
  ipcMain.handle("update:download", () => downloadUpdate());
  ipcMain.handle("update:install", () => {
    quitAndInstall();
  });

  ipcMain.handle("app:minimize", () => mainWindow?.minimize());
  ipcMain.handle("app:hide", () => mainWindow?.hide());

  ipcMain.handle("shell:openExternal", (_event, url: string) => {
    if (typeof url !== "string" || !isAllowedExternalUrl(url)) {
      return Promise.reject(new Error("허용되지 않은 URL입니다."));
    }
    return shell.openExternal(url);
  });

  ipcMain.handle("widget:get-pin", () => pinnedToFront);

  ipcMain.handle("widget:toggle-pin", () => {
    togglePinToFront();
    return pinnedToFront;
  });

  ipcMain.handle("widget:set-shape", (_event, rects: unknown) => {
    const win = mainWindow;
    if (!win || win.isDestroyed()) return;
    if (!isWidgetMode()) {
      win.setShape([]);
      return;
    }
    const parsed = parseShapeRects(rects);
    win.setShape(parsed);
  });

  ipcMain.handle("neis:meal", async () => {
    try {
      return await fetchTodayMeal(getState().settings);
    } catch (e) {
      return {
        ok: false as const,
        error:
          e instanceof Error ? e.message : "급식 처리 중 오류가 발생했습니다.",
      };
    }
  });

  ipcMain.handle("weather:current", async () => {
    try {
      const { weatherLat, weatherLon } = getState().settings;
      return await fetchCurrentWeather(weatherLat, weatherLon);
    } catch (e) {
      return {
        ok: false as const,
        error:
          e instanceof Error ? e.message : "날씨 처리 중 오류가 발생했습니다.",
      };
    }
  });

  ipcMain.handle(
    "neis:schedule",
    async (_event, range: { fromYmd?: string; toYmd?: string }) => {
      try {
        const settings = getState().settings;
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const pad = (n: number) => String(n).padStart(2, "0");
        const fromDefault = `${y}${pad(m + 1)}01`;
        const lastDay = new Date(y, m + 1, 0).getDate();
        const toDefault = `${y}${pad(m + 1)}${pad(lastDay)}`;
        const fromYmd = range?.fromYmd ?? fromDefault;
        const toYmd = range?.toYmd ?? toDefault;
        return await fetchSchoolSchedule(settings, fromYmd, toYmd);
      } catch (e) {
        return {
          ok: false as const,
          error:
            e instanceof Error
              ? e.message
              : "학사일정 처리 중 오류가 발생했습니다.",
        };
      }
    },
  );
}

app.whenReady().then(() => {
  initPersistence();
  registerIpc();
  createWindow();
  createTray();
  initAutoUpdate(() => mainWindow);
  applyLoginItem(getState().settings.openAtLogin);
  registerGlobalShortcuts();

  if (app.isPackaged) {
    setTimeout(() => {
      void checkForUpdates();
    }, 8000);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on("will-quit", () => {
  unregisterGlobalShortcuts();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // keep running in tray on Windows
  }
});
