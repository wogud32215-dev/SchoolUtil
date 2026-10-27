/**
 * Windows: Node spawn은 한글·특수문자 경로에서 UNKNOWN(동기 throw)이 날 수 있어
 * cmd 배치로 electron.exe를 실행합니다. ASCII 단축(8.3) 경로만 직접 spawn을 시도합니다.
 */
import {
  type ChildProcess,
  execFileSync,
  spawn,
  spawnSync,
} from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);

const argv = [".", "--no-sandbox"];
const cwd = process.cwd();

type ProcessWithElectron = NodeJS.Process & { electronApp?: ChildProcess };

function proc(): ProcessWithElectron {
  return process as ProcessWithElectron;
}

function electronPath(): string {
  return require("electron") as string;
}

function stopPrevious(): void {
  const prev = proc().electronApp;
  if (!prev?.pid) return;
  try {
    prev.removeAllListeners();
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(prev.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    } else {
      process.kill(prev.pid);
    }
  } catch {
    /* already exited */
  }
  proc().electronApp = undefined;
}

function isAsciiPath(p: string): boolean {
  for (let i = 0; i < p.length; i++) {
    if (p.charCodeAt(i) > 127) return false;
  }
  return true;
}

function printWin32PolicyHelp(): void {
  console.error(
    [
      "[SchoolUtil] electron.exe 실행이 Windows 보안 정책에 막혔습니다.",
      "",
      "  메시지에 «Device Guard»·«organization»이 있으면",
      "  학교/기관 PC의 **애플리케이션 제어(WDAC)** 입니다.",
      "  Unblock-File·경로 변경으로는 풀리지 않습니다.",
      "  → 담당자에게 개발용 예외 또는 개인 PC 사용을 요청하세요.",
      "",
      "  개인 PC에서만 해당될 수 있는 경우:",
      "    npm run electron:unblock",
      "  Windows 설정 → 개인 정보 및 보안 → Windows 보안 →",
      "  앱 및 브라우저 제어 → Smart App Control 끄기(가능할 때만).",
      "",
      "  UI만 보려면 브라우저에서 http://localhost:5173 을 열 수 있으나",
      "  저장·NEIS·날씨 등은 Electron 창에서만 동작합니다.",
    ].join("\n"),
  );
}

function win32ShortPath(longPath: string): string | null {
  try {
    const comspec = process.env.ComSpec ?? "cmd.exe";
    const quoted = `"${longPath.replace(/"/g, '""')}"`;
    const out = execFileSync(
      comspec,
      ["/d", "/s", "/c", `for %I in (${quoted}) do @echo %~sI`],
      { encoding: "utf8", windowsHide: true },
    );
    const line = out
      .trim()
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .pop();
    return line && line.length > 0 ? line : null;
  } catch {
    return null;
  }
}

function spawnViaCmdBatch(exe: string): ChildProcess {
  const bat = join(tmpdir(), `schoolutil-electron-${process.pid}.cmd`);
  const q = (s: string) => s.replace(/"/g, '""');
  const content = `@echo off\r\nchcp 65001 >nul\r\ncd /d "${q(cwd)}"\r\n"${q(exe)}" . --no-sandbox\r\n`;
  writeFileSync(bat, content, "utf8");
  let child: ChildProcess;
  try {
    child = spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/c", bat], {
      stdio: "inherit",
      cwd,
      env: process.env,
      windowsHide: false,
    });
  } catch (err) {
    try {
      unlinkSync(bat);
    } catch {
      /* ignore */
    }
    throw err;
  }
  child.once("exit", () => {
    try {
      unlinkSync(bat);
    } catch {
      /* ignore */
    }
  });
  return child;
}

function spawnDirectSafe(exe: string): ChildProcess | null {
  try {
    return spawn(exe, argv, {
      stdio: "inherit",
      cwd,
      env: process.env,
      windowsHide: false,
    });
  } catch {
    return null;
  }
}

function wireExit(child: ChildProcess, onFail?: () => ChildProcess): ChildProcess {
  let failed = false;

  child.once("error", () => {
    if (failed) return;
    if (!onFail) {
      console.error("[SchoolUtil] Electron 실행 실패");
      printWin32PolicyHelp();
      process.exit(1);
      return;
    }
    failed = true;
    child.removeAllListeners("exit");
    const next = onFail();
    proc().electronApp = next;
  });

  child.once("exit", (code) => {
    if (failed) return;
    if (code && code !== 0) {
      printWin32PolicyHelp();
    }
    process.exit(code ?? 0);
  });

  return child;
}

function launchViaCmd(exe: string): ChildProcess {
  console.warn("[SchoolUtil] cmd 배치로 Electron을 실행합니다.");
  return wireExit(spawnViaCmdBatch(exe));
}

function launchWindows(exe: string): ChildProcess {
  const runCmd = (): ChildProcess => launchViaCmd(exe);

  const short = win32ShortPath(exe);
  const directExe =
    short && isAsciiPath(short) ? short : isAsciiPath(exe) ? exe : null;

  if (!directExe) {
    console.warn(
      "[SchoolUtil] 한글·특수문자 경로 — Node spawn 대신 cmd 배치를 사용합니다.",
    );
    return runCmd();
  }

  const label = directExe === short ? "단축 경로" : "직접";
  console.warn(`[SchoolUtil] Electron ${label} 실행 시도…`);
  const child = spawnDirectSafe(directExe);
  if (!child) {
    console.warn("[SchoolUtil] spawn 실패 — cmd 배치로 재시도합니다.");
    return runCmd();
  }

  return wireExit(child, runCmd);
}

export function launchElectronDev(): ChildProcess {
  stopPrevious();
  const exe = electronPath();

  let child: ChildProcess;
  if (process.platform === "win32") {
    child = launchWindows(exe);
  } else {
    const direct = spawnDirectSafe(exe);
    if (!direct) {
      console.error("[SchoolUtil] Electron 실행 실패");
      process.exit(1);
    }
    child = wireExit(direct);
  }

  proc().electronApp = child;
  return child;
}
