import koffi from "koffi";
import { tryCertPasswordViaUia } from "./portal-cert-uia";
import { appendPortalLog } from "./portal-log";

const POLL_MS = 250;
const MAX_WAIT_MS = 45_000;
const WM_SETTEXT = 0x000c;

const CERT_DIALOG_TITLE_HINTS = [
  "전자서명",
  "K-SIGN",
  "K-Sign",
  "교육기관",
  "SignKorea",
  "인증서 선택",
  "공동인증",
  "NPKI",
  "CrossEX",
  "TouchEn",
];

const IGNORE_TITLE_HINTS = [
  "SchoolUtil",
  "Cursor",
  "Chrome",
  "Edge",
  "Whale",
  "Visual Studio",
  "카카오톡",
  "KakaoTalk",
  "Kakao",
  "Discord",
  "Telegram",
  "LINE",
  "Slack",
  "Microsoft Teams",
  "WhatsApp",
];

type CertKoffiProtos = {
  EnumWindowsProcType: ReturnType<typeof koffi.proto>;
  EnumChildProcType: ReturnType<typeof koffi.proto>;
};

const CERT_KOFFI_KEY = "__schoolUtilCertKoffi";

function certKoffiProtos(): CertKoffiProtos {
  const g = globalThis as unknown as Record<string, CertKoffiProtos | undefined>;
  if (g[CERT_KOFFI_KEY]) return g[CERT_KOFFI_KEY];
  g[CERT_KOFFI_KEY] = {
    EnumWindowsProcType: koffi.proto(
      "bool __stdcall SchoolUtilEnumWindowsProc(uintptr hwnd, intptr lParam)",
    ),
    EnumChildProcType: koffi.proto(
      "bool __stdcall SchoolUtilEnumChildProc(uintptr hwnd, intptr lParam)",
    ),
  };
  return g[CERT_KOFFI_KEY];
}

type User32Api = {
  GetForegroundWindow: () => bigint;
  IsWindowVisible: (hwnd: bigint) => boolean;
  GetWindowTextW: (hwnd: bigint, buf: Buffer, max: number) => number;
  GetClassNameW: (hwnd: bigint, buf: Buffer, max: number) => number;
  EnumWindows: (cb: unknown, lParam: bigint) => boolean;
  EnumChildWindows: (parent: bigint, cb: unknown, lParam: bigint) => boolean;
  SetForegroundWindow: (hwnd: bigint) => boolean;
  SetFocus: (hwnd: bigint) => bigint;
  SendMessageW: (
    hwnd: bigint,
    msg: number,
    wParam: bigint,
    lParam: string,
  ) => bigint;
  GetWindowThreadProcessId: (hwnd: bigint, pidOut: Buffer) => number;
  AttachThreadInput?: (attach: number, from: number, to: number) => boolean;
  GetCurrentThreadId?: () => number;
  AllowSetForegroundWindow?: (pid: number) => boolean;
};

const USER32_CACHE_KEY = "__schoolUtilCertUser32";

function getUser32(): User32Api | null {
  const g = globalThis as unknown as Record<string, User32Api | undefined>;
  if (g[USER32_CACHE_KEY]) {
    return g[USER32_CACHE_KEY];
  }
  if (process.platform !== "win32") {
    return null;
  }
  try {
    const { EnumWindowsProcType, EnumChildProcType } = certKoffiProtos();
    const user32 = koffi.load("user32.dll");
    const api: User32Api = {
      GetForegroundWindow: user32.func("GetForegroundWindow", "uintptr", []) as User32Api["GetForegroundWindow"],
      IsWindowVisible: user32.func("IsWindowVisible", "bool", [
        "uintptr",
      ]) as User32Api["IsWindowVisible"],
      GetWindowTextW: user32.func("GetWindowTextW", "int", [
        "uintptr",
        "void *",
        "int",
      ]) as User32Api["GetWindowTextW"],
      GetClassNameW: user32.func("GetClassNameW", "int", [
        "uintptr",
        "void *",
        "int",
      ]) as User32Api["GetClassNameW"],
      EnumWindows: user32.func("EnumWindows", "bool", [
        koffi.pointer(EnumWindowsProcType),
        "intptr",
      ]) as User32Api["EnumWindows"],
      EnumChildWindows: user32.func("EnumChildWindows", "bool", [
        "uintptr",
        koffi.pointer(EnumChildProcType),
        "intptr",
      ]) as User32Api["EnumChildWindows"],
      SetForegroundWindow: user32.func("SetForegroundWindow", "bool", [
        "uintptr",
      ]) as User32Api["SetForegroundWindow"],
      SetFocus: user32.func("SetFocus", "uintptr", [
        "uintptr",
      ]) as User32Api["SetFocus"],
      SendMessageW: user32.func("SendMessageW", "intptr", [
        "uintptr",
        "uint32",
        "uintptr",
        "str16",
      ]) as User32Api["SendMessageW"],
      GetWindowThreadProcessId: user32.func(
        "GetWindowThreadProcessId",
        "uint32",
        ["uintptr", "void *"],
      ) as User32Api["GetWindowThreadProcessId"],
    };
    try {
      const kernel32 = koffi.load("kernel32.dll");
      api.GetCurrentThreadId = kernel32.func(
        "GetCurrentThreadId",
        "uint32",
        [],
      ) as User32Api["GetCurrentThreadId"];
    } catch {
      /* optional */
    }
    try {
      api.AttachThreadInput = user32.func("AttachThreadInput", "bool", [
        "int",
        "uint32",
        "uint32",
      ]) as User32Api["AttachThreadInput"];
    } catch {
      /* optional */
    }
    try {
      api.AllowSetForegroundWindow = user32.func(
        "AllowSetForegroundWindow",
        "bool",
        ["uint32"],
      ) as User32Api["AllowSetForegroundWindow"];
    } catch {
      /* optional */
    }
    g[USER32_CACHE_KEY] = api;
    return api;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    appendPortalLog(`user32 초기화 실패: ${msg}`);
    return null;
  }
}

