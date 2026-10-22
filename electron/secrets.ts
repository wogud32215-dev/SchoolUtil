import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";

type SecretsFile = {
  v: 1;
  neisApiKeyEnc?: string;
};

const filePath = (): string =>
  path.join(app.getPath("userData"), "schoolutil-secrets.json");

function readFile(): SecretsFile {
  try {
    const raw = fs.readFileSync(filePath(), "utf8");
    const json = JSON.parse(raw) as SecretsFile;
    if (json?.v === 1) return json;
  } catch {
    /* 없음 */
  }
  return { v: 1 };
}

function writeFile(data: SecretsFile): void {
  fs.mkdirSync(path.dirname(filePath()), { recursive: true });
  fs.writeFileSync(filePath(), JSON.stringify(data, null, 2), "utf8");
}

export function getNeisApiKey(): string {
  const data = readFile();
  const enc = data.neisApiKeyEnc;
  if (!enc) return "";
  if (!safeStorage.isEncryptionAvailable()) return "";
  try {
    const buf = Buffer.from(enc, "base64");
    return safeStorage.decryptString(buf);
  } catch {
    return "";
  }
}

export function setNeisApiKey(plain: string): void {
  const trimmed = plain.trim();
  if (!trimmed) {
    writeFile({ v: 1 });
    return;
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("이 PC에서 API 키를 안전하게 저장할 수 없습니다.");
  }
  const enc = safeStorage.encryptString(trimmed).toString("base64");
  writeFile({ v: 1, neisApiKeyEnc: enc });
}

/** JSON에 평문 키가 남아 있으면 암호화 저장소로 옮긴다. */
export function migratePlaintextNeisKey(plainFromSettings: string): void {
  const existing = getNeisApiKey();
  if (existing) return;
  const plain = plainFromSettings.trim();
  if (!plain) return;
  if (!safeStorage.isEncryptionAvailable()) return;
  setNeisApiKey(plain);
}

export function stripNeisKeyForDisk<T extends { neisApiKey?: string }>(
  settings: T,
): T {
  return { ...settings, neisApiKey: "" };
}
