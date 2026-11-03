import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidFeedbackEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

const DEFAULT_FEEDBACK_RECIPIENT = "wogud32215@naver.com";

function projectRoot(): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function readKeyLineFromFile(filePath: string): string {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        return trimmed;
      }
    }
  } catch {
    /* 없음 */
  }
  return "";
}

/** https://web3forms.com Access Key — env > config/web3forms-access.key > 설치본 resources */
function resolveWeb3FormsAccessKey(): string {
  const fromEnv = process.env.SCHOOLUTIL_WEB3FORMS_ACCESS_KEY?.trim() ?? "";
  if (fromEnv.length >= 16) {
    return fromEnv;
  }

  const candidates: string[] = [];
  if (!app.isPackaged) {
    candidates.push(path.join(projectRoot(), "config", "web3forms-access.key"));
  }
  candidates.push(path.join(process.resourcesPath, "web3forms-access.key"));

  for (const filePath of candidates) {
    const key = readKeyLineFromFile(filePath);
    if (key.length >= 16) {
      return key;
    }
  }
  return "";
}

/** `SCHOOLUTIL_FEEDBACK_EMAIL`이 있으면 우선, 없으면 기본 수신 주소. */
export function getFeedbackRecipientEmail(): string | null {
  const raw =
    process.env.SCHOOLUTIL_FEEDBACK_EMAIL?.trim() || DEFAULT_FEEDBACK_RECIPIENT;
  if (!isValidFeedbackEmail(raw)) {
    return null;
  }
  return raw;
}

export function getWeb3FormsAccessKey(): string | null {
  const key = resolveWeb3FormsAccessKey();
  if (key.length >= 16) {
    return key;
  }
  return null;
}