/**
 * Windows 인증서 비밀번호 창 자동 입력 (실험).
 * 보안 키보드·TouchEn 등에서 실패할 수 있음.
 */
export async function tryOsCertPasswordInput(
  password: string,
  enabled: boolean,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!enabled) {
    return { ok: false, skipped: true };
  }
  if (process.platform !== "win32") {
    return { ok: false, error: "Windows에서만 지원합니다." };
  }
  const pass = password.trim();
  if (!pass) {
    return { ok: false, error: "인증서 비밀번호가 저장되어 있지 않습니다." };
  }

  appendPortalLog("인증서 보안 창 대기 중…");

  const api = getUser32();
  if (!api) {
    return { ok: false, error: "user32를 불러오지 못했습니다." };
  }

  const started = Date.now();
  let dialogHwnd = 0n;
  let dialogTitle = "";
  let lastHeartbeat = started;
  let bestScoreSeen = 0;

  let lastUiaAttempt = 0;
  let certDialogTrustedViaUia = false;

  while (Date.now() - started < MAX_WAIT_MS) {
    const elapsed = Date.now() - started;
    const nowMs = Date.now();
    if (elapsed >= 800 && nowMs - lastUiaAttempt >= 3500) {
      lastUiaAttempt = nowMs;
      appendPortalLog("UI Automation으로 인증서 창을 찾는 중…");
      const uia = await tryCertPasswordViaUia(pass);
      if (uia.ok) {
        if (uia.filled) {
          appendPortalLog("UI Automation으로 인증서 암호 입력을 시도했습니다.");
          return { ok: true };
        }
        dialogHwnd = uia.windowHwnd;
        dialogTitle = readWindowText(uia.windowHwnd, api.GetWindowTextW);
        certDialogTrustedViaUia = Boolean(uia.trusted);
        appendPortalLog(
          `UI Automation으로 인증서 창을 찾았습니다 (${dialogTitle || "제목 없음"}).`,
        );
        break;
      }
      appendPortalLog(`UIA: ${uia.reason}`);
    }

    const hit = findCertDialogWindow(api);
    if (hit) {
      dialogHwnd = hit.hwnd;
      dialogTitle = hit.title;
      break;
    }

    const now = Date.now();
    if (now - lastHeartbeat >= 10_000) {
      bestScoreSeen = Math.max(bestScoreSeen, peekBestCertDialogScore(api));
      appendPortalLog(
        `인증서 창 대기 중… (${Math.round((now - started) / 1000)}초, Win32후보점수=${bestScoreSeen})`,
      );
      lastHeartbeat = now;
    }
    await sleep(POLL_MS);
  }

  if (!dialogHwnd) {
    appendPortalLog(
      `인증서 창을 찾지 못했습니다 (Win32후보점수=${bestScoreSeen}) — 직접 입력해 주세요.`,
    );
    return { ok: false, error: "인증서 창을 찾지 못했습니다." };
  }

  if (
    !certDialogTrustedViaUia &&
    !isCertDialogWindow(api, dialogHwnd, dialogTitle)
  ) {
    appendPortalLog(
      `잘못된 창(${dialogTitle || "?"}) — 인증서 UI가 확인되지 않아 비밀번호를 넣지 않습니다.`,
    );
    return { ok: false, error: "인증서 창을 확인하지 못했습니다." };
  }

  appendPortalLog(`인증서 창 발견: ${dialogTitle || "(제목 없음)"}`);

  const editHwnd = findPasswordEditControl(api, dialogHwnd);

  focusWindowAndControl(api, dialogHwnd, editHwnd ?? dialogHwnd);
  await sleep(500);

  appendPortalLog("비밀번호 입력 시도 중…");

  let typed = false;
  if (editHwnd) {
    typed = trySetEditText(api, editHwnd, pass);
  }
  if (!typed) {
    appendPortalLog(
      "암호 칸(Edit) 미확인 — Tab으로 암호 칸 이동 후 SendKeys를 시도합니다.",
    );
    await sendKeysPass("{TAB}{TAB}{TAB}{TAB}");
    await sleep(200);
    const keysOk = await sendKeysPass(pass);
    if (!keysOk) {
      appendPortalLog("비밀번호 자동 입력 실패: SendKeys 실패");
      return {
        ok: false,
        error:
          "보안 키보드가 막았을 수 있습니다. 열린 창에 직접 넣어 주세요.",
      };
    }
    typed = true;
  }

  await sleep(250);
  await sendKeysPass("", true);
  appendPortalLog("비밀번호 입력 명령을 보냈습니다.");
  return { ok: true };
}

