import koffi from "koffi";

const DESKTOP_FOREGROUND_CLASSES = new Set(["Progman", "WorkerW"]);

type GetForegroundWindowFn = () => bigint | number;
type GetClassNameWFn = (
  hwnd: bigint | number,
  lpClassName: Buffer,
  nMaxCount: number,
) => number;

let getForegroundWindow: GetForegroundWindowFn | null = null;
let getClassNameW: GetClassNameWFn | null = null;

try {
  if (process.platform === "win32") {
    const user32 = koffi.load("user32.dll");
    getForegroundWindow = user32.func(
      "GetForegroundWindow",
      "uintptr",
      [],
    ) as GetForegroundWindowFn;
    getClassNameW = user32.func("GetClassNameW", "int", [
      "uintptr",
      "void *",
      "int",
    ]) as GetClassNameWFn;
  }
} catch {
  getForegroundWindow = null;
  getClassNameW = null;
}

/** 전경 창이 바탕화면(Progman/WorkerW)일 때 true. Win+D·바탕화면 클릭 동기화용(근사). */
export function isDesktopForeground(): boolean {
  if (!getForegroundWindow || !getClassNameW || process.platform !== "win32") {
    return false;
  }
  try {
    const hwnd = getForegroundWindow();
    if (!hwnd) return false;
    const buf = Buffer.alloc(512);
    const len = getClassNameW(hwnd, buf, 256);
    if (len <= 0) return false;
    const name = buf.toString("utf16le", 0, len * 2).replace(/\0+$/, "");
    return DESKTOP_FOREGROUND_CLASSES.has(name);
  } catch {
    return false;
  }
}
