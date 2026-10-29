import { app } from "electron";
import path from "node:path";
import fs from "node:fs";

const GUIDE_FILE = "사용설명서.html";

/** 설치본·개발 모두에서 docs/사용설명서.html 경로 */
export function resolveUserGuideHtmlPath(): string {
  const candidates = [
    path.join(process.resourcesPath, "docs", GUIDE_FILE),
    path.join(app.getAppPath(), "docs", GUIDE_FILE),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[candidates.length - 1];
}
