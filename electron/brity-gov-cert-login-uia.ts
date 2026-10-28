import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GOV_CERT_LOGIN_UIA_TIMEOUT_MS = 10_000;

export type GovCertLoginUiaResult =
  | { ok: true; buttonName: string; windowTitle: string }
  | { ok: false; reason: string };

function resolveScriptPath(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const full = path.join(dir, "brity-gov-cert-login-uia.ps1");
  if (fs.existsSync(full)) return full;
  return path.join(dir, "..", "electron", "brity-gov-cert-login-uia.ps1");
}

/** Brity 로그인 후 새 창의 «교육행정 전자서명 인증서 로그인» 단추를 누릅니다. */
export async function tryBrityGovCertLoginButtonViaUia(): Promise<GovCertLoginUiaResult> {
  const scriptPath = resolveScriptPath();
  if (!fs.existsSync(scriptPath)) {
    return { ok: false, reason: "brity-gov-cert-login-uia.ps1 없음" };
  }

  return new Promise((resolve) => {
    let ps: ChildProcess | null = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Sta", "-File", scriptPath],
      { windowsHide: true },
    );

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (result: GovCertLoginUiaResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      try {
        ps?.kill();
      } catch {
        /* ignore */
      }
      finish({ ok: false, reason: "교육행정 인증서 로그인 UIA 시간 초과" });
    }, GOV_CERT_LOGIN_UIA_TIMEOUT_MS);

    ps.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    ps.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    ps.on("error", (e) => {
      finish({
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
            clicked?: boolean;
            button?: string;
            title?: string;
          };
          if (data.clicked) {
            finish({
              ok: true,
              buttonName: String(data.button ?? ""),
              windowTitle: String(data.title ?? ""),
            });
            return;
          }
        } catch {
          /* fall through */
        }
      }
      const detail = stderr.trim() || stdout.trim() || `exit ${code ?? "?"}`;
      finish({
        ok: false,
        reason: detail.slice(0, 240) || "교육행정 인증서 로그인 단추 없음",
      });
    });
  });
}
