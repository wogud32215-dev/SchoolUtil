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
import { fetchMeals } from "./neis-meal";
import { searchSchools } from "./neis-school";
import {
  getNeisKeyStatus,
  settingsWithResolvedNeisKey,
  withNeisApiKeyFallback,
  writeAppNeisKeyForAdmin,
} from "./neis-key-resolve";
import { fetchCurrentWeather } from "./open-meteo";
import { normalizeSettings } from "./settings-normalize";
import {
  getState,
  getStorePath,
  initPersistence,
  patchState,
  recordPortalRun,
  replaceState,
  type AppSettings,
  type PersistedState,
} from "./store";
import { isDesktopForeground } from "./win32-desktop";
import { sendWindowToDesktopBottom } from "./win32-zorder";
import { isPortalId } from "./portal-ids";
import { portalBrowserFromSettings } from "./portal-launch";
import { schedulePortalAutoLogin } from "./portal-boot";
import {
  portalDebugHelpUrl,
  runPortalAutomation,
} from "./portal-automation";
import { openPortalLog } from "./portal-log";
import { applyPortalSessionExtend } from "./portal-session-extend";
import {
  clearPortalCredentials,
  getPortalCredentialStatus,
} from "./secrets";
import {
  fitWidgetWindowBounds,
  getWidgetWindowBounds,
} from "./widget-window";
import {
  listTeachers,
  searchSchools as searchComciganSchools,
} from "./comcigan/sync";
import { setStoreBroadcastTarget } from "./broadcast-state";
import {
  runTimetableAutoSync,
  shouldSchedulerRun,
  startTimetableAutoSyncScheduler,
  stopTimetableAutoSyncScheduler,
} from "./comcigan-scheduler";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(__dirname, "../public");

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let pinnedToFront = false;
let desktopMonitorTimer: ReturnType<typeof setInterval> | null = null;
let lastDesktopForeground = false;
let displayListenersAttached = false;
let widgetSnapTimer: ReturnType<typeof setTimeout> | null = null;

const isDev = !app.isPackaged;
const PIN_SHORTCUT = "CommandOrControl+Alt+D";
const EMERGENCY_SHORTCUT = "CommandOrControl+Alt+Shift+D";

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

function notifyShapeRefresh() {
  mainWindow?.webContents.send("widget:refresh-shape");
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

function syncWidgetDesktopLayer() {
  applyDesktopLayer();
  notifyShapeRefresh();
}

/**
 * Windows: setShape는 히트 테스트뿐 아니라 **그리기 영역도 잘라** 카드가 깨져 보일 수 있다.
 * 위젯 모드는 투명 영역 클릭 통과(forward) + setShape 비움으로 처리한다.
 */
function applyWidgetPointerPassthrough() {
  const win = mainWindow;
  if (!win || win.isDestroyed()) return;
  win.setShape([]);
  if (!isWidgetMode() || pinnedToFront) {
    win.setIgnoreMouseEvents(false);
    return;
  }
  win.setIgnoreMouseEvents(true, { forward: true });
}

function wakeWidgetForInput() {
  const win = mainWindow;
  if (!win || win.isDestroyed() || !isWidgetMode() || pinnedToFront) return;
  if (!win.isVisible()) win.show();
  win.focus();
  applyDesktopLayer();
}

function stopWidgetDesktopMonitor() {
  if (desktopMonitorTimer) {
    clearInterval(desktopMonitorTimer);
    desktopMonitorTimer = null;
  }
  lastDesktopForeground = false;
}

function startWidgetDesktopMonitor() {
  stopWidgetDesktopMonitor();
  if (process.platform !== "win32" || !isWidgetMode()) return;
  desktopMonitorTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed() || !isWidgetMode() || pinnedToFront) {
      return;
    }
    const onDesktop = isDesktopForeground();
    if (onDesktop && !lastDesktopForeground) {
      syncWidgetDesktopLayer();
    }
    lastDesktopForeground = onDesktop;
  }, 400);
}

