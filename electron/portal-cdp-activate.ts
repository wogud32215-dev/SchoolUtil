import koffi from "koffi";
import { appendPortalLog } from "./portal-log";

type DebugTarget = { id: string; type: string; url: string };

type ActivateOptions = { force?: boolean };

let lastActivateMs = 0;
let lastActivateLogMs = 0;

const MIN_ACTIVATE_INTERVAL_MS = 2800;

export async function activatePortalBrowserTab(
  debugPort: number,
  pageUrl: string,
  options?: ActivateOptions,
): Promise<void> {
  const now = Date.now();
  if (!options?.force && now - lastActivateMs < MIN_ACTIVATE_INTERVAL_MS) {
    return;
  }
  lastActivateMs = now;

  const activated = await activateCdpTarget(debugPort, pageUrl);
  await focusBrowserWindowForPortal(pageUrl);

  if (
    activated &&
    (options?.force || now - lastActivateLogMs > 8000)
  ) {
    appendPortalLog("업무포털 브라우저 탭을 앞으로 가져옵니다.");
    lastActivateLogMs = now;
  }
}

async function activateCdpTarget(
  debugPort: number,
  pageUrl: string,
): Promise<boolean> {
  let list: DebugTarget[] = [];
  try {
    const res = await fetch(`http://127.0.0.1:${debugPort}/json/list`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    list = (await res.json()) as DebugTarget[];
  } catch {
    return false;
  }

  let host = "";
  try {
    host = new URL(pageUrl).hostname.toLowerCase();
  } catch {
    /* ignore */
  }

  const pages = list.filter((t) => t.type === "page");
  const target =
    pages.find((t) => host && t.url.toLowerCase().includes(host)) ??
    pages.find((t) => t.url.includes("neis.go.kr")) ??
    pages.find((t) => /klef\.|edufine|eduptl\.kr/i.test(t.url)) ??
    pages.find(
      (t) =>
        !t.url.startsWith("chrome://") &&
        !t.url.startsWith("edge://") &&
        !t.url.startsWith("devtools://"),
    );

  if (!target?.id) return false;

  try {
    await fetch(`http://127.0.0.1:${debugPort}/json/activate/${target.id}`, {
      signal: AbortSignal.timeout(3000),
    });
    return true;
  } catch {
    return false;
  }
}

const FOCUS_PROTO_KEY = "__schoolUtilFocusEnumProc";

function focusEnumProto(): ReturnType<typeof koffi.proto> {
  const g = globalThis as unknown as Record<
    string,
    ReturnType<typeof koffi.proto> | undefined
  >;
  if (!g[FOCUS_PROTO_KEY]) {
    g[FOCUS_PROTO_KEY] = koffi.proto(
      "bool __stdcall SchoolUtilFocusEnumProc(uintptr hwnd, intptr lParam)",
    );
  }
  return g[FOCUS_PROTO_KEY];
}

async function focusBrowserWindowForPortal(pageUrl: string): Promise<void> {
  if (process.platform !== "win32") return;

  let hostHint = "";
  try {
    hostHint = new URL(pageUrl).hostname.replace(/\..*$/, "");
  } catch {
    /* ignore */
  }

  try {
    const user32 = koffi.load("user32.dll");
    const IsWindowVisible = user32.func("IsWindowVisible", "bool", [
      "uintptr",
    ]) as (hwnd: bigint) => boolean;
    const GetWindowTextW = user32.func("GetWindowTextW", "int", [
      "uintptr",
      "void *",
      "int",
    ]) as (hwnd: bigint, buf: Buffer, max: number) => number;
    const SetForegroundWindow = user32.func("SetForegroundWindow", "bool", [
      "uintptr",
    ]) as (hwnd: bigint) => boolean;
    const EnumWindows = user32.func("EnumWindows", "bool", [
      koffi.pointer(focusEnumProto()),
      "intptr",
    ]) as (cb: unknown, lParam: bigint) => boolean;

    let bestHwnd = 0n;
    let bestScore = 0;

    const cb = koffi.register(
      (hwnd: bigint) => {
        if (!IsWindowVisible(hwnd)) return true;
        const buf = Buffer.alloc(1024);
        const len = GetWindowTextW(hwnd, buf, 512);
        if (len <= 0) return true;
        const title = buf
          .toString("utf16le", 0, len * 2)
          .replace(/\0+$/, "");
        if (!title || title.includes("SchoolUtil") || title.includes("Cursor")) {
          return true;
        }
        let score = 0;
        if (/chrome|edge|chromium/i.test(title)) score += 40;
        if (title.includes("로그인") || /login/i.test(title)) score += 50;
        if (hostHint && title.toLowerCase().includes(hostHint.toLowerCase())) {
          score += 30;
        }
        if (title.includes("neis")) score += 20;
        if (title.includes("에듀파인") || /K-에듀파인/i.test(title)) {
          score += 45;
        }
        if (title.includes("업무포털") || title.includes("eduptl")) {
          score += 40;
        }
        if (score > bestScore) {
          bestScore = score;
          bestHwnd = hwnd;
        }
        return true;
      },
      koffi.pointer(focusEnumProto()),
    );

    try {
      EnumWindows(cb, 0n);
    } finally {
      koffi.unregister(cb);
    }

    if (bestHwnd && bestScore >= 50) {
      SetForegroundWindow(bestHwnd);
      await sleep(350);
    }
  } catch {
    /* ignore */
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
