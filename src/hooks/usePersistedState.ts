import { useCallback, useEffect, useState } from "react";
import type { PersistedState } from "@/types/state";
import { defaultTimetable } from "@/utils/timetable";

const fallback: PersistedState = {
  todos: [],
  memos: [],
  ddays: [],
  timetable: defaultTimetable(),
  layout: {},
  settings: {
    theme: "blue",
    openAtLogin: false,
    neisApiKey: "",
    neisOfficeCode: "",
    neisSchoolCode: "",
    schoolName: "",
    weatherLat: 37.5665,
    weatherLon: 126.978,
    weatherLabel: "서울",
    displayMode: "widget",
    globalShortcuts: true,
    disabledWidgets: [],
    onboardingDone: false,
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