function readWindowText(
  hwnd: bigint,
  read: (hwnd: bigint, buf: Buffer, max: number) => number,
): string {
  const buf = Buffer.alloc(1024);
  const len = read(hwnd, buf, 512);
  if (len <= 0) return "";
  return buf.toString("utf16le", 0, len * 2).replace(/\0+$/, "");
}

function titleLooksLikeCertDialog(title: string): boolean {
  const t = title.trim();
  if (!t) return false;
  if (IGNORE_TITLE_HINTS.some((x) => t.includes(x))) return false;
  return CERT_DIALOG_TITLE_HINTS.some((x) => t.includes(x));
}

function certUiBlobMatches(blob: string): boolean {
  if (/인증서\s*암호/.test(blob)) return true;
  if (/교육기관\s*전자서명/.test(blob)) return true;
  if (
    /K-SIGN|K-Sign/.test(blob) &&
    /인증서\s*위치|하드디스크|인증서\s*보기|인증서\s*검증/.test(blob)
  ) {
    return true;
  }
  if (/일반인증서/.test(blob) && /만료일|발급자|인증서\s*위치/.test(blob)) {
    return true;
  }
  return false;
}

function collectDescendantHwnds(api: User32Api, root: bigint): bigint[] {
  const out: bigint[] = [];
  const stack: bigint[] = [root];
  while (stack.length > 0) {
    const current = stack.pop() as bigint;
    const children: bigint[] = [];
    const cb = koffi.register(
      (hwnd: bigint) => {
        children.push(hwnd);
        return true;
      },
      koffi.pointer(certKoffiProtos().EnumChildProcType),
    );
    try {
      api.EnumChildWindows(current, cb, 0n);
    } finally {
      koffi.unregister(cb);
    }
    for (const child of children) {
      out.push(child);
      stack.push(child);
    }
  }
  return out;
}

function certDialogTextBlob(api: User32Api, hwnd: bigint, title: string): string {
  const parts = [title];
  for (const h of collectDescendantHwnds(api, hwnd)) {
    const t = readWindowText(h, api.GetWindowTextW);
    if (t) parts.push(t);
  }
  return parts.join(" ");
}

function isIgnoredWindowTitle(title: string): boolean {
  const t = title.trim();
  if (!t) return false;
  return IGNORE_TITLE_HINTS.some((x) => t.includes(x));
}

function looksLikeCertUi(api: User32Api, hwnd: bigint, title: string): boolean {
  if (isIgnoredWindowTitle(title)) return false;
  const blob = certDialogTextBlob(api, hwnd, title);
  return certUiBlobMatches(blob);
}

function isCertDialogWindow(
  api: User32Api,
  hwnd: bigint,
  title: string,
): boolean {
  if (isIgnoredWindowTitle(title)) return false;
  return looksLikeCertUi(api, hwnd, title);
}

function scoreCertDialog(api: User32Api, hwnd: bigint, title: string): number {
  let score = 0;
  if (titleLooksLikeCertDialog(title)) score += 100;
  const cls = readWindowText(hwnd, api.GetClassNameW);
  if (cls === "#32770") score += 25;
  const edits = listEditChildren(api, hwnd);
  if (edits.length >= 1) score += 35;
  if (title.includes("전자서명") || title.includes("K-SIGN")) score += 50;
  if (looksLikeCertUi(api, hwnd, title)) score += 95;
  return score;
}

