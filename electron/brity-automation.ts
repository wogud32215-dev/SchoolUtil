import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AppSettings } from "./store";
import { tryBrityCertPasswordViaUia } from "./brity-cert-uia";
import { tryCertPasswordViaUia } from "./portal-cert-uia";
import { tryBrityLoginViaUia } from "./brity-messenger-uia";
import { tryGovCertLoginViaUiaForAnyWindow } from "./portal-edufine-uia";
import { tryOsCertPasswordInput } from "./portal-cert-ui";
import { appendPortalLog } from "./portal-log";
import { minimizeAppWindowsForPortal } from "./portal-window-focus";
import { resolveBrityCertCredentials } from "./secrets";

const LAUNCH_WAIT_MS = 60_000;
const UIA_POLL_MS = 500;
const BRITY_STARTUP_WAIT_MS = 2_500;
const GOV_CERT_LOGIN_WAIT_MS = 35_000;

let brityAutomationBusy = false;

export function isBrityMessengerAutomationBusy(): boolean {
  return brityAutomationBusy;
}

const BRITY_EXE_NAMES = [
  "BrityMessenger.exe",
  "Brity Messenger.exe",
  "Launcher\\Brity.Launcher.exe",
] as const;

const DEFAULT_EXE_CANDIDATES = [
  "C:\\BrityWorks\\BrityMessenger",
  path.join(
    process.env.ProgramFiles ?? "C:\\Program Files",
    "Brity Messenger",
  ),
  path.join(
    process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)",
    "Brity Messenger",
  ),
  path.join(
    os.homedir(),
    "AppData",
    "Local",
    "Programs",
    "Brity Messenger",
  ),
];

export type BrityAutomationResult =
  | { ok: true; summary: string; mode: "launch_only" | "automation" }
  | { ok: false; error: string };

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isExeFile(filePath: string): boolean {
  return filePath.toLowerCase().endsWith(".exe") && fs.existsSync(filePath);
}

function normalizeUserPath(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, "");
}

/** 설치 폴더 또는 exe 경로를 BrityMessenger.exe 등으로 해석합니다. */
function resolveBrityExeFromPath(input: string): string | null {
  const base = normalizeUserPath(input);
  if (!base) return null;

  if (isExeFile(base)) return base;

  const tryNames = (dir: string): string | null => {
    for (const rel of BRITY_EXE_NAMES) {
      const full = path.join(dir, rel);
      if (isExeFile(full)) return full;
    }
    return null;
  };

  if (fs.existsSync(base)) {
    try {
      if (fs.statSync(base).isDirectory()) {
        const found = tryNames(base);
        if (found) return found;
      }
    } catch {
      /* ignore */
    }
  }

  const withExe = tryNames(base);
  if (withExe) return withExe;

  return null;
}

export function resolveBrityExecutablePath(settings: AppSettings): string | null {
  const custom = settings.brityMessengerExePath.trim();
  if (custom) {
    const resolved = resolveBrityExeFromPath(custom);
    if (resolved) return resolved;
    return null;
  }
  for (const candidate of DEFAULT_EXE_CANDIDATES) {
    const resolved = resolveBrityExeFromPath(candidate);
    if (resolved) return resolved;
  }
  return null;
}

function spawnBrity(exePath: string): void {
  const child = spawn(exePath, [], {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
    cwd: path.dirname(exePath),
  });
  child.unref();
}

function isBrityProcessRunning(): Promise<boolean> {
  if (process.platform !== "win32") return Promise.resolve(false);
  return new Promise((resolve) => {
    const child = spawn(
      "tasklist.exe",
      ["/FI", "IMAGENAME eq BrityMessenger.exe", "/NH"],
      { windowsHide: true },
    );
    let out = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      out += chunk.toString("utf8");
    });
    child.on("error", () => resolve(false));
    child.on("exit", () => {
      resolve(/BrityMessenger\.exe/i.test(out));
    });
  });
}

