import { app, dialog, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { DockShortcutItem } from "../src/types/state";

export const MAX_DOCK_SHORTCUTS = 12;

const MAX_PATH_LEN = 500;
const MAX_ICON_DATA_URL_LEN = 96_000;
const ALLOWED_LAUNCH_EXT = new Set([
  ".lnk",
  ".exe",
  ".bat",
  ".cmd",
  ".url",
]);

function basenameLabel(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

export function isAllowedDockLaunchPath(filePath: string): boolean {
  if (typeof filePath !== "string" || filePath.length === 0) return false;
  if (filePath.length > MAX_PATH_LEN) return false;
  if (!path.isAbsolute(filePath)) return false;
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_LAUNCH_EXT.has(ext)) return false;
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function iconSourcePath(sourcePath: string): string {
  const ext = path.extname(sourcePath).toLowerCase();
  if (ext !== ".lnk") return sourcePath;
  try {
    const link = shell.readShortcutLink(sourcePath);
    if (link.target && fs.existsSync(link.target)) {
      return link.target;
    }
  } catch {
    /* 바로가기 파싱 실패 시 원본 경로로 아이콘 시도 */
  }
  return sourcePath;
}

async function extractIconDataUrl(sourcePath: string): Promise<string> {
  const iconPath = iconSourcePath(sourcePath);
  const icon = await app.getFileIcon(iconPath, { size: "large" });
  for (const size of [48, 32] as const) {
    const resized = icon.resize({ width: size, height: size });
    const dataUrl = resized.toDataURL();
    if (dataUrl.length <= MAX_ICON_DATA_URL_LEN) {
      return dataUrl;
    }
  }
  return icon.resize({ width: 32, height: 32 }).toDataURL().slice(0, MAX_ICON_DATA_URL_LEN);
}

export async function pickDockShortcut(
  currentCount: number,
): Promise<
  | { ok: true; item: DockShortcutItem }
  | { ok: false; cancelled: true }
  | { ok: false; error: string }
> {
  if (currentCount >= MAX_DOCK_SHORTCUTS) {
    return {
      ok: false,
      error: `바로가기는 최대 ${MAX_DOCK_SHORTCUTS}개까지 추가할 수 있습니다.`,
    };
  }

  const result = await dialog.showOpenDialog({
    title: "자주 쓰는 앱 바로가기 선택",
    properties: ["openFile"],
    filters: [
      {
        name: "바로가기·실행 파일",
        extensions: ["lnk", "exe", "url", "bat", "cmd"],
      },
    ],
  });

  if (result.canceled || !result.filePaths[0]) {
    return { ok: false, cancelled: true };
  }

  const sourcePath = result.filePaths[0];
  if (!isAllowedDockLaunchPath(sourcePath)) {
    return { ok: false, error: "지원하지 않거나 찾을 수 없는 파일입니다." };
  }

  try {
    const iconDataUrl = await extractIconDataUrl(sourcePath);
    if (!iconDataUrl.startsWith("data:image/")) {
      return { ok: false, error: "아이콘을 가져오지 못했습니다." };
    }
    const item: DockShortcutItem = {
      id: randomUUID(),
      label: basenameLabel(sourcePath),
      sourcePath,
      iconDataUrl,
    };
    return { ok: true, item };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "바로가기를 추가하지 못했습니다.",
    };
  }
}

export async function launchDockShortcut(
  sourcePath: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isAllowedDockLaunchPath(sourcePath)) {
    return { ok: false, error: "실행할 수 없는 경로입니다." };
  }
  const err = await shell.openPath(sourcePath);
  if (err) {
    return { ok: false, error: err };
  }
  return { ok: true };
}
