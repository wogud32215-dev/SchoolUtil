export const PORTAL_IDS = ["nice", "edufine", "goePortal"] as const;

export type PortalId = (typeof PORTAL_IDS)[number];

export function isPortalId(value: string): value is PortalId {
  return (PORTAL_IDS as readonly string[]).includes(value);
}

export const DEFAULT_PORTAL_URLS: Record<PortalId, string> = {
  nice: "https://www.neis.go.kr/",
  edufine: "https://www.edufine.go.kr/",
  goePortal: "https://goe.eduptl.kr/bpm_lgn_lg00_001.do",
};

export const PORTAL_LABELS: Record<PortalId, string> = {
  nice: "나이스",
  edufine: "에듀파인",
  goePortal: "경기 업무포털",
};

export function isAllowedPortalUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
