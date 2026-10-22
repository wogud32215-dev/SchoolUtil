import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

/** electron-store보다 먼저 고정 경로를 잡는다 (import 순서 이슈 방지). */
const userData = path.join(app.getPath("appData"), "SchoolUtil");
app.setPath("userData", userData);

const legacyDir = path.join(app.getPath("appData"), "schoolutil");
const legacyFile = path.join(legacyDir, "schoolutil-data.json");
const newFile = path.join(userData, "schoolutil-data.json");

try {
  if (!fs.existsSync(newFile) && fs.existsSync(legacyFile)) {
    fs.mkdirSync(userData, { recursive: true });
    fs.copyFileSync(legacyFile, newFile);
  }
} catch {
  /* 마이그레이션 실패해도 앱은 계속 */
}

void import("./main");
