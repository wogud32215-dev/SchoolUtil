import type {
  ComciganLessonChip,
  ComciganTimetableView,
  TimetableData,
  TimetableSubstituteChange,
} from "../store";
import { periodStartTimes, weekDatesFromMonday } from "./week-meta";
import { fetchBytes } from "./http";
import {
  COMCI_BASE_URL,
  encodeSchoolSearchPath,
  encodeTimetablePath,
  getComciganRoutes,
} from "./routes";
import {
  decodeComciResponseText,
  listTeachersFromTimetableJson,
  parseFullTimetable,
  parseSchoolSearch,
  resolveComciganTeacherIndex,
  type ComciganSchoolRow,
  type ComciganTeacherOption,
} from "./parse";

export type { ComciganSchoolRow, ComciganTeacherOption };

export async function searchComciganSchools(
  query: string,
): Promise<ComciganSchoolRow[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const routes = await getComciganRoutes();
  const path = encodeSchoolSearchPath(routes, q);
  const buf = await fetchBytes(`${COMCI_BASE_URL}${path}`);
  const text = decodeComciResponseText(buf);
  return parseSchoolSearch(text);
}

export async function fetchTimetableJson(
  schoolCode: number,
  weekIndex = 1,
): Promise<{ jsonText: string; routes: Awaited<ReturnType<typeof getComciganRoutes>> }> {
  const routes = await getComciganRoutes();
  const path = encodeTimetablePath(routes, schoolCode, weekIndex);
  const buf = await fetchBytes(`${COMCI_BASE_URL}${path}`);
  const jsonText = decodeComciResponseText(buf);
  return { jsonText, routes };
}

export async function listComciganTeachers(
  schoolCode: number,
): Promise<ComciganTeacherOption[]> {
  const { jsonText, routes } = await fetchTimetableJson(schoolCode);
  return listTeachersFromTimetableJson(jsonText, routes.teacherCode);
}

export function buildTeacherTimetableGrid(
  full: ReturnType<typeof parseFullTimetable>,
  teacherIndex: number,
): {
  periodCount: number;
  grid: string[][];
  substituteFlags: boolean[][];
  comciganView: ComciganTimetableView;
} {
  const dayCount = 5;
  let maxPeriod = 0;
  const grid: string[][] = Array.from({ length: dayCount }, () => []);
  const substituteFlags: boolean[][] = Array.from({ length: dayCount }, () => []);
  const weekDates = weekDatesFromMonday();
  const changes: TimetableSubstituteChange[] = [];
  let chips: ComciganLessonChip[][][] = [];

  function ensureChipSlot(day: number, period: number): ComciganLessonChip[] {
    if (!chips[day]) chips[day] = [];
    if (!chips[day][period]) chips[day][period] = [];
    return chips[day][period];
  }

  function appendGridText(day: number, period: number, text: string): void {
    const row = grid[day];
    row[period] = row[period] ? `${row[period]} ${text}` : text;
  }

  for (let g = 0; g < full.length; g++) {
    const grade = full[g];
    for (let c = 0; c < grade.length; c++) {
      for (let d = 0; d < grade[c].length && d < dayCount; d++) {
        const day = grade[c][d];
        for (let p = 0; p < day.length; p++) {
          const cell = day[p];
          const classCode = String((g + 1) * 100 + (c + 1));
          const origSubject = cell.originalSubject?.trim() ?? "";

          if (cell.teacherIndex === teacherIndex) {
            maxPeriod = Math.max(maxPeriod, p + 1);
            const compact = `${classCode}${cell.subject}`.trim();
            let text = compact;
            if (cell.changed) {
              const orig = origSubject;
              text += orig ? ` (교체·원:${orig})` : ` (교체)`;
            }
            appendGridText(d, p, text);
            ensureChipSlot(d, p).push({
              classCode,
              subject: cell.subject,
              changed: cell.changed,
              originalSubject: cell.originalSubject,
            });
            if (cell.changed) {
              substituteFlags[d][p] = true;
              const periodTime = periodStartTimes(Math.max(p + 1, 7))[p] ?? "";
              changes.push({
                dayIndex: d,
                period: p + 1,
                dateYmd: weekDates[d] ?? "",
                periodTime,
                classCode,
                subject: cell.subject,
                originalSubject: origSubject || "—",
              });
            }
            continue;
          }

          const origIdx = cell.originalTeacherIndex ?? -1;
          if (origIdx !== teacherIndex || !origSubject) continue;

          maxPeriod = Math.max(maxPeriod, p + 1);
          const vacatedText = `${classCode}${origSubject} (빠짐)`;
          appendGridText(d, p, vacatedText);
          const slot = ensureChipSlot(d, p);
          const duplicate = slot.some(
            (chip) => chip.classCode === classCode && chip.vacated,
          );
          if (!duplicate) {
            slot.push({
              classCode,
              subject: origSubject,
              changed: false,
              vacated: true,
            });
          }
        }
      }
    }
  }

  const periodCount = Math.min(12, Math.max(7, maxPeriod || 7));
  const periodTimes = periodStartTimes(periodCount);
  for (let d = 0; d < dayCount; d++) {
    while (grid[d].length < periodCount) {
      grid[d].push("");
    }
    while (substituteFlags[d].length < periodCount) {
      substituteFlags[d].push(false);
    }
    if (!chips[d]) chips[d] = [];
    for (let p = 0; p < periodCount; p++) {
      if (!chips[d][p]) chips[d][p] = [];
    }
  }

  changes.sort(
    (a, b) =>
      a.dayIndex - b.dayIndex ||
      a.period - b.period ||
      a.classCode.localeCompare(b.classCode),
  );

  const comciganView: ComciganTimetableView = {
    weekDates,
    periodTimes,
    chips,
    changes,
  };

  return { periodCount, grid, substituteFlags, comciganView };
}

export async function fetchTeacherTimetableDirect(
  schoolCode: number,
  teacherName: string,
  teacherIndex: number,
  schoolLabel?: string,
): Promise<TimetableData> {
  const { jsonText, routes } = await fetchTimetableJson(schoolCode);
  const dataTeachers = JSON.parse(jsonText) as Record<string, unknown>;
  const teachers = dataTeachers[`자료${routes.teacherCode}`] as
    | string[]
    | undefined;
  if (!teachers?.length) {
    throw new Error("컴시간 시간표 응답을 읽지 못했습니다.");
  }
  const resolved = resolveComciganTeacherIndex(
    teachers,
    teacherName,
    teacherIndex,
  );
  if (typeof resolved !== "number") {
    throw new Error(resolved.error);
  }
  const full = parseFullTimetable(jsonText, routes);
  const { periodCount, grid, substituteFlags, comciganView } =
    buildTeacherTimetableGrid(full, resolved);
  const title =
    schoolLabel?.trim()
      ? `${teacherName} · ${schoolLabel.trim()}`
      : `${teacherName} · 이번 주`;
  return {
    title,
    periodCount,
    grid,
    substituteFlags,
    comciganView,
  };
}
