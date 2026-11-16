import { createDecipheriv, createHash, createHmac } from "node:crypto";

function parseJsonObject(text: string): Record<string, unknown> {
  const value = JSON.parse(text) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid JSON response");
  }
  return value as Record<string, unknown>;
}

export function decodeComciganResponse(
  text: string,
  key: Buffer | null,
  version: string | null,
): Record<string, unknown> {
  const trimmed = text.replace(/\0/g, "").trimEnd();
  if (!key) {
    return parseJsonObject(trimmed);
  }
  const encVersion = version ?? "enc5";
  const fields = trimmed.split(":");
  if (fields.length !== 4 || fields[0] !== encVersion) {
    throw new Error("Encrypted response protocol mismatch");
  }

  const parts = fields.slice(1).map((field) => Buffer.from(field, "base64"));
  const [iv, ciphertext, tag] = parts;
  if (
    iv.length !== 16 ||
    tag.length !== 32 ||
    ciphertext.length === 0 ||
    ciphertext.length % 16 !== 0
  ) {
    throw new Error("Invalid encrypted response length");
  }

  const authenticated = `${fields[0]}:${fields[1]}:${fields[2]}`;
  const hmacKey = createHash("sha256").update(key).digest();
  const expected = createHmac("sha256", hmacKey)
    .update(authenticated)
    .digest();
  if (!expected.equals(tag)) {
    throw new Error("Encrypted response authentication failed");
  }

  const decipher = createDecipheriv(
    `aes-${key.length * 8}-cbc`,
    key,
    iv,
  );
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    .toString("utf8")
    .replace(/\0/g, "");
  return parseJsonObject(plain);
}