export async function runBrityMessengerAutomation(
  settings: AppSettings,
): Promise<BrityAutomationResult> {
  if (brityAutomationBusy) {
    appendPortalLog("[brity] 이전 실행이 끝나지 않았습니다.");
    return { ok: false, error: "이전 Brity 실행이 끝나지 않았습니다." };
  }
  brityAutomationBusy = true;

  if (!settings.brityMessengerEnabled) {
    brityAutomationBusy = false;
    return { ok: false, error: "Brity 메신저가 설정에서 꺼져 있습니다." };
  }

  const exePath = resolveBrityExecutablePath(settings);
  if (!exePath) {
    const hint = settings.brityMessengerExePath.trim();
    if (hint) {
      appendPortalLog(`[brity] 경로 해석 실패: ${normalizeUserPath(hint)}`);
    }
    brityAutomationBusy = false;
    return {
      ok: false,
      error: hint
        ? `Brity 실행 파일을 찾지 못했습니다. 폴더(예: C:\\BrityWorks\\BrityMessenger) 또는 BrityMessenger.exe 전체 경로를 확인하세요.`
        : "Brity Messenger 실행 파일을 찾지 못했습니다. 설정에서 설치 폴더 또는 .exe 경로를 지정하세요.",
    };
  }

  const mode = settings.portalLoginMode ?? "url_only";
  const automation = mode === "automation";
  const cred = resolveBrityCertCredentials(settings);

  appendPortalLog(`[brity] 실행: ${exePath}`);
  const restoreAppWindows = automation ? minimizeAppWindowsForPortal() : () => {};

  try {
    const running = await isBrityProcessRunning();
    if (running) {
      appendPortalLog("[brity] BrityMessenger.exe가 이미 실행 중입니다.");
    } else {
      spawnBrity(exePath);
      appendPortalLog("[brity] 앱을 실행했습니다.");
      await sleep(BRITY_STARTUP_WAIT_MS);
    }

    if (!automation) {
      return {
        ok: true,
        summary: "Brity Messenger를 실행했습니다. 로그인은 직접 진행하세요.",
        mode: "launch_only",
      };
    }

    appendPortalLog("[brity] 로그인 화면 대기 중…");
    const started = Date.now();
    let uiaOk = false;
    while (Date.now() - started < LAUNCH_WAIT_MS) {
      const click = await tryBrityLoginViaUia();
      if (click.ok) {
        appendPortalLog(
          `[brity] «로그인» 클릭 (${click.windowTitle || "Brity"})${
            click.certRadio ? ", 인증서 로그인 선택됨" : ""
          }`,
        );
        if (!click.certRadio) {
          appendPortalLog(
            "[brity] «인증서 로그인» 라디오를 찾지 못했습니다. 화면에서 직접 선택해 주세요.",
          );
        }
        uiaOk = true;
        break;
      }
      await sleep(UIA_POLL_MS);
    }

    if (!uiaOk) {
      return {
        ok: false,
        error:
          "Brity Messenger 창에서 «로그인» 단추를 찾지 못했습니다. 앱이 떴는지 확인하세요.",
      };
    }

    await sleep(1200);
    appendPortalLog(
      "[brity] «교육행정 전자서명 인증서 로그인» 단추 대기 중…",
    );
    const govStarted = Date.now();
    let govCertClicked = false;
    while (Date.now() - govStarted < GOV_CERT_LOGIN_WAIT_MS) {
      const gov = await tryGovCertLoginViaUiaForAnyWindow();
      if (gov.ok) {
        const btnHint = gov.buttonName
          ? ` — «${gov.buttonName.length > 36 ? `${gov.buttonName.slice(0, 36)}…` : gov.buttonName}»`
          : "";
        appendPortalLog(
          `[brity] 파란 «교육행정 전자서명 인증서 로그인» 단추 클릭 (${gov.windowTitle || "새 창"})${btnHint}`,
        );
        govCertClicked = true;
        break;
      }
      await sleep(UIA_POLL_MS);
    }
    if (!govCertClicked) {
      appendPortalLog(
        "[brity] 교육행정 인증서 로그인 단추를 찾지 못했습니다. 새 창에서 직접 눌러 주세요.",
      );
    }

    if (cred.certLabel.trim()) {
      const label =
        cred.certLabel.length > 20
          ? `${cred.certLabel.slice(0, 20)}…`
          : cred.certLabel;
      appendPortalLog(
        `[brity] K-SIGN에서 인증서 «${label}» 행 선택을 시도합니다.`,
      );
    } else {
      appendPortalLog(
        "[brity] 인증서 아이디가 없어 목록 첫 항목을 시도합니다. 업무포털 «경기 업무포털» 인증서 아이디(예: 858…)를 저장하면 자동 선택됩니다.",
      );
    }

    const hasPassword = Boolean(cred.password.trim());
    const osCertEnabled = Boolean(settings.portalOsCertInput);
    const tryCertPassword = osCertEnabled && hasPassword;

    if (!osCertEnabled) {
      appendPortalLog(
        "[brity] 인증서 자동 입력 건너뜀 — 업무포털 «고급» 또는 아래 «인증서 OS 자동 입력»을 켜 주세요.",
      );
    } else if (!hasPassword) {
      appendPortalLog(
        "[brity] 인증서 비밀번호가 없습니다. 업무포털·Brity 설정에서 저장하거나 직접 입력하세요.",
      );
    } else {
      appendPortalLog(
        "[brity] 인증서 목록이 보이면 직접 고르세요. 암호 칸이 뜨면 최대 40초 안에 자동 입력합니다.",
      );
    }

    await sleep(govCertClicked ? 6000 : 500);

    let certOk = false;
    if (tryCertPassword) {
      appendPortalLog(
        "[brity] K-SIGN 창 — 인증서 선택·암호 입력 (8회 × 7초, 회차마다 로그)",
      );
      const brityCert = await tryBrityCertPasswordViaUia(
        cred.password,
        true,
        cred.certLabel,
        (line) => appendPortalLog(`[brity] ${line}`),
        async ({ round, dialogCount }) => {
          if (dialogCount !== 0) return;
          if (round === 2 || round === 4) {
            appendPortalLog(
              "[brity] K-SIGN 창이 보이지 않아 «교육행정 전자서명 인증서 로그인»을 다시 누릅니다.",
            );
            const gov = await tryGovCertLoginViaUiaForAnyWindow();
            if (gov.ok) {
              appendPortalLog(
                `[brity] 교육행정 인증서 로그인 재클릭 (${gov.windowTitle || "창"})`,
              );
            }
            await sleep(2500);
          }
          if (round === 3 || round === 5) {
            appendPortalLog(
              "[brity] 공용 인증서 UIA로 암호 입력을 시도합니다…",
            );
            const shared = await tryCertPasswordViaUia(cred.password);
            if (shared.ok && shared.filled) {
              appendPortalLog("[brity] 공용 UIA로 인증서 암호를 넣었습니다.");
              return true;
            }
          }
          return false;
        },
      );
      if (brityCert.ok) {
        appendPortalLog(
          `[brity] 인증서 비밀번호 입력 (${brityCert.windowTitle || "인증서 창"}).`,
        );
        certOk = true;
      } else if (!brityCert.skipped) {
        appendPortalLog(
          `[brity] K-SIGN 암호 입력 실패 — ${brityCert.reason}. OS 인증서 창을 찾습니다.`,
        );
      }
    }

    if (!certOk) {
      const certInput = await tryOsCertPasswordInput(
        cred.password,
        tryCertPassword,
      );
      if (certInput.skipped) {
        /* 로그는 위에서 안내 */
      } else if (certInput.ok) {
        appendPortalLog("[brity] OS 인증서 창에 비밀번호를 넣었습니다.");
      } else if (certInput.error) {
        appendPortalLog(`[brity] ${certInput.error}`);
      }
    }

    appendPortalLog(
      certOk
        ? "[brity] 자동 로그인 시도 완료 (인증서 암호 입력됨)."
        : "[brity] 자동 로그인 시도 완료. 인증서·메신저 창을 확인하세요.",
    );
    return {
      ok: true,
      summary:
        "Brity 자동 로그인 시도를 마쳤습니다. 메신저 창과 인증서 창을 확인하세요.",
      mode: "automation",
    };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Brity 실행 중 오류가 발생했습니다.";
    appendPortalLog(`[brity] 실패: ${msg}`);
    return { ok: false, error: msg };
  } finally {
    restoreAppWindows();
    brityAutomationBusy = false;
  }
}
