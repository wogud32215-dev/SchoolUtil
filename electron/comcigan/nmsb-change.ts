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

const BASE64_FIELD = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function looksLikeQnmsbField(value: string): boolean {
  if (!value || value.length < 4 || value.length % 4 !== 0) return false;
  if (!BASE64_FIELD.test(value)) return false;
  if (/[가-힣]/.test(value)) return false;
  return true;
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
    const text = iconv.decode(out, "euc-kr").replace(/\0/g, "");
    if (text.includes("\uFFFD")) return null;
    return text;
  } catch {
    return null;
  }
}

function decodeScore(text: string): number {
  const hangul = text.match(/[가-힣]/g)?.length ?? 0;
  const broken = text.includes("\uFFFD") ? -50 : 0;
  return hangul * 4 + text.length + broken;
}

export function qnmsbChange(encoded: unknown): string {
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

  const x73b = xorFieldDecode(raw, X73B_XOR_KEY);
  const legacy = xorFieldDecode(raw, QNMSB_XOR_KEY);
  const modern = xorFieldDecode(raw, K0EI_XOR_KEY);
  for (const candidate of [x73b, modern, legacy]) {
    const trimmed = candidate?.trim() ?? "";
    if (/^\d{4,7}$/.test(trimmed)) return trimmed;
  }
  const candidates = [x73b, legacy, modern].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  if (candidates.length === 0) return encoded;
  if (candidates.length === 1) return candidates[0]!;
  return candidates.reduce((best, cur) =>
    decodeScore(cur) > decodeScore(best) ? cur : best,
  );
}

export function qnmsbChangeNumber(encoded: unknown): number | null {
  const plain = qnmsbChange(encoded).trim();
  if (!plain) return null;
  const n = Number(plain);
  return Number.isFinite(n) ? n : null;
}