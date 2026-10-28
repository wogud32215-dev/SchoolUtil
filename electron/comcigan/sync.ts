import type { TimetableData } from "../store";
import {
  fetchTeacherTimetableDirect,
  listComciganTeachers,
  searchComciganSchools,
  type ComciganSchoolRow,
  type ComciganTeacherOption,
} from "./direct";
import { openS2h9Session, pingS2h9School } from "./s2h9-proxy";

export type TimetableFetchMode = "direct" | "s2h9";

export type SyncTeacherResult =
  | {
      ok: true;
      timetable: TimetableData;
      via: TimetableFetchMode;
      s2h9Bytes?: number;
    }
  | { ok: false; error: string };

export async function searchSchools(query: string): Promise<ComciganSchoolRow[]> {
  return searchComciganSchools(query);
}

export async function listTeachers(
  schoolCode: number,
  mode: TimetableFetchMode,
  proxyBaseUrl?: string,
): Promise<ComciganTeacherOption[]> {
  if (mode === "s2h9") {
    try {
      const session = await openS2h9Session(proxyBaseUrl);
      await pingS2h9School(session, String(schoolCode));
    } catch {
      /* s2h9 연결 확인 실패 시에도 컴시간 목록 시도 */
    }
  }
  return listComciganTeachers(schoolCode);
}

export async function syncTeacherTimetable(
  schoolCode: number,
  teacherName: string,
  teacherIndex: number,
  mode: TimetableFetchMode,
  schoolLabel?: string,
  proxyBaseUrl?: string,
): Promise<SyncTeacherResult> {
  const teacher = teacherName.trim();
  if (!teacher) {
    return { ok: false, error: "교사를 선택해 주세요." };
  }
  if (!Number.isFinite(schoolCode) || schoolCode <= 0) {
    return { ok: false, error: "컴시간 학교 코드가 없습니다." };
  }

  let s2h9Bytes: number | undefined;
  if (mode === "s2h9") {
    const session = await openS2h9Session(proxyBaseUrl);
    const ping = await pingS2h9School(session, String(schoolCode));
    if (!ping.ok) {
      return { ok: false, error: `s2h9 프록시: ${ping.error}` };
    }
    s2h9Bytes = ping.bytes;
  }

  try {
    const timetable = await fetchTeacherTimetableDirect(
      schoolCode,
      teacher,
      teacherIndex,
      schoolLabel,
    );
    return {
      ok: true,
      timetable,
      via: mode,
      s2h9Bytes,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "시간표를 받지 못했습니다.";
    if (mode === "s2h9") {
      return {
        ok: false,
        error: `${msg} (s2h9 연결은 확인됨 — 컴시간 직접 요청 실패)`,
      };
    }
    return { ok: false, error: msg };
  }
}
