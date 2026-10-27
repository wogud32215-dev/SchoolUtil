import type { AppSettings } from "./store";
import { appendPortalLog } from "./portal-log";
import type { PortalId } from "./portal-ids";

let bootTimer: ReturnType<typeof setTimeout> | null = null;

function delayMs(settings: AppSettings): number | null {
  const d = settings.portalAutoLoginDelay ?? "20";
  if (d === "manual") return null;
  if (d === "0") return 0;
  if (d === "45") return 45_000;
  return 20_000;
}

export function schedulePortalAutoLogin(
  settings: AppSettings,
  run: (portalId: PortalId) => Promise<void>,
): void {
  if (bootTimer) {
    clearTimeout(bootTimer);
    bootTimer = null;
  }
  if (!settings.portalAutoLogin) return;
  const ms = delayMs(settings);
  if (ms === null) return;

  const target = settings.portalAutomationTarget ?? "nice";
  appendPortalLog(
    `부팅 후 자동 로그인 예약: ${ms === 0 ? "바로" : `${ms / 1000}초 뒤`} (${target})`,
  );
  bootTimer = setTimeout(() => {
    void run(target);
  }, ms);
}
