/// <reference types="vite/client" />

type WidgetShapeRect = { x: number; y: number; width: number; height: number };

type BackupResult =
  | { ok: true }
  | { ok: false; cancelled: true }
  | { ok: false; error: string };

declare global {
  interface Window {
    schoolUtil?: {
      getState: () => Promise<import("@/types/state").PersistedState>;
      getStorePath: () => Promise<string>;
      patchState: (
        partial: Partial<import("@/types/state").PersistedState>,
      ) => Promise<import("@/types/state").PersistedState>;
      minimize: () => Promise<void>;
      hide: () => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      fetchNeisSchedule: (range?: {
        fromYmd?: string;
        toYmd?: string;
      }) => Promise<
        | { ok: true; items: import("@/types/state").NeisScheduleRow[] }
        | { ok: false; error: string }
      >;
      fetchNeisMeal: () => Promise<
        | { ok: true; lines: string[] }
        | { ok: false; error: string }
      >;
      fetchWeather: () => Promise<
        | {
            ok: true;
            data: {
              temp: number | null;
              code: number | null;
              wind: number | null;
            };
          }
        | { ok: false; error: string }
      >;
      searchNeisSchools: (
        query: string,
        apiKey?: string,
      ) => Promise<
        | { ok: true; schools: import("@/types/state").NeisSchoolRow[] }
        | { ok: false; error: string }
      >;
      exportBackup: () => Promise<BackupResult>;
      importBackup: () => Promise<BackupResult>;
      checkForUpdates: () => Promise<
        { ok: true; status: "checking" } | { ok: false; error: string }
      >;
      downloadUpdate: () => Promise<
        { ok: true } | { ok: false; error: string }
      >;
      installUpdate: () => Promise<void>;
      getPinToFront: () => Promise<boolean>;
      togglePinToFront: () => Promise<boolean>;
      setWindowShape: (rects: WidgetShapeRect[]) => Promise<void>;
      onPinChanged: (listener: (pinned: boolean) => void) => () => void;
      onDesktopLayerWarning: (
        listener: (payload: { ok: boolean }) => void,
      ) => () => void;
      onUpdateAvailable: (
        listener: (payload: { version: string }) => void,
      ) => () => void;
      onUpdateDownloaded: (listener: () => void) => () => void;
    };
  }
}

export {};
