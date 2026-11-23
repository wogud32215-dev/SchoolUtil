import iconv from "iconv-lite";
import { qnmsbChange, qnmsbChangeNumber } from "./nmsb-change";
import type { ServiceProtocol } from "./service-protocol";

export type ComciganSchoolRow = {
  regionCode: number;
  regionName: string;
  schoolName: string;
  schoolCode: number;
};

export type ComciganLessonCell = {
  subject: string;
  teacher: string;
  /** 컴시간 `자료*` 교사 배열 인덱스 (-1 = 없음) */
  teacherIndex: number;
  changed: boolean;
  originalSubject?: string;
  originalTeacher?: string;
  originalTeacherIndex?: number;
};

export type ComciganTeacherOption = {
  index: number;
  name: string;
  label: string;
};

export type ComciganClassOption = {
  classCode: string;
  label: string;
};

export function decodeComciResponseText(buf: Buffer): string {
  const utf8 = buf.toString("utf8");
  if (utf8.includes("자료") || utf8.includes("학교검색")) {
    return utf8.replace(/\0/g, "");
  }
  return iconv.decode(buf, "euc-kr").replace(/\0/g, "");
}

function resolveSchoolCodeFromRow(
  row: unknown[],
  divisor: number | null | undefined,
  offset: number,
): number | null {
  let schoolCode: number | null = null;
  const fallback = row[3];
  if (typeof fallback === "number" && Number.isFinite(fallback)) {
    schoolCode = fallback;
  } else {
    schoolCode = qnmsbChangeNumber(fallback);
  }

  if (divisor && divisor > 0 && typeof row[0] === "number") {
    const column = Math.floor(row[0] / divisor) + offset;
    if (column >= 3 && column < row.length) {
      const cell = row[column];
      if (typeof cell === "number" && Number.isFinite(cell)) {
        schoolCode = cell;
      } else {
        const decoded = qnmsbChangeNumber(cell);
        if (decoded != null) schoolCode = decoded;
      }
    }
  }

  return schoolCode;
}

/** 컴시간 `Q성명` — 복호화 후 마스킹 `*` 처리 */
export function normalizeComciganTeacherName(encoded: unknown): string {
  const name = qnmsbChange(encoded);
  if (
    (name.includes("*") && !name.startsWith("*") && !name.endsWith("*")) ||
    (name.length === 2 && name[1] === "*")
  ) {
    return name;
  }
  return name.replace("*", "");
}

function decodeComciganTeachers(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => normalizeComciganTeacherName(item));
}

function decodeComciganSubjects(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => qnmsbChange(item));
}

export function parseSchoolSearch(
  jsonText: string,
  protocol?: Pick<ServiceProtocol, "schoolDivisor" | "schoolOffset">,
): ComciganSchoolRow[] {
  const data = JSON.parse(jsonText) as {
    학교검색?: unknown[][];
  };
  const rows = data.학교검색 ?? [];
  const divisor = protocol?.schoolDivisor;
  const offset = protocol?.schoolOffset ?? 0;
  const out: ComciganSchoolRow[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 4) continue;
    const regionCode = row[0];
    if (typeof regionCode !== "number") continue;
    if (regionCode === 0) continue;

    const schoolCode = resolveSchoolCodeFromRow(row, divisor, offset);
    if (schoolCode == null || schoolCode <= 0) continue;

    out.push({
      regionCode,
      regionName: qnmsbChange(row[1]),
      schoolName: qnmsbChange(row[2]),
      schoolCode,
    });
  }
  return out;
}

type RawTimetableJson = Record<string, unknown>;

/** 컴시간 «변경알림» 학교: `>` 접두가 있을 때만 이번 주 변경으로 본다 */
export function isComciganMarkedChange(raw: unknown): boolean {
  return typeof raw === "string" && raw.trim().startsWith(">");
}

