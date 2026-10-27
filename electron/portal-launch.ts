import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import { shell } from "electron";
import { isAllowedPortalUrl } from "./portal-ids";

export type PortalBrowser = "default" | "chrome" | "edge" | "whale";

export { isAllowedPortalUrl };

const CHROME_CANDIDATES = [
  process.env.LOCALAPPDATA
    ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
    : "",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

const WHALE_CANDIDATES = [
  process.env.LOCALAPPDATA
    ? `${process.env.LOCALAPPDATA}\\Naver\\Naver Whale\\Application\\whale.exe`
    : "",
  "C:\\Program Files\\Naver\\Naver Whale\\Application\\whale.exe",
].filter(Boolean);

function firstExisting(paths: string[]): string | null {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function resolveViaWhere(command: string): string | null {
  try {
    const out = execFileSync("where", [command], {
      encoding: "utf8",
      windowsHide: true,
    });
    const line = out.split(/\r?\n/).find((l) => l.trim().length > 0);
    return line?.trim() ?? null;
  } catch {
    return null;
  }
}

export function resolveBrowserExecutable(
  mode: PortalBrowser,
): string | "default" {
  if (mode === "default") return "default";
  if (mode === "chrome") {
    return (
      firstExisting(CHROME_CANDIDATES) ?? resolveViaWhere("chrome") ?? "default"
    );
  }
  if (mode === "whale") {
    return (
      firstExisting(WHALE_CANDIDATES) ?? resolveViaWhere("whale") ?? "default"
    );
  }
  return (
    firstExisting(EDGE_CANDIDATES) ?? resolveViaWhere("msedge") ?? "default"
  );
}

export async function launchPortalUrl(
  url: string,
  browser: PortalBrowser,
): Promise<void> {
  if (!isAllowedPortalUrl(url)) {
    throw new Error("허용되지 않은 URL입니다.");
  }
  const exe = resolveBrowserExecutable(browser);
  if (exe === "default") {
    await shell.openExternal(url);
    return;
  }
  const child = spawn(exe, [url], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}

export function portalBrowserFromSettings(
  browser: string | undefined,
): PortalBrowser {
  if (
    browser === "chrome" ||
    browser === "edge" ||
    browser === "whale" ||
    browser === "default"
  ) {
    return browser;
  }
  return "default";
}
