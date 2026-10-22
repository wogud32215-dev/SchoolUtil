import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { PersistedState } from "./store";
import { validateFullState } from "./validate-patch";

function userDir(): string {
  return app.getPath("userData");
}

function dataFile(): string {
  return path.join(userDir(), "schoolutil-data.json");
}

function copyFileSafe(from: string, to: string): void {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

/** 저장 직전 스냅샷 (데이터 파일이 있을 때만). */
export function writePrePatchBackup(): void {
  const src = dataFile();
  if (!fs.existsSync(src)) return;
  try {
    copyFileSafe(src, path.join(userDir(), "schoolutil-data.backup.json"));
    const day = new Date().toISOString().slice(0, 10);
    copyFileSafe(src, path.join(userDir(), `schoolutil-data.day-${day}.json`));
    pruneDayBackups(5);
  } catch {
    /* 백업 실패해도 저장은 계속 */
  }
}

function pruneDayBackups(keep: number): void {
  const dir = userDir();
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("schoolutil-data.day-") && f.endsWith(".json"))
    .sort()
    .reverse();
  for (const f of files.slice(keep)) {
    try {
      fs.unlinkSync(path.join(dir, f));
    } catch {
      /* ignore */
    }
  }
}

export function exportStateToFile(
  filePath: string,
  state: PersistedState,
): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "SchoolUtil",
    version: 1,
    state,
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

export function importStateFromFile(filePath: string): PersistedState {
  const raw = fs.readFileSync(filePath, "utf8");
  const json = JSON.parse(raw) as { state?: unknown } | unknown;
  const state =
    json && typeof json === "object" && "state" in json
      ? (json as { state: unknown }).state
      : json;
  return validateFullState(state);
}
