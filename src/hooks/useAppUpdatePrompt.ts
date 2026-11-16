import { useCallback, useEffect, useState } from "react";
import {
  collectHighlightsBetween,
  mergeReleaseHighlights,
} from "@/data/releaseNotes";

export type AppUpdateUiPhase = "idle" | "available" | "downloading" | "downloaded";

type UpdateStatusPayload = {
  available: boolean;
  version: string | null;
  releaseNotes: string[];
  downloadPhase: "idle" | "downloading" | "downloaded";
  downloadPercent: number;
  downloadTransferred: number;
  downloadTotal: number;
  lastError: string | null;
  checking: boolean;
};

let checkFeedback: string | null = null;
const checkFeedbackSubs = new Set<() => void>();

function setCheckFeedback(msg: string | null): void {
  checkFeedback = msg;
  for (const fn of checkFeedbackSubs) {
    fn();
  }
}

export function getUpdateCheckFeedback(): string | null {
  return checkFeedback;
}

export function subscribeUpdateCheckFeedback(listener: () => void): () => void {
  checkFeedbackSubs.add(listener);
  return () => {
    checkFeedbackSubs.delete(listener);
  };
}

function phaseFromStatus(s: UpdateStatusPayload): AppUpdateUiPhase {
  if (s.downloadPhase === "downloaded") return "downloaded";
  if (s.downloadPhase === "downloading") return "downloading";
  if (s.available && s.version) return "available";
  return "idle";
}

type UseAppUpdatePromptOptions = {
  dismissedVersion?: string;
  onDismissVersion: (version: string) => void;
};

export function useAppUpdatePrompt({
  dismissedVersion,
  onDismissVersion,
}: UseAppUpdatePromptOptions) {
  const [version, setVersion] = useState<string | null>(null);
  const [phase, setPhase] = useState<AppUpdateUiPhase>("idle");
  const [percent, setPercent] = useState(0);
  const [transferred, setTransferred] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string[]>([]);

  const applyReleaseNotes = useCallback(
    (targetVersion: string | null, raw: string[]) => {
      if (!targetVersion) {
        setReleaseNotes(raw);
        return;
      }
      setReleaseNotes(mergeReleaseHighlights(targetVersion, raw));
    },
    [],
  );

  const syncFromStatus = useCallback(
    (s: UpdateStatusPayload) => {
      if (s.available && s.version && s.version === dismissedVersion) {
        setPhase("idle");
        setVersion(null);
        setReleaseNotes([]);
        return;
      }
      setVersion(s.version);
      setPhase(phaseFromStatus(s));
      setPercent(s.downloadPercent);
      setTransferred(s.downloadTransferred);
      setTotal(s.downloadTotal);
      applyReleaseNotes(s.version, s.releaseNotes ?? []);
      if (s.lastError) {
        setError(s.lastError);
      }
    },
    [applyReleaseNotes, dismissedVersion],
  );

  useEffect(() => {
    void window.schoolUtil?.getUpdateStatus?.().then((s) => {
      if (s) syncFromStatus(s);
    });
  }, [syncFromStatus]);

  useEffect(() => {
    const unAvail = window.schoolUtil?.onUpdateAvailable?.((payload) => {
      if (payload.version === dismissedVersion) return;
      setVersion(payload.version);
      applyReleaseNotes(payload.version, payload.releaseNotes ?? []);
      setPhase("available");
      setError(null);
    });
    const unDown = window.schoolUtil?.onUpdateDownloaded?.((payload) => {
      setPhase("downloaded");
      setPercent(100);
      const ver = payload?.version ?? null;
      if (payload?.releaseNotes?.length) {
        applyReleaseNotes(ver, payload.releaseNotes);
      }
      if (ver) {
        setVersion(ver);
      }
      setError(null);
    });
    const unNot = window.schoolUtil?.onUpdateNotAvailable?.(() => {
      setCheckFeedback("현재 최신 버전입니다.");
      setPhase("idle");
      setVersion(null);
    });
    const unErr = window.schoolUtil?.onUpdateError?.((payload) => {
      setError(payload.message || "업데이트 확인에 실패했습니다.");
      setCheckFeedback(payload.message || "업데이트 확인에 실패했습니다.");
    });
    const unProg = window.schoolUtil?.onUpdateProgress?.((payload) => {
      setPhase("downloading");
      setPercent(payload.percent);
      setTransferred(payload.transferred);
      setTotal(payload.total);
    });
    return () => {
      unAvail?.();
      unDown?.();
      unNot?.();
      unErr?.();
      unProg?.();
    };
  }, [applyReleaseNotes, dismissedVersion]);

  const dismissAvailable = useCallback(() => {
    if (!version) return;
    onDismissVersion(version);
    setPhase("idle");
    setVersion(null);
  }, [onDismissVersion, version]);

  const deferInstall = useCallback(() => {
    setPhase("idle");
  }, []);

  const download = useCallback(async () => {
    if (!version) return;
    setError(null);
    setPhase("downloading");
    setPercent(0);
    setTransferred(0);
    setTotal(0);
    const res = await window.schoolUtil?.downloadUpdate?.();
    if (!res?.ok) {
      setPhase("available");
      setError(res?.error ?? "다운로드에 실패했습니다.");
    }
  }, [version]);

  const install = useCallback(() => {
    void window.schoolUtil?.installUpdate?.();
  }, []);

  const visible =
    phase === "available" ||
    phase === "downloading" ||
    phase === "downloaded";

  return {
    visible,
    version,
    phase,
    percent,
    transferred,
    total,
    error,
    releaseNotes,
    dismissAvailable,
    deferInstall,
    download,
    install,
  };
}

