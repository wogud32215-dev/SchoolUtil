import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decryptNeisSharedPayload, encryptNeisSharedKey } from "./neis-shared-crypto";
import { getNeisApiKey } from "./secrets";
import type { AppSettings } from "./store";

export type NeisKeyMode = "none" | "app" | "personal";

export type NeisKeyStatus = {
  mode: NeisKeyMode;
  hasAppKey: boolean;
  hasPersonalKey: boolean;
  canManageAppKey: boolean;
};

const providerFileName = "neis-provider.v1.bin";

function electronDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

function projectRoot(): string {
  return path.join(electronDir(), "..");
}

function devPlainKeyPath(): string {
  return path.join(projectRoot(), "config", "neis-shared.key");
}

function bundledResourcePath(): string {
  return path.join(process.resourcesPath, "neis-shared.v1.bin");
}

function userProviderPath(): string {
  return path.join(app.getPath("userData"), providerFileName);
}

function readKeyFromEncryptedFile(filePath: string): string {
  try {
    const buf = fs.readFileSync(filePath);
    return decryptNeisSharedPayload(buf).trim();
  } catch {
    return "";
  }
}

function readDevPlainKey(): string {
  if (app.isPackaged) return "";
  try {
    return fs.readFileSync(devPlainKeyPath(), "utf8").trim();
  } catch {
    return "";
  }
}

/** 앱에 포함·배포자가 넣은 공용 키 (렌더러로 전달하지 않음) */
export function getAppNeisApiKey(): string {
  const fromUserProvider = readKeyFromEncryptedFile(userProviderPath());
  if (fromUserProvider) return fromUserProvider;

  if (app.isPackaged) {
    const fromBundle = readKeyFromEncryptedFile(bundledResourcePath());
    if (fromBundle) return fromBundle;
    return "";
  }

  const fromBuild = readKeyFromEncryptedFile(
    path.join(projectRoot(), "build", "neis-shared.v1.bin"),
  );
  if (fromBuild) return fromBuild;

  return readDevPlainKey();
}

export function canManageAppNeisKey(): boolean {
  return !app.isPackaged || process.env.SCHOOLUTIL_NEIS_ADMIN === "1";
}

export function getNeisKeyStatus(settings?: AppSettings): NeisKeyStatus {
  const personal =
    getNeisApiKey().trim() || String(settings?.neisApiKey ?? "").trim();
  const appKey = getAppNeisApiKey();
  const hasPersonalKey = Boolean(personal);
  const hasAppKey = Boolean(appKey);
  let mode: NeisKeyMode = "none";
  if (hasAppKey) mode = "app";
  else if (hasPersonalKey) mode = "personal";
  return {
    mode,
    hasAppKey,
    hasPersonalKey,
    canManageAppKey: canManageAppNeisKey(),
  };
}

/** 앱 키 우선, 실패 시 개인 키 재시도용 */
export function listNeisApiKeyCandidates(
  settings?: AppSettings,
  draftPersonalKey?: string,
): string[] {
  const appKey = getAppNeisApiKey();
  const personal =
    String(draftPersonalKey ?? "").trim() ||
    String(settings?.neisApiKey ?? "").trim() ||
    getNeisApiKey().trim();
  const keys: string[] = [];
  if (appKey) keys.push(appKey);
  if (personal && personal !== appKey) keys.push(personal);
  return keys;
}

export function settingsWithResolvedNeisKey(
  settings: AppSettings,
  apiKey: string,
): AppSettings {
  return { ...settings, neisApiKey: apiKey };
}

export function isNeisKeyRetryableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("api") ||
    m.includes("key") ||
    m.includes("인증") ||
    m.includes("키") ||
    m.includes("한도") ||
    m.includes("quota") ||
    m.includes("error-290") ||
    m.includes("error-300") ||
    m.includes("error-336") ||
    m.includes("info-100")
  );
}

export async function withNeisApiKeyFallback<T extends { ok: boolean; error?: string }>(
  settings: AppSettings,
  draftPersonalKey: string | undefined,
  run: (key: string) => Promise<T>,
): Promise<T> {
  const keys = listNeisApiKeyCandidates(settings, draftPersonalKey);
  if (keys.length === 0) {
    return {
      ok: false,
      error:
        "NEIS를 사용할 수 없습니다. 학교를 선택했는지 확인하거나, 설정에서 본인 NEIS 키를 입력해 보세요.",
    } as T;
  }

  let last: T | null = null;
  for (let i = 0; i < keys.length; i++) {
    const res = await run(keys[i]);
    if (res.ok) return res;
    last = res;
    const err = String(res.error ?? "");
    const hasNext = i < keys.length - 1;
    if (!hasNext || !isNeisKeyRetryableError(err)) return res;
  }
  return last as T;
}

export function writeAppNeisKeyForAdmin(plain: string): void {
  if (!canManageAppNeisKey()) {
    throw new Error("공용 NEIS 키를 바꿀 권한이 없습니다.");
  }
  const trimmed = plain.trim();
  const payload = encryptNeisSharedKey(trimmed);

  if (!app.isPackaged) {
    const configDir = path.join(projectRoot(), "config");
    fs.mkdirSync(configDir, { recursive: true });
    const keyPath = devPlainKeyPath();
    if (trimmed) {
      fs.writeFileSync(keyPath, `${trimmed}\n`, "utf8");
    } else if (fs.existsSync(keyPath)) {
      fs.unlinkSync(keyPath);
    }
    const buildDir = path.join(projectRoot(), "build");
    fs.mkdirSync(buildDir, { recursive: true });
    const buildPath = path.join(buildDir, "neis-shared.v1.bin");
    if (payload.length) {
      fs.writeFileSync(buildPath, payload);
    } else if (fs.existsSync(buildPath)) {
      fs.unlinkSync(buildPath);
    }
  }

  const providerPath = userProviderPath();
  if (payload.length) {
    fs.writeFileSync(providerPath, payload);
  } else if (fs.existsSync(providerPath)) {
    fs.unlinkSync(providerPath);
  }
}
