import { useCallback, useEffect, useState } from "react";
import type { PersistedState } from "@/types/state";
import { defaultTimetable } from "@/utils/timetable";

const fallback: PersistedState = {
  todos: [],
  memos: [],
  ddays: [],
  calendarEvents: [],
  timetable: defaultTimetable(),
  layout: {},
  settings: {
    theme: "sky",
    fontFamily: "pretendard",
    fontWeightLevel: "medium",
    uiDensity: "cozy",
    cardTexture: "glass",
    accentCard: "none",
    backgroundFill: "transparent",
    cardOpacity: 72,
    designPeek: false,
    layoutPreset: "bento",
    openAtLogin: false,
    neisApiKey: "",
    neisOfficeCode: "",
    neisSchoolCode: "",
    schoolName: "",
    weatherLat: 37.5665,
    weatherLon: 126.978,
    weatherLabel: "서울",
    displayMode: "widget",
    widgetMonitor: "primary",
    widgetLockToScreen: true,
    settingsDockX: 50,
    settingsDockY: 94,
    globalShortcuts: true,
    disabledWidgets: [],
    todayGlanceEnabled: true,
    todayGlanceLastShownDate: "",
    todayGlanceFontSize: "large",
    todayGlanceSections: {
      todos: true,
      timetable: true,
      meal: true,
      calendar: true,
      dday: true,
      memo: false,
      weather: false,
    },
    onboardingDone: false,
    portalBrowser: "default",
    portalEducationOffice: "custom",
    portalLoginMode: "url_only",
    portalAutoLogin: false,
    portalAutoLoginDelay: "20",
    portalAutomationTarget: "nice",
    portalSessionExtend: false,
    portalSessionExtendMinutes: 50,
    portalOsCertInput: false,
    portals: {
      nice: { enabled: true, url: "https://www.neis.go.kr/" },
      edufine: { enabled: true, url: "https://www.edufine.go.kr/" },
      goePortal: {
        enabled: true,
        url: "https://goe.eduptl.kr/bpm_lgn_lg00_001.do",
      },
    },
    portalNiceUser: "",
    portalNicePassword: "",
    portalEdufineUser: "",
    portalEdufinePassword: "",
    portalGoeUser: "",
    portalGoePassword: "",
    brityMessengerEnabled: false,
    brityMessengerExePath: "",
    brityMessengerCertLabel: "",
    brityMessengerShareGoeCredentials: true,
    brityMessengerPassword: "",
    timetableAutoSync: false,
    timetableFetchMode: "direct",
    timetableProxyBaseUrl: "https://timetable.s2h9.dev",
    comciganSchoolCode: "",
    comciganSchoolName: "",
    comciganTeacherName: "",
    comciganTeacherIndex: -1,
    comciganClassLabelMode: "general",
    timetableLastSyncAt: "",
    timetableLastSyncError: "",
    timetableLastSyncVia: "",
    timetableLastSyncReason: "",
    timetableSubstituteNotifiedKey: "",
  },
};

export function usePersistedState() {
  const [state, setState] = useState<PersistedState | null>(null);
  const [ready, setReady] = useState(false);
  const [electronOk, setElectronOk] = useState(true);
  const [persistError, setPersistError] = useState<string | null>(null);

  useEffect(() => {
    const api = window.schoolUtil;
    if (!api?.getState) {
      setElectronOk(false);
      setState(fallback);
      setReady(true);
      return;
    }
    api
      .getState()
      .then((s) => {
        setState(s);
        setReady(true);
      })
      .catch(() => {
        setPersistError("저장 데이터를 불러오지 못했습니다.");
        setState(fallback);
        setReady(true);
      });
  }, []);

  useEffect(() => {
    const api = window.schoolUtil;
    if (!api?.onStoreUpdated) return;
    return api.onStoreUpdated((next) => {
      setState(next);
    });
  }, []);

  const patch = useCallback(async (partial: Partial<PersistedState>) => {
    setPersistError(null);
    setState((prev) => {
      if (!prev) return prev;
      return { ...prev, ...partial };
    });
    const api = window.schoolUtil;
    if (!api?.patchState) {
      setElectronOk(false);
      setPersistError(
        "Electron에 연결되지 않습니다. Chrome/Edge 탭(localhost)이 아니라, npm run dev와 함께 뜨는 «SchoolUtil» 데스크톱 창을 사용하세요. dev를 재시작한 뒤 다시 시도하세요.",
      );
      return null;
    }
    try {
      const next = await api.patchState(partial);
      setState(next);
      return next;
    } catch {
      setPersistError("디스크에 저장하지 못했습니다. 다시 시도해 주세요.");
      return null;
    }
  }, []);

  return { state, ready, patch, electronOk, persistError };
}
