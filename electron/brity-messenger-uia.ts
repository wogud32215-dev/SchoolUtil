import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const UIA_SCRIPT_TIMEOUT_MS = 12_000;

export type BrityUiaClickResult =
  | { ok: true; windowTitle: string; certRadio?: boolean }
  | { ok: false; reason: string };

export type BrityUiaProbeResult =
  | { ok: true; windowTitle: string }
  | { ok: false; reason: string };

function resolveScriptPath(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const full = path.join(dir, "brity-messenger-uia.ps1");
  if (fs.existsSync(full)) return full;
  return path.join(dir, "..", "electron", "brity-messenger-uia.ps1");
}

function runBrityUiaScript(
  action: "probe" | "login",
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const scriptPath = resolveScriptPath();
  if (!fs.existsSync(scriptPath)) {
    return Promise.resolve({
      code: -1,
      stdout: "",
      stderr: "brity-messenger-uia.ps1 없음",
    });
  }

  return new Promise((resolve) => {
    let ps: ChildProcess | null = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Sta",
        "-File",
        scriptPath,
        "-Action",
        action,
      ],
      { windowsHide: true },
    );

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (result: {
      code: number | null;
      stdout: string;
      stderr: string;
    }) => {
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
      finish({
        code: null,
        stdout,
        stderr: stderr || "UIA 스크립트 시간 초과",
      });
    }, UIA_SCRIPT_TIMEOUT_MS);

    ps.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    ps.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    ps.on("error", (e) => {
      finish({
        code: -1,
        stdout,
        stderr: e instanceof Error ? e.message : "PowerShell 실행 실패",
      });
    });
    ps.on("exit", (code) => {
      finish({ code, stdout, stderr });
    });
  });
}

function parseJsonLine(stdout: string): Record<string, unknown> | null {
  const line = stdout
    .split(/\r?\n/)
    .map((s) => s.trim())
    .find((s) => s.startsWith("{"));
  if (!line) return null;
  try {
    return JSON.parse(line) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Brity Messenger 창이 보이는지 확인합니다 (UIA, 최대 12초). */
export async function probeBrityWindowViaUia(): Promise<BrityUiaProbeResult> {
  const { code, stdout, stderr } = await runBrityUiaScript("probe");
  const data = parseJsonLine(stdout);
  if (code === 0 && data?.found) {
    return {
      ok: true,
      windowTitle: String(data.title ?? ""),
    };
  }
  const detail = stderr.trim() || stdout.trim() || `exit ${code ?? "?"}`;
  return {
    ok: false,
    reason: detail.slice(0, 240) || "Brity 창 없음",
  };
}

/** Brity Messenger 로그인 화면에서 인증서 로그인 선택 후 «로그인»을 누릅니다. */
export async function tryBrityLoginViaUia(): Promise<BrityUiaClickResult> {
  const { code, stdout, stderr } = await runBrityUiaScript("login");
  const data = parseJsonLine(stdout);
  if (code === 0 && data?.clicked) {
    return {
      ok: true,
      windowTitle: String(data.title ?? ""),
      certRadio: Boolean(data.certRadio),
    };
  }
  const detail = stderr.trim() || stdout.trim() || `exit ${code ?? "?"}`;
  return {
    ok: false,
    reason: detail.slice(0, 240) || "UIA Brity 로그인 단추 없음",
  };
}