export function useUpdateCheckFeedback(): string | null {
  const [msg, setMsg] = useState<string | null>(() => checkFeedback);
  useEffect(() => subscribeUpdateCheckFeedback(() => setMsg(checkFeedback)), []);
  return msg;
}

export function clearUpdateCheckFeedback(): void {
  setCheckFeedback(null);
}

export function markUpdateCheckStarted(): void {
  setCheckFeedback("업데이트 확인 중… 잠시 후 결과가 표시됩니다.");
}

type AppUpgradedPayload = {
  version: string;
  previousVersion: string;
  releaseNotes: string[];
};

type UseUpdateCompleteNoticeOptions = {
  ready: boolean;
  acknowledgedAppVersion?: string;
  lastLaunchedAppVersion?: string;
  onAcknowledgeVersion: (version: string) => void;
};

function resolvePreviousForCompleteNotice(
  current: string,
  acknowledgedAppVersion?: string,
  lastLaunchedAppVersion?: string,
): string | null {
  const ack = acknowledgedAppVersion?.trim() ?? "";
  const last = lastLaunchedAppVersion?.trim() ?? "";
  if (ack && ack !== current) return ack;
  if (!ack && last && last !== current) return last;
  return null;
}

/** 재시작 후 버전이 바뀌었을 때 «업데이트 완료» 배너 */
export function useUpdateCompleteNotice({
  ready,
  acknowledgedAppVersion,
  lastLaunchedAppVersion,
  onAcknowledgeVersion,
}: UseUpdateCompleteNoticeOptions) {
  const [visible, setVisible] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [previousVersion, setPreviousVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string[]>([]);

  const applyUpgradePayload = useCallback((payload: AppUpgradedPayload) => {
    setVersion(payload.version);
    setPreviousVersion(payload.previousVersion);
    setReleaseNotes(
      payload.releaseNotes.length > 0
        ? payload.releaseNotes
        : collectHighlightsBetween(payload.previousVersion, payload.version),
    );
    setVisible(true);
  }, []);

  const evaluateFromSettings = useCallback(async () => {
    const current = await window.schoolUtil?.getAppVersion?.();
    if (!current) return;
    const previous = resolvePreviousForCompleteNotice(
      current,
      acknowledgedAppVersion,
      lastLaunchedAppVersion,
    );
    if (!previous) {
      setVisible(false);
      return;
    }
    applyUpgradePayload({
      version: current,
      previousVersion: previous,
      releaseNotes: collectHighlightsBetween(previous, current),
    });
  }, [
    acknowledgedAppVersion,
    applyUpgradePayload,
    lastLaunchedAppVersion,
  ]);

  useEffect(() => {
    if (!ready) return;
    void evaluateFromSettings();
  }, [ready, evaluateFromSettings]);

  useEffect(() => {
    if (!ready) return;
    const unsub = window.schoolUtil?.onAppUpgraded?.((payload) => {
      applyUpgradePayload(payload);
    });
    return unsub;
  }, [ready, applyUpgradePayload]);

  const dismiss = useCallback(() => {
    if (!version) return;
    onAcknowledgeVersion(version);
    setVisible(false);
  }, [onAcknowledgeVersion, version]);

  return { visible, version, previousVersion, releaseNotes, dismiss };
}
