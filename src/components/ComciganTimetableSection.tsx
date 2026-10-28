import { useCallback, useState } from "react";
import type { AppSettings, ComciganTeacherOption } from "@/types/state";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsCheckbox } from "@/components/settings/SettingsCheckbox";
import { SettingsSegmented } from "@/components/settings/SettingsSegmented";

type SchoolRow = {
  regionName: string;
  schoolName: string;
  schoolCode: number;
};

type Props = {
  draft: AppSettings;
  onPatch: (partial: Partial<AppSettings>) => void;
};

function formatSyncTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ComciganTimetableSection({ draft, onPatch }: Props) {
  const [query, setQuery] = useState("");
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [teachers, setTeachers] = useState<ComciganTeacherOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const api = window.schoolUtil;

  const searchSchools = useCallback(async () => {
    if (!api?.searchComciganSchools) return;
    setSearching(true);
    setStatus(null);
    try {
      const res = await api.searchComciganSchools(query.trim());
      if (!res.ok) {
        setStatus(res.error);
        setSchools([]);
        return;
      }
      setSchools(res.schools);
      if (res.schools.length === 0) {
        setStatus("검색 결과가 없습니다. 이름을 줄여 보세요.");
      }
    } finally {
      setSearching(false);
    }
  }, [api, query]);

  const pickSchool = useCallback(
    async (row: SchoolRow) => {
      onPatch({
        comciganSchoolCode: String(row.schoolCode),
        comciganSchoolName: row.schoolName,
        comciganTeacherName: "",
        comciganTeacherIndex: -1,
      });
      setTeachers([]);
      if (!api?.listComciganTeachers) return;
      setLoadingTeachers(true);
      setStatus(null);
      try {
        const res = await api.listComciganTeachers({
          schoolCode: row.schoolCode,
          mode: draft.timetableFetchMode,
          proxyBaseUrl: draft.timetableProxyBaseUrl,
        });
        if (!res.ok) {
          setStatus(res.error);
          return;
        }
        setTeachers(res.teachers);
      } finally {
        setLoadingTeachers(false);
      }
    },
    [api, draft.timetableFetchMode, draft.timetableProxyBaseUrl, onPatch],
  );

  const reloadTeachers = useCallback(async () => {
    const code = Number(draft.comciganSchoolCode);
    if (!code || !api?.listComciganTeachers) return;
    setLoadingTeachers(true);
    setStatus(null);
    try {
      const res = await api.listComciganTeachers({
        schoolCode: code,
        mode: draft.timetableFetchMode,
        proxyBaseUrl: draft.timetableProxyBaseUrl,
      });
      if (!res.ok) {
        setStatus(res.error);
        return;
      }
      setTeachers(res.teachers);
    } finally {
      setLoadingTeachers(false);
    }
  }, [
    api,
    draft.comciganSchoolCode,
    draft.timetableFetchMode,
    draft.timetableProxyBaseUrl,
  ]);

  const runSyncNow = useCallback(async () => {
    if (!api?.syncComciganTeacherTimetable) return;
    setSyncing(true);
    setStatus(null);
    try {
      const res = await api.syncComciganTeacherTimetable();
      if (!res.ok) {
        setStatus(res.error);
        return;
      }
      setStatus("시간표를 받았습니다.");
    } finally {
      setSyncing(false);
    }
  }, [api]);

  return (
    <>
      <SettingsRow
        title="교사 시간표 (컴시간)"
        hint="이번 주 교체가 반영된 표를 가져옵니다. 자동 갱신은 08:00·13:00과 앱 시작 시입니다. 시간표 빈 칸(+)에서 «매주» 또는 «이번 주만»을 고를 수 있습니다."
      >
        <SettingsCheckbox
          checked={draft.timetableAutoSync}
          onChange={(v) => onPatch({ timetableAutoSync: v })}
        >
          자동 갱신 사용
        </SettingsCheckbox>
      </SettingsRow>

      <SettingsRow title="가져오기 경로">
        <SettingsSegmented
          aria-label="시간표 가져오기 경로"
          value={draft.timetableFetchMode}
          onChange={(v) =>
            onPatch({ timetableFetchMode: v as AppSettings["timetableFetchMode"] })
          }
          options={[
            { value: "direct", label: "직접 (컴시간)" },
            { value: "s2h9", label: "s2h9 프록시" },
          ]}
        />
        {draft.timetableFetchMode === "s2h9" && (
          <input
            className="settings-control"
            style={{ marginTop: 8 }}
            value={draft.timetableProxyBaseUrl}
            onChange={(e) => onPatch({ timetableProxyBaseUrl: e.target.value })}
            placeholder="https://timetable.s2h9.dev"
            spellCheck={false}
          />
        )}
        <p className="muted" style={{ margin: "8px 0 0", fontSize: "0.82rem" }}>
          s2h9 모드는 연결·교사 목록을 프록시로 확인한 뒤, 시간표 데이터는
          컴시간에서 받습니다. 비공식 서비스이므로 언제든 바뀔 수 있습니다.
        </p>
      </SettingsRow>

      <SettingsRow title="컴시간 학교 검색" hint="NEIS 학교와 코드가 다를 수 있습니다.">
        <div className="settings-field-stack">
          <div className="input-row">
            <input
              className="settings-control"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="학교 이름"
              onKeyDown={(e) => {
                if (e.key === "Enter") void searchSchools();
              }}
            />
            <button
              type="button"
              className="settings-inline-btn settings-inline-btn--primary"
              disabled={searching || query.trim().length < 2}
              onClick={() => void searchSchools()}
            >
              {searching ? "검색 중…" : "검색"}
            </button>
          </div>
          {draft.comciganSchoolName && (
            <p className="muted" style={{ margin: 0 }}>
              선택: {draft.comciganSchoolName} (코드 {draft.comciganSchoolCode})
            </p>
          )}
          {schools.length > 0 && (
            <ul className="comcigan-school-list">
              {schools.slice(0, 12).map((s) => (
                <li key={s.schoolCode}>
                  <button
                    type="button"
                    className="settings-inline-btn"
                    onClick={() => void pickSchool(s)}
                  >
                    {s.regionName} {s.schoolName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingsRow>

      <SettingsRow
        title="학급 이름 표기"
        hint="일반고는 컴시간 학년·반 코드를 그대로 씁니다. 제일고(농업계)는 학과·반 약칭으로 바꿉니다."
      >
        <SettingsSegmented
          aria-label="컴시간 학급 이름 표기"
          value={draft.comciganClassLabelMode}
          onChange={(v) =>
            onPatch({
              comciganClassLabelMode: v as AppSettings["comciganClassLabelMode"],
            })
          }
          options={[
            { value: "general", label: "일반고 ver" },
            { value: "jeil", label: "제일고 ver" },
          ]}
        />
      </SettingsRow>

      <SettingsRow title="교사 선택" hint="성* 표기는 컴시간 마스킹입니다. 같은 이름이면 (#번호)로 구분합니다.">
        <div className="settings-field-stack">
          <div className="input-row">
            <select
              className="settings-control"
              value={
                draft.comciganTeacherIndex >= 0
                  ? String(draft.comciganTeacherIndex)
                  : ""
              }
              onChange={(e) => {
                const index = Number(e.target.value);
                const row = teachers.find((t) => t.index === index);
                if (!row) {
                  onPatch({ comciganTeacherName: "", comciganTeacherIndex: -1 });
                  return;
                }
                onPatch({
                  comciganTeacherName: row.name,
                  comciganTeacherIndex: row.index,
                });
              }}
              disabled={!draft.comciganSchoolCode}
            >
              <option value="">교사를 고르세요</option>
              {teachers.map((row) => (
                <option key={row.index} value={String(row.index)}>
                  {row.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="settings-inline-btn"
              disabled={loadingTeachers || !draft.comciganSchoolCode}
              onClick={() => void reloadTeachers()}
            >
              {loadingTeachers ? "불러오는 중…" : "목록 새로고침"}
            </button>
          </div>
          <button
            type="button"
            className="settings-inline-btn settings-inline-btn--primary"
            disabled={
              syncing ||
              !draft.comciganSchoolCode ||
              draft.comciganTeacherIndex < 0
            }
            onClick={() => void runSyncNow()}
          >
            {syncing ? "받는 중…" : "지금 가져오기"}
          </button>
        </div>
      </SettingsRow>

      <SettingsRow title="갱신 상태">
        <p className="muted" style={{ margin: 0 }}>
          마지막 성공: {formatSyncTime(draft.timetableLastSyncAt)}
          {draft.timetableLastSyncVia
            ? ` · ${draft.timetableLastSyncVia === "s2h9" ? "s2h9" : "직접"}`
            : ""}
        </p>
        {draft.timetableLastSyncError && (
          <p className="settings-error-line" style={{ margin: "6px 0 0" }}>
            {draft.timetableLastSyncError}
          </p>
        )}
        {status && (
          <p className="muted" style={{ margin: "6px 0 0" }}>
            {status}
          </p>
        )}
      </SettingsRow>
    </>
  );
}