function updateWidgetDesktopMonitors() {
  if (isWidgetMode()) {
    startWidgetDesktopMonitor();
  } else {
    stopWidgetDesktopMonitor();
  }
}

function applyWidgetWindowBounds() {
  const win = mainWindow;
  if (!win || win.isDestroyed() || !isWidgetMode()) return;
  const settings = currentSettings();
  fitWidgetWindowBounds(win, settings);
  applyWidgetPointerPassthrough();
  if (!pinnedToFront) {
    syncWidgetDesktopLayer();
  } else {
    notifyShapeRefresh();
  }
}

function scheduleWidgetSnapToScreen() {
  if (widgetSnapTimer) {
    clearTimeout(widgetSnapTimer);
  }
  widgetSnapTimer = setTimeout(() => {
    widgetSnapTimer = null;
    if (currentSettings().widgetLockToScreen === false) return;
    applyWidgetWindowBounds();
  }, 40);
}

function attachWidgetSnapGuards(win: BrowserWindow) {
  const onMoveOrResize = () => {
    if (!isWidgetMode() || currentSettings().widgetLockToScreen === false) {
      return;
    }
    scheduleWidgetSnapToScreen();
  };
  win.on("moved", onMoveOrResize);
  win.on("resized", onMoveOrResize);
}

function attachDisplayListeners() {
  if (displayListenersAttached) return;
  displayListenersAttached = true;
  const onDisplayChange = () => {
    const win = mainWindow;
    if (!win || win.isDestroyed() || !isWidgetMode()) return;
    applyWidgetWindowBounds();
  };
  screen.on("display-added", onDisplayChange);
  screen.on("display-removed", onDisplayChange);
  screen.on("display-metrics-changed", onDisplayChange);
}

function applyPinState() {
  const win = mainWindow;
  if (!win || win.isDestroyed()) return;
  const widget = isWidgetMode();

  if (!win.isVisible()) {
    if (pinnedToFront) {
      win.setAlwaysOnTop(true, "screen-saver");
      win.show();
      win.focus();
      applyWidgetPointerPassthrough();
      notifyShapeRefresh();
    }
    broadcastPinState();
    refreshTrayMenu();
    return;
  }

  if (pinnedToFront) {
    win.setAlwaysOnTop(true, "screen-saver");
    win.focus();
  } else {
    win.setAlwaysOnTop(false);
    if (widget) {
      applyDesktopLayer();
    }
  }
  applyWidgetPointerPassthrough();
  notifyShapeRefresh();
  broadcastPinState();
  refreshTrayMenu();
}

/** 위젯 모드: 보이는 중이면 숨김, 숨겨진 상태면 맨 앞에 다시 표시 */
function togglePinToFront() {
  const win = mainWindow;
  if (!win || win.isDestroyed()) return;

  if (!isWidgetMode()) {
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
    refreshTrayMenu();
    return;
  }

  if (win.isVisible()) {
    pinnedToFront = false;
    win.hide();
    applyWidgetPointerPassthrough();
    notifyShapeRefresh();
    broadcastPinState();
    refreshTrayMenu();
    return;
  }

  pinnedToFront = true;
  applyPinState();
}

function returnWidgetToDesktop() {
  if (!isWidgetMode()) return;
  pinnedToFront = false;
  const win = mainWindow;
  if (!win || win.isDestroyed()) return;
  win.setAlwaysOnTop(false);
  if (!win.isVisible()) {
    win.show();
  }
  applyWidgetWindowBounds();
  applyDesktopLayer();
  applyWidgetPointerPassthrough();
  notifyShapeRefresh();
  broadcastPinState();
  refreshTrayMenu();
}

