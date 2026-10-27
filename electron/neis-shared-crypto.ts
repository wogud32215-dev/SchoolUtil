import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const MAGIC = Buffer.from("SU1");
const IV_LEN = 12;
const TAG_LEN = 16;

function deriveKey(): Buffer {
  return createHash("sha256")
    .update("com.schoolutil.app:neis-shared:v1")
    .digest();
}

export function encryptNeisSharedKey(plain: string): Buffer {
  const trimmed = plain.trim();
  if (!trimmed) return Buffer.alloc(0);
  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, iv, tag, enc]);
}

export function decryptNeisSharedPayload(buf: Buffer): string {
  if (!buf.length) return "";
  if (buf.length < MAGIC.length + IV_LEN + TAG_LEN + 1) return "";
  if (!buf.subarray(0, MAGIC.length).equals(MAGIC)) return "";
  const key = deriveKey();
  const iv = buf.subarray(MAGIC.length, MAGIC.length + IV_LEN);
  const tag = buf.subarray(MAGIC.length + IV_LEN, MAGIC.length + IV_LEN + TAG_LEN);
  const data = buf.subarray(MAGIC.length + IV_LEN + TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}
