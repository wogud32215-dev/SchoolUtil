import type { AppSettings } from "./store";
import { appendPortalLog } from "./portal-log";
import type { PortalId } from "./portal-ids";

let timer: ReturnType<typeof setInterval> | null = null;

/** 자동 로그인으로 연 창에서 세션 연장(POC: 주기 로그만, CDP 클릭은 추후). */
export function applyPortalSessionExtend(
  settings: AppSettings,
  getSettings: () => AppSettings,
): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (!settings.portalSessionExtend) return;

  const minutes = settings.portalSessionExtendMinutes ?? 50;
  const ms = minutes * 60 * 1000;
  appendPortalLog(`세션 자동 연장 예약: ${minutes}분마다 (POC)`);

  timer = setInterval(() => {
    const s = getSettings();
    if (!s.portalSessionExtend) return;
    appendPortalLog(
      "세션 연장 시각 — 사이트의 [연장]·[세션 시간 초기화] 버튼 자동 클릭은 추후 CDP로 추가됩니다.",
    );
  }, ms);
}

export async function runSessionExtendNow(
  _settings: AppSettings,
  portalId: PortalId,
): Promise<{ ok: boolean; error?: string }> {
  appendPortalLog(`[${portalId}] 지금 한 번 연장 요청 (POC)`);
  return { ok: true };
}