function comciganCellChanged(
  rawNow: unknown,
  rawOrigin: unknown,
  pNow: number,
  pOrigin: number,
  changeNotifications: boolean,
): boolean {
  if (changeNotifications) {
    return isComciganMarkedChange(rawNow);
  }
  return (
    rawNow !== rawOrigin &&
    (pNow !== pOrigin || String(rawNow) !== String(rawOrigin))
  );
}

/** 교시 코드: 숫자 또는 교체 표시 접두(`>13013` 등) */
export function parsePeriodCode(raw: unknown): number {
  if (raw === 0 || raw === "0" || raw === "" || raw == null) return 0;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const s = String(raw).trim();
  if (!s) return 0;
  const digits = s.replace(/^[^0-9]+/, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

function decodePeriodCell(
  raw: unknown,
  teachers: string[],
  subjects: string[],
  teachersLen: number,
): { subject: string; teacher: string; teacherIndex: number } {
  const code = parsePeriodCode(raw);
  if (!code) {
    return { subject: "", teacher: "", teacherIndex: -1 };
  }
  const teacherIndex = code % 10 ** teachersLen;
  const subject = subjects[(code / 10 ** (teachersLen + 1)) | 0] ?? "";
  const teacher = teachers[teacherIndex] ?? "";
  return {
    subject: subject && subject !== "19" ? subject : subject ? "—" : "",
    teacher: teacher && teacher !== "*" ? teacher : "",
    teacherIndex: teacher && teacher !== "*" ? teacherIndex : -1,
  };
}

export function parseFullTimetable(
  jsonText: string,
  codes: {
    teacherCode: string;
    subjectCode: string;
    originalCode: string;
    dayCode: string;
  },
): ComciganLessonCell[][][][] {
  const data = JSON.parse(jsonText) as RawTimetableJson;
  const teachers = decodeComciganTeachers(data[`자료${codes.teacherCode}`]);
  const subjects = decodeComciganSubjects(data[`자료${codes.subjectCode}`]);
  const original = data[`자료${codes.originalCode}`] as number[][][][];
  const now = data[`자료${codes.dayCode}`] as number[][][][];

  if (!teachers?.length || !subjects?.length || !original || !now) {
    throw new Error("컴시간 시간표 응답을 읽지 못했습니다.");
  }

  const changeNotifications = String(data["변경알림"] ?? "") === "1";
  const teachersLen = Math.floor(Math.log10(teachers.length - 1)) + 1;

  const result: ComciganLessonCell[][][][] = [];

  for (let gi = 1; gi < now.length; gi++) {
    const gradeRow: ComciganLessonCell[][][] = [];
    for (let ci = 1; ci < (now[gi]?.length ?? 0); ci++) {
      const classRow: ComciganLessonCell[][] = [];
      for (let di = 1; di < (now[gi][ci]?.length ?? 0); di++) {
        const dayRow: ComciganLessonCell[] = [];
        for (let pi = 1; pi < (now[gi][ci][di]?.length ?? 0); pi++) {
          const rawNow = now[gi][ci][di][pi];
          const rawOrigin = original[gi]?.[ci]?.[di]?.[pi];
          const pNow = parsePeriodCode(rawNow);
          const pOrigin = parsePeriodCode(rawOrigin);
          const changed = comciganCellChanged(
            rawNow,
            rawOrigin,
            pNow,
            pOrigin,
            changeNotifications,
          );
          const useOriginForDisplay =
            changeNotifications &&
            !isComciganMarkedChange(rawNow) &&
            pNow === 0 &&
            pOrigin > 0;
          const nowCell = decodePeriodCell(
            useOriginForDisplay ? rawOrigin : rawNow,
            teachers,
            subjects,
            teachersLen,
          );
          const cell: ComciganLessonCell = {
            subject: nowCell.subject,
            teacher: nowCell.teacher,
            teacherIndex: nowCell.teacherIndex,
            changed,
          };
          if (pOrigin > 0) {
            const origCell = decodePeriodCell(
              rawOrigin,
              teachers,
              subjects,
              teachersLen,
            );
            cell.originalSubject = origCell.subject;
            cell.originalTeacher = origCell.teacher;
            if (origCell.teacherIndex >= 0) {
              cell.originalTeacherIndex = origCell.teacherIndex;
            }
          }
          dayRow.push(cell);
        }
        classRow.push(dayRow);
      }
      gradeRow.push(classRow);
    }
    result.push(gradeRow);
  }

  return result;
}

function isComciganTeacherName(name: unknown): name is string {
  return typeof name === "string" && name.length > 1 && name !== "*";
}

export function buildComciganTeacherOptions(
  teachers: string[],
): ComciganTeacherOption[] {
  const nameCounts = new Map<string, number>();
  for (let index = 0; index < teachers.length; index++) {
    const name = teachers[index];
    if (!isComciganTeacherName(name)) continue;
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }
  const options: ComciganTeacherOption[] = [];
  for (let index = 0; index < teachers.length; index++) {
    const name = teachers[index];
    if (!isComciganTeacherName(name)) continue;
    const duplicate = (nameCounts.get(name) ?? 0) > 1;
    options.push({
      index,
      name,
      label: duplicate ? `${name} (#${index})` : name,
    });
  }
  return options;
}

export function listTeachersFromTimetableJson(
  jsonText: string,
  teacherCode: string,
): ComciganTeacherOption[] {
  const data = JSON.parse(jsonText) as RawTimetableJson;
  const teachers = decodeComciganTeachers(data[`자료${teacherCode}`]);
  if (!teachers.length) return [];
  return buildComciganTeacherOptions(teachers);
}

export function teachersFromTimetableJson(
  jsonText: string,
  teacherCode: string,
): string[] {
  const data = JSON.parse(jsonText) as RawTimetableJson;
  return decodeComciganTeachers(data[`자료${teacherCode}`]);
}

export function listClassesFromFull(
  full: ComciganLessonCell[][][][],
  labelForCode: (classCode: string) => string,
): ComciganClassOption[] {
  const options: ComciganClassOption[] = [];
  for (let g = 0; g < full.length; g++) {
    const grade = full[g];
    for (let c = 0; c < grade.length; c++) {
      const classCode = String((g + 1) * 100 + (c + 1));
      options.push({
        classCode,
        label: labelForCode(classCode),
      });
    }
  }
  return options;
}

export function resolveComciganClassIndices(
  full: ComciganLessonCell[][][][],
  classCode: string,
): { gradeIndex: number; classIndex: number } | { error: string } {
  const trimmed = classCode.trim();
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 100) {
    return { error: "학급을 선택해 주세요." };
  }
  const grade = Math.floor(n / 100);
  const classNum = n % 100;
  if (grade < 1 || classNum < 1) {
    return { error: "학급을 선택해 주세요." };
  }
  const gradeIndex = grade - 1;
  const classIndex = classNum - 1;
  if (!full[gradeIndex]?.[classIndex]) {
    return { error: "선택한 학급을 시간표에서 찾지 못했습니다." };
  }
  return { gradeIndex, classIndex };
}

export function resolveComciganTeacherIndex(
  teachers: string[],
  teacherName: string,
  storedIndex: number,
): number | { error: string } {
  const name = teacherName.trim();
  if (!name) {
    return { error: "교사를 선택해 주세요." };
  }

  if (
    Number.isInteger(storedIndex) &&
    storedIndex >= 0 &&
    storedIndex < teachers.length
  ) {
    const at = teachers[storedIndex]?.trim() ?? "";
    if (at === name) return storedIndex;
  }

  const matches: number[] = [];
  for (let i = 0; i < teachers.length; i++) {
    if (teachers[i]?.trim() === name) matches.push(i);
  }
  if (matches.length === 1) return matches[0]!;
  if (matches.length === 0) {
    return { error: "선택한 교사를 시간표에서 찾지 못했습니다." };
  }
  return {
    error:
      "같은 이름의 교사가 여러 명입니다. 설정에서 교사를 다시 선택해 주세요.",
  };
}
