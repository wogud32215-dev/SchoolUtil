import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { PersistedState } from "../src/types/state";

type ShapeRect = { x: number; y: number; width: number; height: number };

const api = {
  getState: (): Promise<PersistedState> => ipcRenderer.invoke("store:get"),
  getStorePath: (): Promise<string> => ipcRenderer.invoke("store:path"),
  patchState: (partial: Partial<PersistedState>): Promise<PersistedState> =>
    ipcRenderer.invoke("store:patch", partial),
  minimize: () => ipcRenderer.invoke("app:minimize"),
  hide: () => ipcRenderer.invoke("app:hide"),
  getAppVersion: () => ipcRenderer.invoke("app:version") as Promise<string>,
  listDisplays: () =>
    ipcRenderer.invoke("screen:list-displays") as Promise<
      {
        id: number;
        label: string;
        primary: boolean;
        workArea: { x: number; y: number; width: number; height: number };
      }[]
    >,
  openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  launchPortal: (portalId: import("../src/types/state").PortalId) =>
    ipcRenderer.invoke("portal:launch", { portalId }),
  getPortalCredentialStatus: (portalId: import("../src/types/state").PortalId) =>
    ipcRenderer.invoke("portal:credential-status", { portalId }) as Promise<{
      hasUser: boolean;
      hasPassword: boolean;
    }>,
  clearPortalCredentials: (portalId: import("../src/types/state").PortalId) =>
    ipcRenderer.invoke("portal:clear-credentials", { portalId }) as Promise<{
      ok: boolean;
    }>,
  runPortalAutomation: (portalId: import("../src/types/state").PortalId) =>
    ipcRenderer.invoke("portal:run-automation", { portalId }),
  openPortalLog: () => ipcRenderer.invoke("portal:open-log"),
  getPortalDebugHelpUrl: () =>
    ipcRenderer.invoke("portal:debug-help-url") as Promise<{ url: string }>,
  launchBrityMessenger: () =>
    ipcRenderer.invoke("brity:launch") as Promise<
      | {
          ok: true;
          mode: "launch_only" | "automation";
          summary?: string;
          reason?: "cert_auth";
        }
      | { ok: false; error: string }
    >,
  getBrityCredentialStatus: () =>
    ipcRenderer.invoke("brity:credential-status") as Promise<{
      hasPassword: boolean;
    }>,
  clearBrityCredentials: () =>
    ipcRenderer.invoke("brity:clear-credentials") as Promise<{ ok: boolean }>,
  fetchNeisSchedule: (range?: { fromYmd?: string; toYmd?: string }) =>
    ipcRenderer.invoke("neis:schedule", range ?? {}),
  fetchNeisMeal: (range?: { fromYmd?: string; toYmd?: string }) =>
    ipcRenderer.invoke("neis:meal", range ?? {}),
  fetchWeather: () => ipcRenderer.invoke("weather:current"),
  fetchWeatherForecast: () => ipcRenderer.invoke("weather:forecast"),
  searchComciganSchools: (query: string) =>
    ipcRenderer.invoke("comcigan:search-schools", { query }) as Promise<
      | {
          ok: true;
          schools: {
            regionName: string;
            schoolName: string;
            schoolCode: number;
          }[];
        }
      | { ok: false; error: string }
    >,
  listComciganTeachers: (opts: {
    schoolCode: number;
    mode: "direct" | "s2h9";
    proxyBaseUrl?: string;
  }) =>
    ipcRenderer.invoke("comcigan:list-teachers", opts) as Promise<
      | { ok: true; teachers: string[] }
      | { ok: false; error: string }
    >,
  syncComciganTeacherTimetable: () =>
    ipcRenderer.invoke("comcigan:sync-teacher") as Promise<
      | { ok: true }
      | { ok: false; error: string }
    >,
  searchNeisSchools: (query: string, apiKey?: string) =>
    ipcRenderer.invoke("neis:search-schools", { query, apiKey }),
  getNeisKeyStatus: () =>
    ipcRenderer.invoke("neis:key-status") as Promise<
      import("../src/types/state").NeisKeyStatus
    >,
  setAppNeisKey: (key: string) =>
    ipcRenderer.invoke("neis:set-app-key", { key }) as Promise<
      | { ok: true; status: import("../src/types/state").NeisKeyStatus }
      | { ok: false; error: string }
    >,
  exportBackup: () => ipcRenderer.invoke("backup:export"),
  importBackup: () => ipcRenderer.invoke("backup:import"),
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  downloadUpdate: () => ipcRenderer.invoke("update:download"),
  installUpdate: () => ipcRenderer.invoke("update:install"),
  getPinToFront: (): Promise<boolean> => ipcRenderer.invoke("widget:get-pin"),
  togglePinToFront: (): Promise<boolean> =>
    ipcRenderer.invoke("widget:toggle-pin"),
  returnWidgetToDesktop: (): Promise<boolean> =>
    ipcRenderer.invoke("widget:return-desktop"),
  fitWidgetToScreen: () =>
    ipcRenderer.invoke("widget:fit-screen") as Promise<
      { ok: true } | { ok: false; error: string }
    >,
  wakeForInput: () => ipcRenderer.invoke("widget:wake-for-input"),
  setWindowShape: (rects: ShapeRect[]) =>
    ipcRenderer.invoke("widget:set-shape", rects),
  onPinChanged: (listener: (pinned: boolean) => void) => {
    const handler = (_event: IpcRendererEvent, pinned: boolean) => {
      listener(pinned);
    };
    ipcRenderer.on("widget:pin-changed", handler);
    return () => {
      ipcRenderer.removeListener("widget:pin-changed", handler);
    };
  },
  onDesktopLayerWarning: (listener: (payload: { ok: boolean }) => void) => {
    const handler = (_event: IpcRendererEvent, payload: { ok: boolean }) => {
      listener(payload);
    };
    ipcRenderer.on("widget:desktop-layer", handler);
    return () => {
      ipcRenderer.removeListener("widget:desktop-layer", handler);
    };
  },
  onRefreshShape: (listener: () => void) => {
    const handler = () => listener();
    ipcRenderer.on("widget:refresh-shape", handler);
    return () => ipcRenderer.removeListener("widget:refresh-shape", handler);
  },
  onUpdateAvailable: (listener: (payload: { version: string }) => void) => {
    const handler = (_event: IpcRendererEvent, payload: { version: string }) => {
      listener(payload);
    };
    ipcRenderer.on("update:available", handler);
    return () => ipcRenderer.removeListener("update:available", handler);
  },
  onUpdateDownloaded: (listener: () => void) => {
    const handler = () => listener();
    ipcRenderer.on("update:downloaded", handler);
    return () => ipcRenderer.removeListener("update:downloaded", handler);
  },
  onUpdateNotAvailable: (listener: () => void) => {
    const handler = () => listener();
    ipcRenderer.on("update:not-available", handler);
    return () => ipcRenderer.removeListener("update:not-available", handler);
  },
  onUpdateError: (listener: (payload: { message: string }) => void) => {
    const handler = (_event: IpcRendererEvent, payload: { message: string }) => {
      listener(payload);
    };
    ipcRenderer.on("update:error", handler);
    return () => ipcRenderer.removeListener("update:error", handler);
  },
  onStoreUpdated: (listener: (state: PersistedState) => void) => {
    const handler = (_event: IpcRendererEvent, next: PersistedState) => {
      listener(next);
    };
    ipcRenderer.on("store:updated", handler);
    return () => ipcRenderer.removeListener("store:updated", handler);
  },
};

contextBridge.exposeInMainWorld("schoolUtil", api);

export type SchoolUtilApi = typeof api;
