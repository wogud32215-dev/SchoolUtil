import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "@/types/state";

type Props = {
  settings: AppSettings;
};

type MealState = {
  loading: boolean;
  error: string | null;
  lines: string[];
};

export function MealWidget({ settings }: Props) {
  const [state, setState] = useState<MealState>({
    loading: false,
    error: null,
    lines: [],
  });

  const load = useCallback(async () => {
    setState({ loading: true, error: null, lines: [] });
    const api = window.schoolUtil;
    if (api?.fetchNeisMeal) {
      const res = await api.fetchNeisMeal();
      if (res.ok) {
        setState({ loading: false, error: null, lines: res.lines });
      } else {
        setState({ loading: false, error: res.error, lines: [] });
      }
      return;
    }
    setState({
      loading: false,
      error: "Electron 앱에서만 급식을 불러올 수 있습니다.",
      lines: [],
    });
  }, []);

  useEffect(() => {
    void load();
  }, [
    load,
    settings.neisApiKey,
    settings.neisOfficeCode,
    settings.neisSchoolCode,
  ]);

  if (state.loading) return <p className="muted">급식 불러오는 중…</p>;
  if (state.error) {
    return (
      <div>
        <p className="muted">{state.error}</p>
        <button type="button" className="btn-primary" onClick={() => void load()}>
          다시 불러오기
        </button>
      </div>
    );
  }

  return (
    <ul>
      {state.lines.map((line, i) => (
        <li key={i} style={{ padding: "4px 0" }}>
          {line}
        </li>
      ))}
    </ul>
  );
}
