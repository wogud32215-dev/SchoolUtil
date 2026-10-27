import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { PortalId } from "./portal-ids";

type PortalSecretsRow = {
  userEnc?: string;
  passwordEnc?: string;
};

type SecretsFile = {
  v: 1;
  neisApiKeyEnc?: string;
  portals?: Partial<Record<PortalId, PortalSecretsRow>>;
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

function decryptField(enc: string | undefined): string {
  if (!enc) return "";
  if (!safeStorage.isEncryptionAvailable()) return "";
  try {
    const buf = Buffer.from(enc, "base64");
    return safeStorage.decryptString(buf);
  } catch {
    return "";
  }
}

function encryptField(plain: string): string {
  const trimmed = plain.trim();
  if (!trimmed) return "";
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("이 PC에서 비밀 정보를 안전하게 저장할 수 없습니다.");
  }
  return safeStorage.encryptString(trimmed).toString("base64");
}

export function getNeisApiKey(): string {
  const data = readFile();
  return decryptField(data.neisApiKeyEnc);
}

export function setNeisApiKey(plain: string): void {
  const trimmed = plain.trim();
  const data = readFile();
  if (!trimmed) {
    writeFile({ ...data, neisApiKeyEnc: undefined });
    return;
  }
  writeFile({ ...data, neisApiKeyEnc: encryptField(trimmed) });
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

export type PortalCredentials = { user: string; password: string };

export function getPortalCredentials(portalId: PortalId): PortalCredentials {
  const row = readFile().portals?.[portalId];
  return {
    user: decryptField(row?.userEnc),
    password: decryptField(row?.passwordEnc),
  };
}

export function setPortalCredentials(
  portalId: PortalId,
  user: string,
  password: string,
): void {
  const data = readFile();
  const portals = { ...data.portals };
  const userTrim = user.trim();
  const passTrim = password.trim();

  if (!userTrim && !passTrim) {
    delete portals[portalId];
    writeFile({ ...data, portals });
    return;
  }

  const prev = portals[portalId];
  const row: PortalSecretsRow = { ...prev };
  if (userTrim) {
    row.userEnc = encryptField(userTrim);
  } else if (!passTrim) {
    delete row.userEnc;
  }
  if (passTrim) {
    row.passwordEnc = encryptField(passTrim);
  } else if (!userTrim) {
    delete row.passwordEnc;
  }

  portals[portalId] = row;
  writeFile({ ...data, portals });
}

export function getPortalCredentialStatus(
  portalId: PortalId,
): { hasUser: boolean; hasPassword: boolean } {
  const row = readFile().portals?.[portalId];
  return {
    hasUser: Boolean(row?.userEnc),
    hasPassword: Boolean(row?.passwordEnc),
  };
}

type PortalSecretFields = {
  portalNiceUser?: string;
  portalNicePassword?: string;
  portalEdufineUser?: string;
  portalEdufinePassword?: string;
  portalGoeUser?: string;
  portalGoePassword?: string;
};

export function stripPortalSecretsForDisk<T extends PortalSecretFields>(
  settings: T,
): T {
  return {
    ...settings,
    portalNiceUser: "",
    portalNicePassword: "",
    portalEdufineUser: "",
    portalEdufinePassword: "",
    portalGoeUser: "",
    portalGoePassword: "",
  };
}

export function mergePortalSecretsForRuntime<T extends PortalSecretFields>(
  settings: T,
): T {
  const nice = getPortalCredentials("nice");
  const edufine = getPortalCredentials("edufine");
  const goePortal = getPortalCredentials("goePortal");
  return {
    ...settings,
    portalNiceUser: nice.user || settings.portalNiceUser || "",
    portalNicePassword: nice.password || settings.portalNicePassword || "",
    portalEdufineUser: edufine.user || settings.portalEdufineUser || "",
    portalEdufinePassword:
      edufine.password || settings.portalEdufinePassword || "",
    portalGoeUser: goePortal.user || settings.portalGoeUser || "",
    portalGoePassword: goePortal.password || settings.portalGoePassword || "",
  };
}

export function persistPortalSecretsFromSettings(
  settings: PortalSecretFields,
): void {
  applyPortalPair("nice", settings.portalNiceUser, settings.portalNicePassword);
  applyPortalPair(
    "edufine",
    settings.portalEdufineUser,
    settings.portalEdufinePassword,
  );
  applyPortalPair(
    "goePortal",
    settings.portalGoeUser,
    settings.portalGoePassword,
  );
}

function applyPortalPair(
  portalId: PortalId,
  user: string | undefined,
  password: string | undefined,
): void {
  const u = String(user ?? "");
  const p = String(password ?? "");
  const existing = getPortalCredentials(portalId);
  if (!u.trim() && !p.trim()) {
    if (!existing.user && !existing.password) return;
    return;
  }
  const nextUser = u.trim() ? u.trim() : existing.user;
  const nextPass = p.trim() ? p.trim() : existing.password;
  setPortalCredentials(portalId, nextUser, nextPass);
}

/** 위젯에서 아이디·비밀번호를 모두 지운 뒤 저장할 때 호출 */
export function clearPortalCredentials(portalId: PortalId): void {
  setPortalCredentials(portalId, "", "");
}

export function migratePlaintextPortalSecrets(settings: PortalSecretFields): void {
  const nicePlain =
    String(settings.portalNiceUser ?? "").trim() ||
    String(settings.portalNicePassword ?? "").trim();
  const edufinePlain =
    String(settings.portalEdufineUser ?? "").trim() ||
    String(settings.portalEdufinePassword ?? "").trim();
  const goePlain =
    String(settings.portalGoeUser ?? "").trim() ||
    String(settings.portalGoePassword ?? "").trim();
  if (!nicePlain && !edufinePlain && !goePlain) return;
  if (!safeStorage.isEncryptionAvailable()) return;

  const niceStored = getPortalCredentials("nice");
  if (
    !niceStored.user &&
    !niceStored.password &&
    (settings.portalNiceUser?.trim() || settings.portalNicePassword?.trim())
  ) {
    setPortalCredentials(
      "nice",
      settings.portalNiceUser ?? "",
      settings.portalNicePassword ?? "",
    );
  }
  const edufineStored = getPortalCredentials("edufine");
  if (
    !edufineStored.user &&
    !edufineStored.password &&
    (settings.portalEdufineUser?.trim() || settings.portalEdufinePassword?.trim())
  ) {
    setPortalCredentials(
      "edufine",
      settings.portalEdufineUser ?? "",
      settings.portalEdufinePassword ?? "",
    );
  }
  const goeStored = getPortalCredentials("goePortal");
  if (
    !goeStored.user &&
    !goeStored.password &&
    (settings.portalGoeUser?.trim() || settings.portalGoePassword?.trim())
  ) {
    setPortalCredentials(
      "goePortal",
      settings.portalGoeUser ?? "",
      settings.portalGoePassword ?? "",
    );
  }
}
