import type { WebContents } from "electron";
import { getState } from "./store";

let target: WebContents | null = null;

export function setStoreBroadcastTarget(wc: WebContents | null): void {
  target = wc;
}

/** 메인 프로세스가 store를 직접 갱신했을 때 렌더러에 최신 상태를 보냅니다. */
export function broadcastStoreState(): void {
  if (!target || target.isDestroyed()) return;
  target.send("store:updated", getState());
}
