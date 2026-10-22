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
  openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  fetchNeisSchedule: (range?: { fromYmd?: string; toYmd?: string }) =>
    ipcRenderer.invoke("neis:schedule", range ?? {}),
  fetchNeisMeal: () => ipcRenderer.invoke("neis:meal"),
  fetchWeather: () => ipcRenderer.invoke("weather:current"),
  searchNeisSchools: (query: string, apiKey?: string) =>
    ipcRenderer.invoke("neis:search-schools", { query, apiKey }),
  exportBackup: () => ipcRenderer.invoke("backup:export"),
  importBackup: () => ipcRenderer.invoke("backup:import"),
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  downloadUpdate: () => ipcRenderer.invoke("update:download"),
  installUpdate: () => ipcRenderer.invoke("update:install"),
  getPinToFront: (): Promise<boolean> => ipcRenderer.invoke("widget:get-pin"),
  togglePinToFront: (): Promise<boolean> =>
    ipcRenderer.invoke("widget:toggle-pin"),
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
};

contextBridge.exposeInMainWorld("schoolUtil", api);

export type SchoolUtilApi = typeof api;
