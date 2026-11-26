import iconv from "iconv-lite";

/** 컴시간 `QnmsbChange` (구 enc*) */
const QNMSB_XOR_KEY = Buffer.from([
  80, 125, 46, 69, 63, 93, 67, 55, 85, 100, 49, 35,
]);

/** 컴시간 `K0eiLN` (8701, 일부 필드) */
const K0EI_XOR_KEY = Buffer.from("z7lSivYC3-[<", "utf8");

/** 컴시간 `X73B` (8253 학교검색·성명·과목) */
const X73B_XOR_KEY = Buffer.from(
  String.fromCharCode(100, 58, 126, 108, 122, 98, 106, 67, 49, 57, 66, 117),
  "ascii",
);

/** 컴시간 `ILd5` (3901 응답 — `String.fromCharCode(100,53,53,61,…)`) */
const D3901_XOR_KEY = Buffer.from(
  String.fromCharCode(100, 53, 53, 61, 52, 61, 35, 73, 46, 98, 36, 69),
  "ascii",
);

type XorKeyId = "d3901" | "x73b" | "modern" | "legacy";

const XOR_KEYS: Record<XorKeyId, Buffer> = {
  d3901: D3901_XOR_KEY,
  x73b: X73B_XOR_KEY,
  modern: K0EI_XOR_KEY,
  legacy: QNMSB_XOR_KEY,
};

const ALL_XOR_KEYS: XorKeyId[] = ["d3901", "x73b", "modern", "legacy"];

const BASE64_FIELD = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

/** 컴시간 마스킹 성명 (예: 김*, 박○*) */
const MASKED_TEACHER_NAME =
  /^[가-힣][가-힣○●◯〇*]{0,6}$/;

function looksLikeQnmsbField(value: string): boolean {
  if (!value || value.length < 4 || value.length % 4 !== 0) return false;
  if (!BASE64_FIELD.test(value)) return false;
  if (/[가-힣]/.test(value)) return false;
  return true;
}

function keyOrderForVersion(version: string | null | undefined): XorKeyId[] {
  const v = (version ?? "").trim();
  if (v === "3901") return ["d3901", "x73b", "modern", "legacy"];
  if (v === "8253") return ["x73b", "d3901", "modern", "legacy"];
  if (v === "8701") return ["modern", "d3901", "x73b", "legacy"];
  return ["d3901", "x73b", "modern", "legacy"];
}

function xorFieldDecode(raw: Buffer, key: Buffer): string | null {
  const out = Buffer.alloc(raw.length);
  for (let i = 0; i < raw.length; i++) {
    out[i] = raw[i]! ^ key[i % key.length]!;
  }
  const asciiOnly = out.length > 0 && [...out].every((b) => b >= 32 && b <= 126);
  if (asciiOnly) {
    return out.toString("ascii").replace(/\0/g, "");
  }
  try {
    const euc = iconv.decode(out, "euc-kr").replace(/\0/g, "");
    if (euc && !euc.includes("\uFFFD")) return euc;
  } catch {
    /* ignore */
  }
  const utf8 = out.toString("utf8").replace(/\0/g, "");
  if (utf8 && !utf8.includes("\uFFFD")) return utf8;
  return null;
}

function decodeScore(text: string): number {
  const hangul = text.match(/[가-힣]/g)?.length ?? 0;
  const latin = text.match(/[a-zA-Z]/g)?.length ?? 0;
  const digits = text.match(/\d/g)?.length ?? 0;
  const hanja = text.match(/[\u4E00-\u9FFF]/g)?.length ?? 0;
  const weird =
    text.match(/[^\w\s가-힣○●◯〇*·.,()/\-]/gu)?.length ?? 0;
  let score = hangul * 4 + Math.min(text.length, 40);
  if (text.includes("\uFFFD")) score -= 1000;
  score -= latin * 18;
  score -= digits * 12;
  score -= hanja * 14;
  score -= weird * 22;
  if (MASKED_TEACHER_NAME.test(text.trim())) score += 80;
  if (hangul > 0 && latin === 0 && hanja === 0 && text.length <= 32) {
    score += 12;
  }
  return score;
}

function collectXorDecodes(
  raw: Buffer,
  version?: string | null,
): string[] {
  const ordered = keyOrderForVersion(version);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...ordered, ...ALL_XOR_KEYS]) {
    const text = xorFieldDecode(raw, XOR_KEYS[id]);
    if (!text) continue;
    const key = text.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

/** XOR 오판·깨진 문자열 (교사 목록에서만 제외) */
export function isGarbledComciganTeacherName(text: string): boolean {
  const t = text.trim();
  if (!t || t === "*") return true;
  if (t.includes("\uFFFD")) return true;
  if (/[a-zA-Z]/.test(t)) return true;
  if (/[\u4E00-\u9FFF]/.test(t)) return true;
  if (/\d/.test(t)) return true;
  if (/[‰×³=!@#$%^&]/.test(t)) return true;
  return false;
}

export function qnmsbChangeTeacherField(
  encoded: unknown,
  comciganVersion?: string | null,
): string {
  if (encoded == null || encoded === "") return "";
  if (typeof encoded !== "string") return String(encoded);
  const plain = encoded.trim();
  if (!looksLikeQnmsbField(plain)) return plain;

  let raw: Buffer;
  try {
    raw = Buffer.from(plain, "base64");
  } catch {
    return plain;
  }
  if (raw.length === 0) return "";

  const candidates = collectXorDecodes(raw, comciganVersion);
  if (candidates.length > 0) {
    const best = candidates.reduce((a, b) =>
      decodeScore(a) >= decodeScore(b) ? a : b,
    );
    if (!isGarbledComciganTeacherName(best)) return best.trim();
  }

  const fallback = qnmsbChange(encoded, comciganVersion);
  if (isGarbledComciganTeacherName(fallback)) return "";
  return fallback.trim();
}

export function qnmsbChange(
  encoded: unknown,
  comciganVersion?: string | null,
): string {
  if (encoded == null || encoded === "") return "";
  if (typeof encoded !== "string") return String(encoded);
  if (!looksLikeQnmsbField(encoded)) return encoded;

  let raw: Buffer;
  try {
    raw = Buffer.from(encoded, "base64");
  } catch {
    return encoded;
  }
  if (raw.length === 0) return "";

  const candidates = collectXorDecodes(raw, comciganVersion);
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (/^\d{4,7}$/.test(trimmed)) return trimmed;
  }
  if (candidates.length === 0) return encoded;
  if (candidates.length === 1) return candidates[0]!;
  return candidates.reduce((best, cur) =>
    decodeScore(cur) > decodeScore(best) ? cur : best,
  );
}

export function qnmsbChangeNumber(
  encoded: unknown,
  comciganVersion?: string | null,
): number | null {
  const plain = qnmsbChange(encoded, comciganVersion).trim();
  if (!plain) return null;
  const n = Number(plain);
  return Number.isFinite(n) ? n : null;
}