import type { ComciganClassLabelMode } from "../store";

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

function parseClassCode(classCode: string): { grade: number; classNum: number } | null {
  const trimmed = classCode.trim();
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

function formatGeneralClassLabel(classCode: string): string | null {
  const parsed = parseClassCode(classCode);
  if (!parsed) return null;
  return `${parsed.grade}학년 ${parsed.classNum}반`;
}

function formatJeilClassLabel(classCode: string): string | null {
  const parsed = parseClassCode(classCode);
  if (!parsed) return null;
  const { grade, classNum } = parsed;
  if (classNum < 1 || classNum > CLASS_DEPT.length) return null;
  const dept = CLASS_DEPT[classNum - 1];
  return `${grade}${dept.abbrev}${dept.seq}반`;
}

export function labelForComciganClassCode(
  classCode: string,
  mode: ComciganClassLabelMode,
): string {
  if (mode === "jeil") {
    const jeil = formatJeilClassLabel(classCode);
    if (jeil) return jeil;
  } else {
    const general = formatGeneralClassLabel(classCode);
    if (general) return general;
  }
  const trimmed = classCode.trim();
  return trimmed || classCode;
}
