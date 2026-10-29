import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** PowerShell UIA 스크립트 — dev·패키징(asar.unpacked) 경로를 순서대로 탐색 */
export function resolveUiaScriptPath(fileName: string): string {
  const candidates: string[] = [];

  if (app.isPackaged) {
    const resourcesDir = path.dirname(app.getAppPath());
    candidates.push(
      path.join(resourcesDir, "app.asar.unpacked", "dist-electron", fileName),
    );
  }

  const bundleDir = path.dirname(fileURLToPath(import.meta.url));
  candidates.push(path.join(bundleDir, fileName));
  candidates.push(path.join(bundleDir, "..", "electron", fileName));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return candidates[candidates.length - 1] ?? fileName;
}
