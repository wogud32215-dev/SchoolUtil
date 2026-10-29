import { useCallback, useEffect, useState } from "react";

export type AppUpdateUiPhase = "idle" | "available" | "downloading" | "downloaded";

type UpdateStatusPayload = {
  available: boolean;
  version: string | null;
  downloadPhase: "idle" | "downloading" | "downloaded";
  downloadPercent: number;
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
  const [error, setError] = useState<string | null>(null);

  const syncFromStatus = useCallback(
    (s: UpdateStatusPayload) => {
      if (s.available && s.version && s.version === dismissedVersion) {
        setPhase("idle");
        setVersion(null);
        return;
      }
      setVersion(s.version);
      setPhase(phaseFromStatus(s));
      setPercent(s.downloadPercent);
      if (s.lastError) {
        setError(s.lastError);
      }
    },
    [dismissedVersion],
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
      setPhase("available");
      setError(null);
    });
    const unDown = window.schoolUtil?.onUpdateDownloaded?.(() => {
      setPhase("downloaded");
      setPercent(100);
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
    });
    return () => {
      unAvail?.();
      unDown?.();
      unNot?.();
      unErr?.();
      unProg?.();
    };
  }, [dismissedVersion]);

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
    error,
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
