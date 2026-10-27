import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type UiaCertResult =
  | { ok: true; windowHwnd: bigint; filled: boolean }
  | { ok: false; reason: string };

function resolveUiaScriptPath(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const names = ["portal-cert-uia.ps1"];
  for (const base of [dir, path.join(dir, "..", "electron")]) {
    for (const name of names) {
      const full = path.join(base, name);
      if (fs.existsSync(full)) return full;
    }
  }
  return path.join(dir, "portal-cert-uia.ps1");
}

/**
 * UI Automation으로 K-SIGN 등 인증서 창을 찾고 암호 입력을 시도합니다.
 */
export async function tryCertPasswordViaUia(
  password: string,
): Promise<UiaCertResult> {
  const pass = password.trim();
  if (!pass) {
    return { ok: false, reason: "비밀번호 없음" };
  }

  const scriptPath = resolveUiaScriptPath();
  if (!fs.existsSync(scriptPath)) {
    return { ok: false, reason: "portal-cert-uia.ps1 없음" };
  }

  return new Promise((resolve) => {
    const ps = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Sta",
        "-File",
        scriptPath,
      ],
      {
        windowsHide: true,
        env: {
          ...process.env,
          SCHOOLUTIL_CERT_PASSWORD: pass,
        },
      },
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
          const data = JSON.parse(line) as {
            hwnd?: number;
            filled?: boolean;
          };
          if (data.hwnd && data.hwnd > 0) {
            resolve({
              ok: true,
              windowHwnd: BigInt(data.hwnd),
              filled: Boolean(data.filled),
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
        reason: detail.slice(0, 240) || "UIA 인증서 창 없음",
      });
    });
  });
}
