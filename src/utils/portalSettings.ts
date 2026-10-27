import type { AppSettings, PortalId, PortalRunRecord } from "@/types/state";
import { PORTAL_CARD_LABELS } from "@/utils/portalLabels";

export const PORTAL_IDS_ORDER: PortalId[] = ["nice", "edufine", "goePortal"];

export const PORTAL_USER_KEYS: Record<PortalId, keyof AppSettings> = {
  nice: "portalNiceUser",
  edufine: "portalEdufineUser",
  goePortal: "portalGoeUser",
};

export const PORTAL_PASSWORD_KEYS: Record<PortalId, keyof AppSettings> = {
  nice: "portalNicePassword",
  edufine: "portalEdufinePassword",
  goePortal: "portalGoePassword",
};

export const PORTAL_LAST_RUN_KEYS: Record<PortalId, keyof AppSettings> = {
  nice: "portalLastNice",
  edufine: "portalLastEdufine",
  goePortal: "portalLastGoe",
};

export function portalLabel(id: PortalId): string {
  return PORTAL_CARD_LABELS[id];
}

export function portalLastRun(
  settings: AppSettings,
  id: PortalId,
): PortalRunRecord | undefined {
  const v = settings[PORTAL_LAST_RUN_KEYS[id]];
  if (!v || typeof v !== "object") return undefined;
  return v as PortalRunRecord;
}
