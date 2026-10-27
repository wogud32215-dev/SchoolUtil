import type { AppSettings, PortalId } from "@/types/state";

export const PORTAL_BROWSER_LABELS: Record<
  AppSettings["portalBrowser"],
  string
> = {
  default: "시스템 기본 브라우저",
  chrome: "Chrome",
  edge: "Edge",
  whale: "Whale",
};

export function portalBrowserLabel(
  browser: AppSettings["portalBrowser"],
): string {
  return PORTAL_BROWSER_LABELS[browser] ?? "브라우저";
}

export function portalUrlPreview(url: string, max = 42): string {
  const t = url.trim();
  if (!t) return "(URL 없음)";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export const PORTAL_CARD_LABELS: Record<PortalId, string> = {
  nice: "나이스",
  edufine: "에듀파인",
  goePortal: "경기 업무포털",
};