function emergencyWidgetEscape() {
  pinnedToFront = false;
  const win = mainWindow;
  if (win && !win.isDestroyed()) {
    win.setAlwaysOnTop(false);
    win.show();
    applyDesktopLayer();
    applyWidgetPointerPassthrough();
    notifyShapeRefresh();
  }
  broadcastPinState();
  refreshTrayMenu();
  mainWindow?.webContents.send("widget:emergency-reset");
  if (tray) {
    tray.displayBalloon({
      title: "SchoolUtil",
      content: "안전 모드로 전환했습니다. 바탕화면 위젯으로 돌아갑니다.",
    });
  }
}

function unregisterGlobalShortcuts() {
  globalShortcut.unregister(PIN_SHORTCUT);
  globalShortcut.unregister(EMERGENCY_SHORTCUT);
}

function runPinShortcut() {
  try {
    togglePinToFront();
  } catch (err) {
    console.error("[SchoolUtil] Ctrl+Alt+D handler error:", err);
  }
}

function runEmergencyShortcut() {
  try {
    emergencyWidgetEscape();
  } catch (err) {
    console.error("[SchoolUtil] emergency shortcut handler error:", err);
  }
}

function globalShortcutsEnabled(): boolean {
  return currentSettings().globalShortcuts !== false;
}

function registerGlobalShortcuts() {
  unregisterGlobalShortcuts();
  if (!globalShortcutsEnabled()) return;

  const pinOk = globalShortcut.register(PIN_SHORTCUT, () => {
    runPinShortcut();
  });
  const emergencyOk = globalShortcut.register(EMERGENCY_SHORTCUT, () => {
    runEmergencyShortcut();
  });

  if (!pinOk) {
    console.warn(
      "[SchoolUtil] Ctrl+Alt+D 등록 실패 — 다른 프로그램이 같은 단축키를 쓰는지 확인하세요.",
    );
    if (tray) {
      tray.displayBalloon({
        title: "SchoolUtil",
        content:
          "Ctrl+Alt+D 단축키를 등록하지 못했습니다. SchoolUtil 창에 포커스가 있을 때는 동일 키가 동작할 수 있습니다.",
      });
    }
  }
  if (!emergencyOk) {
    console.warn("[SchoolUtil] Ctrl+Alt+Shift+D 등록 실패");
  }
}

function attachWindowShortcutHandler(win: BrowserWindow) {
  win.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    if (!globalShortcutsEnabled()) return;
    const key = input.key?.toLowerCase();
    if (key !== "d") return;
    const mod = input.control || input.meta;
    if (!mod || !input.alt) return;

    if (input.shift) {
      event.preventDefault();
      runEmergencyShortcut();
      return;
    }

    event.preventDefault();
    runPinShortcut();
  });
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
  const widgetBounds = widget ? getWidgetWindowBounds(settings) : null;
  const widgetLock = widget && settings.widgetLockToScreen !== false;
  const { width, height } = primary.workAreaSize;

  mainWindow = new BrowserWindow({
    width: widgetBounds?.width ?? width,
    height: widgetBounds?.height ?? height,
    x: widgetBounds?.x ?? primary.workArea.x,
    y: widgetBounds?.y ?? primary.workArea.y,
    frame: false,
    transparent: widget,
    resizable: !widgetLock,
    movable: !widgetLock,
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
  setStoreBroadcastTarget(mainWindow.webContents);
  mainWindow.on("closed", () => {
    setStoreBroadcastTarget(null);
  });

  mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error("[SchoolUtil] preload failed:", preloadPath, error);
  });

  attachWindowShortcutHandler(mainWindow);
  mainWindow.setMenuBarVisibility(false);

  loadWindowContent(mainWindow);

  mainWindow.once("ready-to-show", () => {
    if (!mainWindow) return;
    if (widget) {
      applyWidgetWindowBounds();
    }
    mainWindow.show();
    if (widget && !pinnedToFront) {
      applyDesktopLayer();
    }
    updateWidgetDesktopMonitors();
    broadcastPinState();
    registerGlobalShortcuts();
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

  mainWindow.on("blur", () => {
    if (isWidgetMode() && !pinnedToFront) {
      setImmediate(() => syncWidgetDesktopLayer());
    }
  });

  if (widget) {
    attachWidgetSnapGuards(mainWindow);
  }

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
  } else if (isWidgetMode()) {
    applyWidgetWindowBounds();
  } else {
    win.setMinimumSize(0, 0);
    win.setMaximumSize(0, 0);
    win.setMovable(true);
    win.setBounds(bounds);
  }
}

function refreshTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(buildTrayMenu());
  const hidden = mainWindow?.isDestroyed() ? false : !mainWindow?.isVisible();
  const pinHint = hidden ? " (숨김)" : pinnedToFront ? " (맨 앞)" : "";
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
    const hidden = mainWindow?.isDestroyed() ? true : !mainWindow?.isVisible();
    if (hidden) {
      items.push({
        label: "맨 앞으로 보기 (Ctrl+Alt+D)",
        click: () => togglePinToFront(),
      });
    } else if (pinnedToFront) {
      items.push({
        label: "바탕화면으로",
        click: () => returnWidgetToDesktop(),
      });
      items.push({
        label: "숨기기 (Ctrl+Alt+D)",
        click: () => togglePinToFront(),
      });
    } else {
      items.push({
        label: "숨기기 (Ctrl+Alt+D)",
        click: () => togglePinToFront(),
      });
    }
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

function applyPortalSettings(settings: AppSettings): void {
  applyPortalSessionExtend(settings, () =>
    normalizeSettings(getState().settings),
  );
  schedulePortalAutoLogin(settings, async (portalId) => {
    const s = getState().settings;
    const res = await runPortalAutomation(s, portalId);
    recordPortalRun(
      portalId,
      res.ok,
      res.ok ? res.summary : res.error,
    );
  });
}

async function handlePortalRun(portalId: import("./portal-ids").PortalId) {
  const settings = getState().settings;
  const res = await runPortalAutomation(settings, portalId);
  recordPortalRun(portalId, res.ok, res.ok ? res.summary : res.error);
  if (!res.ok) {
    return { ok: false as const, error: res.error };
  }
  return {
    ok: true as const,
    mode: res.mode,
    summary: res.summary,
    reason: res.mode === "url_only" ? ("cert_auth" as const) : undefined,
  };
}

function refreshTimetableScheduler(settings: AppSettings) {
  if (shouldSchedulerRun(settings)) {
    startTimetableAutoSyncScheduler();
  } else {
    stopTimetableAutoSyncScheduler();
  }
}

