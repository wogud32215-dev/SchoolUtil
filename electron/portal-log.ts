import { app, shell } from "electron";
import fs from "node:fs";
import path from "node:path";

const LOG_NAME = "portal.log";
const MAX_LINES = 400;

function logPath(): string {
  return path.join(app.getPath("userData"), LOG_NAME);
}

function redact(line: string): string {
  return line
    .replace(/password[=:]\s*\S+/gi, "password=[redacted]")
    .replace(/비밀번호[=:]\s*\S+/g, "비밀번호=[redacted]");
}

export function appendPortalLog(message: string): void {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  const line = redact(`[${ts}] ${message}`);
  try {
    const p = logPath();
    let prev = "";
    if (fs.existsSync(p)) {
      prev = fs.readFileSync(p, "utf8");
    }
    const lines = (prev ? prev.split(/\r?\n/) : []).filter(Boolean);
    lines.push(line);
    const trimmed = lines.slice(-MAX_LINES).join("\n") + "\n";
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, trimmed, "utf8");
  } catch {
    /* 로그 실패해도 자동화는 계속 */
  }
}

export function getPortalLogPath(): string {
  return logPath();
}

export async function openPortalLog(): Promise<void> {
  const p = logPath();
  if (!fs.existsSync(p)) {
    appendPortalLog("아직 기록이 없습니다.");
  }
  await shell.openPath(p);
}
