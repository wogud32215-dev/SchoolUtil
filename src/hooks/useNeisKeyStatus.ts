import { useCallback, useEffect, useState } from "react";
import type { NeisKeyStatus } from "@/types/state";

export function useNeisKeyStatus(): {
  status: NeisKeyStatus | null;
  refresh: () => Promise<void>;
  neisReady: boolean;
} {
  const [status, setStatus] = useState<NeisKeyStatus | null>(null);

  const refresh = useCallback(async () => {
    const api = window.schoolUtil;
    if (!api?.getNeisKeyStatus) {
      setStatus(null);
      return;
    }
    setStatus(await api.getNeisKeyStatus());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const neisReady = status ? status.mode !== "none" : false;

  return { status, refresh, neisReady };
}