function registerIpc() {
  ipcMain.handle("store:get", () => getState());
  ipcMain.handle("store:path", () => getStorePath());

  ipcMain.handle("store:patch", (_event, partial: unknown) => {
    const prev = currentSettings();
    const prevMode = prev.displayMode;
    const prevMonitor = prev.widgetMonitor;
    const prevLock = prev.widgetLockToScreen;
    const next = patchState(partial as Partial<PersistedState>);
    const settings = normalizeSettings(next.settings);
    applyLoginItem(settings.openAtLogin);
    registerGlobalShortcuts();
    recreateWindowIfNeeded(prevMode);
    if (
      isWidgetMode(settings) &&
      (prevMode !== settings.displayMode ||
        prevMonitor !== settings.widgetMonitor ||
        prevLock !== settings.widgetLockToScreen)
    ) {
      applyWidgetWindowBounds();
    }
    refreshTrayMenu();
    applyPortalSettings(settings);
    refreshTimetableScheduler(settings);
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

  ipcMain.handle("neis:key-status", () => {
    return getNeisKeyStatus(getState().settings);
  });

  ipcMain.handle(
    "neis:set-app-key",
    (_event, payload: { key?: string }) => {
      if (typeof payload?.key !== "string") {
        return { ok: false as const, error: "키 형식이 올바르지 않습니다." };
      }
      try {
        writeAppNeisKeyForAdmin(payload.key);
        return { ok: true as const, status: getNeisKeyStatus(getState().settings) };
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message : "공용 키 저장에 실패했습니다.",
        };
      }
    },
  );

  ipcMain.handle(
    "neis:search-schools",
    async (_event, payload: { query?: string; apiKey?: string }) => {
      const query = payload?.query;
      if (typeof query !== "string") {
        return { ok: false as const, error: "검색어가 올바르지 않습니다." };
      }
      const draftKey =
        typeof payload?.apiKey === "string" ? payload.apiKey : undefined;
      const settings = getState().settings;
      return withNeisApiKeyFallback(settings, draftKey, (key) =>
        searchSchools(key, query),
      );
    },
  );

  ipcMain.handle("update:check", () => checkForUpdates());
  ipcMain.handle("update:download", () => downloadUpdate());
  ipcMain.handle("update:install", () => {
    quitAndInstall();
  });

  ipcMain.handle("app:minimize", () => mainWindow?.minimize());
  ipcMain.handle("app:hide", () => mainWindow?.hide());
  ipcMain.handle("app:version", () => app.getVersion());

  ipcMain.handle("shell:openExternal", (_event, url: string) => {
    if (typeof url !== "string" || !isAllowedExternalUrl(url)) {
      return Promise.reject(new Error("허용되지 않은 URL입니다."));
    }
    return shell.openExternal(url);
  });

  ipcMain.handle(
    "portal:launch",
    async (_event, payload: { portalId?: string }) => {
      const portalId = payload?.portalId;
      if (typeof portalId !== "string" || !isPortalId(portalId)) {
        return {
          ok: false as const,
          error: "포털이 올바르지 않습니다.",
        };
      }
      const settings = getState().settings;
      const entry = settings.portals[portalId];
      if (!entry?.enabled) {
        return {
          ok: false as const,
          error: "이 포털은 설정에서 꺼져 있습니다.",
        };
      }
      if (!entry.url.trim()) {
        return { ok: false as const, error: "포털 URL이 비어 있습니다." };
      }
      return handlePortalRun(portalId);
    },
  );

  ipcMain.handle(
    "portal:run-automation",
    async (_event, payload: { portalId?: string }) => {
      const portalId = payload?.portalId;
      if (typeof portalId !== "string" || !isPortalId(portalId)) {
        return { ok: false as const, error: "포털이 올바르지 않습니다." };
      }
      return handlePortalRun(portalId);
    },
  );

  ipcMain.handle("portal:open-log", async () => {
    await openPortalLog();
    return { ok: true as const };
  });

  ipcMain.handle("portal:debug-help-url", () => {
    const browser = portalBrowserFromSettings(
      getState().settings.portalBrowser,
    );
    return { url: portalDebugHelpUrl(browser) };
  });

  ipcMain.handle(
    "portal:credential-status",
    (_event, payload: { portalId?: string }) => {
      const portalId = payload?.portalId;
      if (typeof portalId !== "string" || !isPortalId(portalId)) {
        return { hasUser: false, hasPassword: false };
      }
      return getPortalCredentialStatus(portalId);
    },
  );

  ipcMain.handle(
    "portal:clear-credentials",
    (_event, payload: { portalId?: string }) => {
      const portalId = payload?.portalId;
      if (typeof portalId !== "string" || !isPortalId(portalId)) {
        return { ok: false as const };
      }
      clearPortalCredentials(portalId);
      return { ok: true as const };
    },
  );

  ipcMain.handle("widget:get-pin", () => pinnedToFront);

  ipcMain.handle("widget:toggle-pin", () => {
    togglePinToFront();
    return pinnedToFront;
  });

  ipcMain.handle("widget:return-desktop", () => {
    returnWidgetToDesktop();
    return pinnedToFront;
  });

  ipcMain.handle("widget:wake-for-input", () => {
    wakeWidgetForInput();
  });

  ipcMain.handle("screen:list-displays", () => {
    const primaryId = screen.getPrimaryDisplay().id;
    return screen.getAllDisplays().map((d) => ({
      id: d.id,
      label: d.label || `디스플레이 ${d.id}`,
      primary: d.id === primaryId,
      workArea: d.workArea,
    }));
  });

  ipcMain.handle("widget:set-shape", () => {
    applyWidgetPointerPassthrough();
  });

  ipcMain.handle("widget:fit-screen", () => {
    if (!isWidgetMode()) {
      return { ok: false as const, error: "위젯 모드에서만 사용할 수 있습니다." };
    }
    applyWidgetWindowBounds();
    return { ok: true as const };
  });

  ipcMain.handle(
    "neis:meal",
    async (_event, range: { fromYmd?: string; toYmd?: string } = {}) => {
      try {
        const settings = getState().settings;
        const fromYmd =
          typeof range?.fromYmd === "string" ? range.fromYmd : undefined;
        const toYmd =
          typeof range?.toYmd === "string" ? range.toYmd : undefined;
        return await withNeisApiKeyFallback(settings, undefined, (key) =>
          fetchMeals(
            settingsWithResolvedNeisKey(settings, key),
            fromYmd,
            toYmd,
          ),
        );
      } catch (e) {
        return {
          ok: false as const,
          error:
            e instanceof Error ? e.message : "급식 처리 중 오류가 발생했습니다.",
        };
      }
    },
  );

  ipcMain.handle(
    "comcigan:search-schools",
    async (_event, payload: { query?: string }) => {
      const query = typeof payload?.query === "string" ? payload.query : "";
      try {
        const schools = await searchComciganSchools(query);
        return {
          ok: true as const,
          schools: schools.map((s) => ({
            regionName: s.regionName,
            schoolName: s.schoolName,
            schoolCode: s.schoolCode,
          })),
        };
      } catch (e) {
        return {
          ok: false as const,
          error:
            e instanceof Error ? e.message : "학교 검색 중 오류가 발생했습니다.",
        };
      }
    },
  );

  ipcMain.handle(
    "comcigan:list-teachers",
    async (
      _event,
      payload: {
        schoolCode?: number;
        mode?: "direct" | "s2h9";
        proxyBaseUrl?: string;
      },
    ) => {
      const schoolCode = Number(payload?.schoolCode);
      if (!Number.isFinite(schoolCode) || schoolCode <= 0) {
        return { ok: false as const, error: "학교 코드가 없습니다." };
      }
      const mode = payload?.mode === "s2h9" ? "s2h9" : "direct";
      try {
        const teachers = await listTeachers(
          schoolCode,
          mode,
          payload?.proxyBaseUrl,
        );
        return { ok: true as const, teachers };
      } catch (e) {
        return {
          ok: false as const,
          error:
            e instanceof Error ? e.message : "교사 목록을 받지 못했습니다.",
        };
      }
    },
  );

  ipcMain.handle("comcigan:sync-teacher", async () => {
    const result = await runTimetableAutoSync("manual");
    if (!result.ok) {
      return { ok: false as const, error: result.error ?? "갱신 실패" };
    }
    return { ok: true as const };
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
        return await withNeisApiKeyFallback(settings, undefined, (key) =>
          fetchSchoolSchedule(
            settingsWithResolvedNeisKey(settings, key),
            fromYmd,
            toYmd,
          ),
        );
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

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    if (isWidgetMode()) {
      applyWidgetWindowBounds();
    }
  }
});

app.whenReady().then(() => {
  initPersistence();
  registerIpc();
  attachDisplayListeners();
  createWindow();
  createTray();
  initAutoUpdate(() => mainWindow);
  applyLoginItem(getState().settings.openAtLogin);
  registerGlobalShortcuts();
  applyPortalSettings(getState().settings);
  refreshTimetableScheduler(getState().settings);

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
      if (isWidgetMode()) {
        applyWidgetWindowBounds();
      }
    }
  });
});

app.on("will-quit", () => {
  unregisterGlobalShortcuts();
  stopWidgetDesktopMonitor();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // keep running in tray on Windows
  }
});
