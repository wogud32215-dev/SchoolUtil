import { useCallback, useEffect, useState } from "react";
import { useNeisKeyStatus } from "@/hooks/useNeisKeyStatus";
import type { AppSettings, NeisScheduleRow } from "@/types/state";
import { monthNeisRange } from "@/utils/neisYmd";

export function useNeisMonthSchedule(
  settings: AppSettings,
  year: number,
  monthIndex: number,
): {
  items: NeisScheduleRow[];
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const { neisReady } = useNeisKeyStatus();
  const [items, setItems] = useState<NeisScheduleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const api = window.schoolUtil;
    if (!api?.fetchNeisSchedule) {
      setItems([]);
      setError(null);
      return;
    }

    const { fromYmd, toYmd } = monthNeisRange(year, monthIndex);
    setLoading(true);
    setError(null);

    try {
      const res = await api.fetchNeisSchedule({ fromYmd, toYmd });
      if (!res || typeof res !== "object" || !("ok" in res)) {
        setItems([]);
        setError("학사일정 응답 형식 오류");
        return;
      }
      if (!res.ok) {
        setItems([]);
        setError(res.error);
        return;
      }
      setItems(res.items);
    } catch (e) {
      setItems([]);
      setError(
        e instanceof Error ? e.message : "학사일정을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, [year, monthIndex, neisReady, settings.neisOfficeCode, settings.neisSchoolCode]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, loading, error, reload: () => void load() };
}
