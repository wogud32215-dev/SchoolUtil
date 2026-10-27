import {
  createCipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const keyPath = path.join(root, "config", "neis-shared.key");
const outPath = path.join(root, "build", "neis-shared.v1.bin");

const MAGIC = Buffer.from("SU1");
const IV_LEN = 12;

function deriveKey() {
  return createHash("sha256")
    .update("com.schoolutil.app:neis-shared:v1")
    .digest();
}

function encrypt(plain) {
  const trimmed = plain.trim();
  if (!trimmed) return Buffer.alloc(0);
  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, iv, tag, enc]);
}

let plain = "";
try {
  plain = fs.readFileSync(keyPath, "utf8");
} catch {
  /* 없음 — 배포본에 공용 키 미포함 */
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
const payload = encrypt(plain);
fs.writeFileSync(outPath, payload.length ? payload : Buffer.alloc(0));
if (payload.length) {
  console.log("[prepare-neis-shared] 공용 NEIS 키를 build/neis-shared.v1.bin 에 넣었습니다.");
} else {
  console.log("[prepare-neis-shared] config/neis-shared.key 없음 — 공용 키 없이 빌드합니다.");
}
