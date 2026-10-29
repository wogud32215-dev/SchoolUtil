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
      getAppVersion: () => Promise<string>;
      listDisplays: () => Promise<
        {
          id: number;
          label: string;
          primary: boolean;
          workArea: { x: number; y: number; width: number; height: number };
        }[]
      >;
      openExternal: (url: string) => Promise<void>;
      launchPortal: (portalId: import("@/types/state").PortalId) => Promise<
        | {
            ok: true;
            mode: "url_only" | "automation";
            summary?: string;
            reason?: "cert_auth";
          }
        | { ok: false; error: string }
      >;
      runPortalAutomation: (
        portalId: import("@/types/state").PortalId,
      ) => Promise<
        | {
            ok: true;
            mode: "url_only" | "automation";
            summary?: string;
            reason?: "cert_auth";
          }
        | { ok: false; error: string }
      >;
      openPortalLog: () => Promise<{ ok: boolean }>;
      getPortalDebugHelpUrl: () => Promise<{ url: string }>;
      getPortalCredentialStatus: (
        portalId: import("@/types/state").PortalId,
      ) => Promise<{ hasUser: boolean; hasPassword: boolean }>;
      clearPortalCredentials: (
        portalId: import("@/types/state").PortalId,
      ) => Promise<{ ok: boolean }>;
      launchBrityMessenger: () => Promise<
        | {
            ok: true;
            mode: "launch_only" | "automation";
            summary?: string;
            reason?: "cert_auth";
          }
        | { ok: false; error: string }
      >;
      getBrityCredentialStatus: () => Promise<{ hasPassword: boolean }>;
      clearBrityCredentials: () => Promise<{ ok: boolean }>;
      fetchNeisSchedule: (range?: {
        fromYmd?: string;
        toYmd?: string;
      }) => Promise<
        | { ok: true; items: import("@/types/state").NeisScheduleRow[] }
        | { ok: false; error: string }
      >;
      fetchNeisMeal: (range?: {
        fromYmd?: string;
        toYmd?: string;
      }) => Promise<
        | { ok: true; days: import("@/types/state").NeisMealDay[] }
        | { ok: false; error: string }
      >;
      searchComciganSchools: (
        query: string,
      ) => Promise<
        | {
            ok: true;
            schools: {
              regionName: string;
              schoolName: string;
              schoolCode: number;
            }[];
          }
        | { ok: false; error: string }
      >;
      listComciganTeachers: (opts: {
        schoolCode: number;
        mode: "direct" | "s2h9";
        proxyBaseUrl?: string;
      }) => Promise<
        | { ok: true; teachers: import("@/types/state").ComciganTeacherOption[] }
        | { ok: false; error: string }
      >;
      syncComciganTeacherTimetable: () => Promise<
        | { ok: true }
        | { ok: false; error: string }
      >;
      fetchWeather: () => Promise<
        | {
            ok: true;
            data: import("@/types/weather").WeatherSnapshot;
          }
        | { ok: false; error: string }
      >;
      fetchWeatherForecast: () => Promise<
        | { ok: true; data: import("@/types/weather").WeatherForecastData }
        | { ok: false; error: string }
      >;
      searchNeisSchools: (
        query: string,
        apiKey?: string,
      ) => Promise<
        | { ok: true; schools: import("@/types/state").NeisSchoolRow[] }
        | { ok: false; error: string }
      >;
      getNeisKeyStatus: () => Promise<import("@/types/state").NeisKeyStatus>;
      setAppNeisKey: (
        key: string,
      ) => Promise<
        | { ok: true; status: import("@/types/state").NeisKeyStatus }
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
      getUpdateStatus: () => Promise<{
        available: boolean;
        version: string | null;
        downloadPhase: "idle" | "downloading" | "downloaded";
        downloadPercent: number;
        downloadTransferred: number;
        downloadTotal: number;
        lastError: string | null;
        checking: boolean;
      }>;
      installUpdate: () => Promise<void>;
      getPinToFront: () => Promise<boolean>;
      togglePinToFront: () => Promise<boolean>;
      returnWidgetToDesktop: () => Promise<boolean>;
      fitWidgetToScreen: () => Promise<
        { ok: true } | { ok: false; error: string }
      >;
      wakeForInput: () => Promise<void>;
      setWindowShape: (rects: WidgetShapeRect[]) => Promise<void>;
      onPinChanged: (listener: (pinned: boolean) => void) => () => void;
      onDesktopLayerWarning: (
        listener: (payload: { ok: boolean }) => void,
      ) => () => void;
      onRefreshShape: (listener: () => void) => () => void;
      onUpdateAvailable: (
        listener: (payload: { version: string }) => void,
      ) => () => void;
      onUpdateDownloaded: (listener: () => void) => () => void;
      onUpdateNotAvailable: (listener: () => void) => () => void;
      onUpdateError: (listener: (payload: { message: string }) => void) => () => void;
      onUpdateProgress: (listener: (payload: {
        percent: number;
        transferred: number;
        total: number;
      }) => void) => () => void;
      onStoreUpdated: (
        listener: (state: import("@/types/state").PersistedState) => void,
      ) => () => void;
    };
  }
}

export {};
