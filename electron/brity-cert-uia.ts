import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import { resolveUiaScriptPath } from "./uia-script-path";

const ROUND_WAIT_SEC = 7;
const ROUND_COUNT = 8;
const ROUND_TIMEOUT_MS = ROUND_WAIT_SEC * 1000 + 10_000;

export type BrityCertUiaResult =
  | { ok: true; windowTitle?: string }
  | { ok: false; reason: string; skipped?: boolean };

type RoundJson = {
  filled?: boolean;
  title?: string;
  error?: string;
  dialogCount?: number;
  rowActivated?: boolean;
};

function resolveScriptPath(): string {
  return resolveUiaScriptPath("brity-cert-uia.ps1");
}

function killPowerShellTree(child: ChildProcess | null): void {
  const pid = child?.pid;
  if (!pid) return;
  try {
    spawn("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
  } catch {
    try {
      child?.kill();
    } catch {
      /* ignore */
    }
  }
}

function parseRoundJson(stdout: string): RoundJson | null {
  const line = stdout
    .split(/\r?\n/)
    .map((s) => s.trim())
    .find((s) => s.startsWith("{"));
  if (!line) return null;
  try {
    return JSON.parse(line) as RoundJson;
  } catch {
    return null;
  }
}

function formatRoundFailure(data: RoundJson, code: number | null, detail: string): string {
  if (data.error) {
    const parts = [String(data.error)];
    if (typeof data.dialogCount === "number") {
      parts.push(`dialogCount=${data.dialogCount}`);
    }
    if (data.rowActivated) {
      parts.push("rowActivated=true");
    }
    return parts.join(", ");
  }
  return detail.slice(0, 240) || `exit ${code ?? "?"}`;
}

async function runBrityCertUiaRound(
  scriptPath: string,
  password: string,
  certLabel: string,
): Promise<
  | { kind: "filled"; windowTitle?: string }
  | { kind: "retry"; dialogCount?: number; rowActivated?: boolean; reason: string }
> {
  return new Promise((resolve) => {
    let ps: ChildProcess | null = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Sta", "-File", scriptPath],
      {
        windowsHide: true,
        env: {
          ...process.env,
          SCHOOLUTIL_CERT_PASSWORD: password,
          SCHOOLUTIL_CERT_LABEL: certLabel,
          SCHOOLUTIL_CERT_WAIT_SEC: String(ROUND_WAIT_SEC),
        },
      },
    );

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (
      result:
        | { kind: "filled"; windowTitle?: string }
        | { kind: "retry"; dialogCount?: number; rowActivated?: boolean; reason: string },
    ) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      killPowerShellTree(ps);
      finish({
        kind: "retry",
        reason: "UIA 라운드 시간 초과",
      });
    }, ROUND_TIMEOUT_MS);

    ps.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    ps.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    ps.on("error", (e) => {
      finish({
        kind: "retry",
        reason: e instanceof Error ? e.message : "PowerShell 실행 실패",
      });
    });
    ps.on("exit", (code) => {
      const data = parseRoundJson(stdout);
      if (data?.filled) {
        const title = String(data.title ?? "");
        finish({
          kind: "filled",
          ...(title ? { windowTitle: title } : {}),
        });
        return;
      }
      const detail = stderr.trim() || stdout.trim();
      if (data) {
        finish({
          kind: "retry",
          dialogCount: data.dialogCount,
          rowActivated: data.rowActivated,
          reason: formatRoundFailure(data, code, detail),
        });
        return;
      }
      finish({
        kind: "retry",
        reason: detail.slice(0, 240) || `exit ${code ?? "?"}`,
      });
    });
  });
}

/** Brity·K-SIGN 인증서 창에서 행 선택 후 암호 입력을 여러 번 시도합니다. */
/** true를 반환하면 암호 입력 성공으로 간주하고 나머지 회차를 건너뜁니다. */
export type BrityCertRoundHook = (info: {
  round: number;
  dialogCount?: number;
}) => boolean | void | Promise<boolean | void>;

export async function tryBrityCertPasswordViaUia(
  password: string,
  enabled: boolean,
  certLabel = "",
  onProgress?: (message: string) => void,
  onAfterRound?: BrityCertRoundHook,
): Promise<BrityCertUiaResult> {
  if (!enabled) {
    return { ok: false, skipped: true, reason: "비활성" };
  }
  const pass = password.trim();
  if (!pass) {
    return { ok: false, reason: "비밀번호 없음" };
  }

  const scriptPath = resolveScriptPath();
  if (!fs.existsSync(scriptPath)) {
    return { ok: false, reason: "brity-cert-uia.ps1 없음" };
  }

  const label = certLabel.trim();
  let lastReason = "K-SIGN 창을 찾지 못했습니다";

  for (let round = 1; round <= ROUND_COUNT; round += 1) {
    onProgress?.(
      `K-SIGN 시도 ${round}/${ROUND_COUNT} (${ROUND_WAIT_SEC}초)…`,
    );
    const result = await runBrityCertUiaRound(scriptPath, pass, label);
    if (result.kind === "filled") {
      return {
        ok: true,
        ...(result.windowTitle ? { windowTitle: result.windowTitle } : {}),
      };
    }
    lastReason = result.reason;
    const count =
      typeof result.dialogCount === "number"
        ? `, 창 ${result.dialogCount}개`
        : "";
    const row = result.rowActivated ? ", 인증서 행 클릭됨" : "";
    onProgress?.(`K-SIGN ${round}회차: ${result.reason}${count}${row}`);
    if (onAfterRound) {
      const stop = await onAfterRound({
        round,
        dialogCount: result.dialogCount,
      });
      if (stop) {
        return { ok: true, windowTitle: "K-SIGN" };
      }
    }
  }

  return { ok: false, reason: lastReason };
}
