import koffi from "koffi";

const HWND_BOTTOM = 1;
const SWP_NOMOVE = 0x0002;
const SWP_NOSIZE = 0x0001;
const SWP_NOACTIVATE = 0x0010;

type SetWindowPosFn = (
  hwnd: bigint,
  insertAfter: bigint,
  x: number,
  y: number,
  cx: number,
  cy: number,
  flags: number,
) => boolean;

let setWindowPos: SetWindowPosFn | null = null;

try {
  if (process.platform === "win32") {
    const user32 = koffi.load("user32.dll");
    setWindowPos = user32.func("SetWindowPos", "bool", [
      "uintptr",
      "uintptr",
      "int",
      "int",
      "int",
      "int",
      "uint",
    ]) as SetWindowPosFn;
  }
} catch {
  setWindowPos = null;
}

/** 바탕화면 아이콘 아래로 보내기 (실패 시 false, 앱은 계속 동작). */
export function sendWindowToDesktopBottom(hwnd: Buffer): boolean {
  if (!setWindowPos || process.platform !== "win32") return false;
  try {
    const handle =
      hwnd.length >= 8
        ? hwnd.readBigUInt64LE(0)
        : BigInt(hwnd.readUInt32LE(0));
    return setWindowPos(
      handle,
      BigInt(HWND_BOTTOM),
      0,
      0,
      0,
      0,
      SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
    );
  } catch {
    return false;
  }
}
