import iconv from "iconv-lite";

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

export function decodeComciResponseText(buf: Buffer): string {
  const utf8 = buf.toString("utf8");
  if (utf8.includes("자료") || utf8.includes("학교검색")) {
    return utf8.replace(/\0/g, "");
  }
  return iconv.decode(buf, "euc-kr").replace(/\0/g, "");
}

export function parseSchoolSearch(jsonText: string): ComciganSchoolRow[] {
  const data = JSON.parse(jsonText) as {
    학교검색?: [number, string, string, number][];
  };
  const rows = data.학교검색 ?? [];
  return rows.map(([regionCode, regionName, schoolName, schoolCode]) => ({
    regionCode,
    regionName,
    schoolName,
    schoolCode,
  }));
}

type RawTimetableJson = Record<string, unknown>;

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
  const teachers = data[`자료${codes.teacherCode}`] as string[];
  const subjects = data[`자료${codes.subjectCode}`] as string[];
  const original = data[`자료${codes.originalCode}`] as number[][][][];
  const now = data[`자료${codes.dayCode}`] as number[][][][];

  if (!teachers?.length || !subjects?.length || !original || !now) {
    throw new Error("컴시간 시간표 응답을 읽지 못했습니다.");
  }

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
          const changed =
            rawNow !== rawOrigin && (pNow !== pOrigin || String(rawNow) !== String(rawOrigin));
          const nowCell = decodePeriodCell(
            rawNow,
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
  const teachers = data[`자료${teacherCode}`] as string[] | undefined;
  if (!teachers) return [];
  return buildComciganTeacherOptions(teachers);
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
