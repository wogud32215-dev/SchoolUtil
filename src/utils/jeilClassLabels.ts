import type { ComciganClassLabelMode } from "@/types/state";

/** 제일고(농업계) 학급 번호 → 학과 약칭·반 (1~3학년 동일 학급 체계) */
const CLASS_DEPT: ReadonlyArray<{ abbrev: string; seq: number }> = [
  { abbrev: "농토", seq: 1 },
  { abbrev: "원예", seq: 1 },
  { abbrev: "식가", seq: 1 },
  { abbrev: "기계", seq: 1 },
  { abbrev: "기계", seq: 2 },
  { abbrev: "기계", seq: 3 },
  { abbrev: "전자", seq: 1 },
  { abbrev: "전자", seq: 2 },
  { abbrev: "전자", seq: 3 },
  { abbrev: "요업", seq: 1 },
  { abbrev: "보통", seq: 1 },
  { abbrev: "보통", seq: 2 },
  { abbrev: "보통", seq: 3 },
  { abbrev: "보통", seq: 4 },
];

export type ParsedClassCode = { grade: number; classNum: number };

export function parseClassCode(classCode: string): ParsedClassCode | null {
  const trimmed = classCode.trim();
  if (!trimmed) return null;

  const hyphen = trimmed.match(/^(\d)\s*-\s*(\d{1,2})$/);
  if (hyphen) {
    const grade = Number(hyphen[1]);
    const classNum = Number(hyphen[2]);
    if (grade >= 1 && grade <= 3 && classNum >= 1) {
      return { grade, classNum };
    }
    return null;
  }

  const n = Number(trimmed);
  if (Number.isFinite(n) && n >= 100) {
    const grade = Math.floor(n / 100);
    const classNum = n % 100;
    if (grade >= 1 && grade <= 3 && classNum >= 1) {
      return { grade, classNum };
    }
  }

  return null;
}

/** 일반고: 컴시간 학급 코드 → N학년 M반 */
export function formatGeneralClassLabel(classCode: string): string | null {
  const parsed = parseClassCode(classCode);
  if (!parsed) return null;
  return `${parsed.grade}학년 ${parsed.classNum}반`;
}

/** 예: 204 / 2-4 → 2기계1반 */
export function formatJeilClassLabel(classCode: string): string | null {
  const parsed = parseClassCode(classCode);
  if (!parsed) return null;
  const { grade, classNum } = parsed;
  if (classNum < 1 || classNum > CLASS_DEPT.length) return null;
  const dept = CLASS_DEPT[classNum - 1];
  return `${grade}${dept.abbrev}${dept.seq}반`;
}

function classLabelForMode(
  classCode: string,
  mode: ComciganClassLabelMode,
): string | null {
  if (mode === "jeil") {
    return formatJeilClassLabel(classCode);
  }
  return formatGeneralClassLabel(classCode);
}

/** 표시용: 모드에 맞는 반명, 아니면 원문 */
export function formatClassCodeDisplay(
  classCode: string,
  mode: ComciganClassLabelMode = "jeil",
): string {
  const label = classLabelForMode(classCode, mode);
  if (label) return label;
  const trimmed = classCode.trim();
  return trimmed;
}

/** 칩·목록: 반명 + 과목 */
export function formatLessonForDisplay(
  classCode: string,
  subject: string,
  mode: ComciganClassLabelMode = "jeil",
): string {
  const sub = subject.trim();
  const code = classCode.trim();
  if (!code) return sub;
  const label = formatClassCodeDisplay(code, mode);
  return sub ? `${label} ${sub}` : label;
}

const CELL_SUFFIX_RE =
  /\s*(\((?:교체·원:[^)]*|교체|빠짐)[^)]*\))\s*$/;

function formatCompactLessonToken(
  token: string,
  mode: ComciganClassLabelMode,
): string {
  const m = token.match(/^(\d{2,3})(.*)$/);
  if (!m) return token;
  const label = classLabelForMode(m[1], mode);
  if (!label) return token;
  const rest = m[2].trim();
  return rest ? `${label} ${rest}` : label;
}

/** 그리드 셀 문자열 (예: 213역학, 204물리 (교체·원:…)) */
export function formatTimetableCellText(
  cell: string,
  mode: ComciganClassLabelMode = "jeil",
): string {
  const trimmed = cell.trim();
  if (!trimmed) return trimmed;

  const suffixMatch = trimmed.match(CELL_SUFFIX_RE);
  const suffix = suffixMatch ? ` ${suffixMatch[1]}` : "";
  const main = suffixMatch
    ? trimmed.slice(0, suffixMatch.index).trim()
    : trimmed;

  const parts = main.split(/\s+/).map((t) => formatCompactLessonToken(t, mode));
  return `${parts.join(" ")}${suffix}`;
}
