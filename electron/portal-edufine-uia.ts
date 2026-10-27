import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type EdufineUiaClickResult =
  | { ok: true; windowTitle: string }
  | { ok: false; reason: string };

function resolveScriptPath(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const full = path.join(dir, "portal-edufine-uia.ps1");
  if (fs.existsSync(full)) return full;
  return path.join(dir, "..", "electron", "portal-edufine-uia.ps1");
}

/** Nexacro 화면에서 CDP로 단추를 못 찾을 때 UI Automation으로 인증서 로그인을 누릅니다. */
export async function tryEdufineCertLoginViaUia(): Promise<EdufineUiaClickResult> {
  const scriptPath = resolveScriptPath();
  if (!fs.existsSync(scriptPath)) {
    return { ok: false, reason: "portal-edufine-uia.ps1 없음" };
  }

  return new Promise((resolve) => {
    const ps = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Sta", "-File", scriptPath],
      { windowsHide: true },
    );

    let stdout = "";
    let stderr = "";
    ps.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    ps.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    ps.on("error", (e) => {
      resolve({
        ok: false,
        reason: e instanceof Error ? e.message : "PowerShell 실행 실패",
      });
    });
    ps.on("exit", (code) => {
      const line = stdout
        .split(/\r?\n/)
        .map((s) => s.trim())
        .find((s) => s.startsWith("{"));
      if (code === 0 && line) {
        try {
          const data = JSON.parse(line) as { clicked?: boolean; title?: string };
          if (data.clicked) {
            resolve({
              ok: true,
              windowTitle: String(data.title ?? ""),
            });
            return;
          }
        } catch {
          /* fall through */
        }
      }
      const detail = stderr.trim() || stdout.trim() || `exit ${code ?? "?"}`;
      resolve({
        ok: false,
        reason: detail.slice(0, 240) || "UIA 에듀파인 단추 없음",
      });
    });
  });
}