function enumCertDialogCandidates(
  api: User32Api,
): { hwnd: bigint; title: string; score: number }[] {
  const candidates: { hwnd: bigint; title: string; score: number }[] = [];

  const cb = koffi.register(
    (hwnd: bigint) => {
      if (!api.IsWindowVisible(hwnd)) return true;
      const title = readWindowText(hwnd, api.GetWindowTextW);
      if (!isCertDialogWindow(api, hwnd, title)) return true;
      const score = scoreCertDialog(api, hwnd, title);
      candidates.push({ hwnd, title, score });
      return true;
    },
    koffi.pointer(certKoffiProtos().EnumWindowsProcType),
  );

  try {
    api.EnumWindows(cb, 0n);
  } finally {
    koffi.unregister(cb);
  }
  return candidates;
}

function peekBestCertDialogScore(api: User32Api): number {
  let best = 0;
  const cb = koffi.register(
    (hwnd: bigint) => {
      if (!api.IsWindowVisible(hwnd)) return true;
      const title = readWindowText(hwnd, api.GetWindowTextW);
      if (title && IGNORE_TITLE_HINTS.some((x) => title.includes(x))) {
        return true;
      }
      best = Math.max(best, scoreCertDialog(api, hwnd, title));
      return true;
    },
    koffi.pointer(certKoffiProtos().EnumWindowsProcType),
  );
  try {
    api.EnumWindows(cb, 0n);
  } finally {
    koffi.unregister(cb);
  }
  return best;
}

function findForegroundCertDialog(
  api: User32Api,
): { hwnd: bigint; title: string } | null {
  const fg = api.GetForegroundWindow();
  if (!fg) return null;
  const title = readWindowText(fg, api.GetWindowTextW);
  if (!isCertDialogWindow(api, fg, title)) return null;
  return { hwnd: fg, title };
}

function findCertDialogWindow(
  api: User32Api,
): { hwnd: bigint; title: string } | null {
  const fg = findForegroundCertDialog(api);
  if (fg) return fg;

  const candidates = enumCertDialogCandidates(api);
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return { hwnd: best.hwnd, title: best.title };
}

function listEditChildren(api: User32Api, parent: bigint): bigint[] {
  const edits: bigint[] = [];
  for (const hwnd of collectDescendantHwnds(api, parent)) {
    const cls = readWindowText(hwnd, api.GetClassNameW);
    if (
      cls === "Edit" ||
      cls.startsWith("RICHEDIT") ||
      /edit/i.test(cls)
    ) {
      edits.push(hwnd);
    }
  }
  return edits;
}

function findPasswordEditControl(api: User32Api, dialogHwnd: bigint): bigint | null {
  const edits = listEditChildren(api, dialogHwnd);
  if (!edits.length) return null;
  if (edits.length === 1) return edits[0];
  return edits[edits.length - 1];
}

function focusWindowAndControl(
  api: User32Api,
  dialogHwnd: bigint,
  editHwnd: bigint,
): void {
  try {
    api.AllowSetForegroundWindow?.(0xffffffff);
  } catch {
    /* ignore */
  }

  const pidBuf = Buffer.alloc(4);
  const dialogThread = api.GetWindowThreadProcessId(dialogHwnd, pidBuf);
  const ourThread = api.GetCurrentThreadId?.() ?? 0;

  if (
    api.AttachThreadInput &&
    dialogThread &&
    ourThread &&
    dialogThread !== ourThread
  ) {
    api.AttachThreadInput(1, ourThread, dialogThread);
  }

  api.SetForegroundWindow(dialogHwnd);
  if (editHwnd && editHwnd !== dialogHwnd) {
    api.SetFocus(editHwnd);
  }

  if (
    api.AttachThreadInput &&
    dialogThread &&
    ourThread &&
    dialogThread !== ourThread
  ) {
    api.AttachThreadInput(0, ourThread, dialogThread);
  }
}

function trySetEditText(api: User32Api, editHwnd: bigint, pass: string): boolean {
  try {
    const r = api.SendMessageW(editHwnd, WM_SETTEXT, 0n, pass);
    return r !== 0n;
  } catch {
    return false;
  }
}

async function sendKeysPass(
  pass: string,
  enterOnly = false,
): Promise<boolean> {
  try {
    const { spawn } = await import("node:child_process");
    const body = enterOnly ? "{ENTER}" : `${escapeSendKeys(pass)}`;
    await new Promise<void>((resolve, reject) => {
      const ps = spawn(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${body.replace(/'/g, "''")}')`,
        ],
        { windowsHide: true },
      );
      ps.on("error", reject);
      ps.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`SendKeys 종료 코드 ${code}`));
      });
    });
    return true;
  } catch {
    return false;
  }
}

function escapeSendKeys(pass: string): string {
  return pass.replace(/[+^%~(){}[\]]/g, (c) => `{${c}}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
