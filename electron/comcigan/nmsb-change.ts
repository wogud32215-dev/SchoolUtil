import iconv from "iconv-lite";

/** 컴시간 `QnmsbChange`: 학교명·성명·과목 등 필드 XOR 복호화 (euc-kr) */
const QNMSB_XOR_KEY = Buffer.from([
  80, 125, 46, 69, 63, 93, 67, 55, 85, 100, 49, 35,
]);

const BASE64_FIELD = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function looksLikeQnmsbField(value: string): boolean {
  if (!value || value.length < 4 || value.length % 4 !== 0) return false;
  if (!BASE64_FIELD.test(value)) return false;
  if (/[가-힣]/.test(value)) return false;
  return true;
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

  const out = Buffer.alloc(raw.length);
  for (let i = 0; i < raw.length; i++) {
    out[i] = raw[i]! ^ QNMSB_XOR_KEY[i % QNMSB_XOR_KEY.length]!;
  }
  try {
    return iconv.decode(out, "euc-kr").replace(/\0/g, "");
  } catch {
    return encoded;
  }
}

export function qnmsbChangeNumber(encoded: unknown): number | null {
  const plain = qnmsbChange(encoded).trim();
  if (!plain) return null;
  const n = Number(plain);
  return Number.isFinite(n) ? n : null;
}