import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { getState, patchState } from "./store";

const INSTALLER_OPEN_AT_LOGIN_FLAG = "installer-open-at-login.flag";

/** 설치 프로그램 완료 화면에서 «시작 시 실행»을 선택한 경우 settings와 동기화 */
export function applyInstallerOpenAtLoginFlag(): void {
  if (!app.isPackaged) return;

  const flagPath = path.join(app.getPath("userData"), INSTALLER_OPEN_AT_LOGIN_FLAG);
  try {
    if (!fs.existsSync(flagPath)) return;
    fs.unlinkSync(flagPath);
    const settings = getState().settings;
    patchState({
      settings: {
        ...settings,
        openAtLogin: true,
      },
    });
  } catch {
    /* 플래그 처리 실패해도 앱은 계속 */
  }
}
