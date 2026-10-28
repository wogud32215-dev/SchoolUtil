import koffi from "koffi";

const HWND_NOTOPMOST = -2;
const SWP_NOMOVE = 0x0002;
const SWP_NOSIZE = 0x0001;
const SWP_NOACTIVATE = 0x0010;

type FindWindowAFn = (
  lpClassName: string | null,
  lpWindowName: string | null,
) => bigint | number;
type SetWindowPosFn = (
  hwnd: bigint,
  insertAfter: bigint,
  x: number,
  y: number,
  cx: number,
  cy: number,
  flags: number,
) => boolean;

let findWindowA: FindWindowAFn | null = null;
let setWindowPos: SetWindowPosFn | null = null;

try {
  if (process.platform === "win32") {
    const user32 = koffi.load("user32.dll");
    findWindowA = user32.func("FindWindowA", "uintptr", [
      "str",
      "str",
    ]) as FindWindowAFn;
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
  findWindowA = null;
  setWindowPos = null;
}

function hwndFromBuffer(hwnd: Buffer): bigint {
  return hwnd.length >= 8
    ? hwnd.readBigUInt64LE(0)
    : BigInt(hwnd.readUInt32LE(0));
}

/**
 * 위젯 창을 바탕화면 셸(Progman) 위·일반 앱 아래에 두어 카드 클릭이 가능하게 한다.
 * HWND_BOTTOM은 아이콘 레이어 아래로 내려가 위젯이 클릭되지 않는다.
 */
export function ensureWidgetDesktopZOrder(hwnd: Buffer): boolean {
  if (!setWindowPos || process.platform !== "win32") return false;
  const flags = SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE;
  try {
    const handle = hwndFromBuffer(hwnd);
    const progman = findWindowA?.("Progman", null);
    if (progman) {
      const progmanHwnd =
        typeof progman === "bigint" ? progman : BigInt(progman);
      if (
        setWindowPos(handle, progmanHwnd, 0, 0, 0, 0, flags)
      ) {
        return true;
      }
    }
    return setWindowPos(
      handle,
      BigInt(HWND_NOTOPMOST),
      0,
      0,
      0,
      0,
      flags,
    );
  } catch {
    return false;
  }
}
