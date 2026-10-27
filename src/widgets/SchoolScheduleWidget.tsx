import { useCallback, useEffect, useState } from "react";
import { WidgetFetchError } from "@/components/WidgetFetchState";
import { useNeisKeyStatus } from "@/hooks/useNeisKeyStatus";
import type { AppSettings, NeisScheduleRow } from "@/types/state";

type Props = {
  settings: AppSettings;
};

function formatYmd(ymd: string): string {
  if (ymd.length !== 8) return ymd;
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function monthRange(): { fromYmd: string; toYmd: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(y, m + 1, 0).getDate();
  return {
    fromYmd: `${y}${pad(m + 1)}01`,
    toYmd: `${y}${pad(m + 1)}${pad(last)}`,
    label: `${y}년 ${m + 1}월`,
  };
}

export function SchoolScheduleWidget({ settings }: Props) {
  const { neisReady } = useNeisKeyStatus();
  const [items, setItems] = useState<NeisScheduleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("아직 불러오지 않았습니다.");
  const [monthLabel, setMonthLabel] = useState("");

  const load = useCallback(async () => {
    const api = window.schoolUtil;
    if (!api?.fetchNeisSchedule) {
      const msg =
        "Electron 창에서 실행 중이 아닙니다. `npm run dev`로 뜬 앱 창을 사용하세요.";
      setError(msg);
      setStatus(msg);
      return;
    }

    const { fromYmd, toYmd, label } = monthRange();
    setMonthLabel(label);
    setLoading(true);
    setError(null);
    setStatus("NEIS에서 학사일정을 불러오는 중…");

    try {
      const res = await api.fetchNeisSchedule({ fromYmd, toYmd });
      if (!res || typeof res !== "object" || !("ok" in res)) {
        setItems([]);
        setError("앱 응답 형식 오류 — Electron을 다시 실행해 보세요.");
        setStatus("실패");
        return;
      }
      if (!res.ok) {
        setItems([]);
        setError(res.error);
        setStatus(`실패: ${res.error}`);
        return;
      }
      setItems(res.items);
      const n = res.items.length;
      setStatus(
        n > 0
          ? `${label} 일정 ${n}건`
          : `${label} NEIS에 등록된 학사일정이 없습니다.`,
      );
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "학사일정 요청 중 오류가 났습니다.";
      setItems([]);
      setError(msg);
      setStatus(`실패: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, neisReady, settings.neisOfficeCode, settings.neisSchoolCode]);

  const today = todayYmd();
  const upcoming = items.filter((it) => it.ymd >= today).slice(0, 20);
  const past = items.filter((it) => it.ymd < today).slice(-3);

  return (
    <>
      <div className="widget-toolbar">
        <span className="widget-toolbar-title">
          {monthLabel || "—"} · NEIS
        </span>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void load()}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? "불러오는 중…" : "새로고침"}
        </button>
      </div>
      <p
        className={`sched-status ${error ? "sched-status-error" : ""}`}
        role="status"
      >
        {status}
      </p>
      {error && (
        <WidgetFetchError
          message={error}
          onRetry={() => void load()}
          retryLabel="다시 시도"
        />
      )}
      {!error && (
        <ul className="sched-list">
          {upcoming.map((it) => (
            <li key={`${it.ymd}-${it.name}`} className="sched-item">
              <time dateTime={formatYmd(it.ymd)}>{formatYmd(it.ymd)}</time>
              <strong>{it.name}</strong>
              {it.content && (
                <span className="muted sched-content">{it.content}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {!loading && !error && upcoming.length === 0 && items.length > 0 && (
        <p className="widget-state-empty muted">이번 달 남은 일정이 없습니다.</p>
      )}
      {!loading && !error && upcoming.length === 0 && items.length === 0 && (
        <p className="widget-state-empty muted">
          표시할 학사일정이 없습니다. NEIS 키·학교 코드를 확인하세요.
        </p>
      )}
      {past.length > 0 && !error && (
        <>
          <p className="sched-past-title">최근 지난 일정</p>
          <ul className="sched-list sched-past">
            {past.map((it) => (
              <li key={`p-${it.ymd}-${it.name}`} className="sched-item">
                <time>{formatYmd(it.ymd)}</time>
                <span>{it.name}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
