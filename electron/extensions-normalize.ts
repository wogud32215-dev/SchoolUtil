import { randomUUID } from "node:crypto";
import type {
  ExtensionContact,
  ExtensionDirectory,
  ExtensionSection,
} from "../src/types/extensions";
import { defaultExtensionDirectory } from "../src/data/defaultExtensionDirectory";

const MAX_SECTIONS = 80;
const MAX_CONTACTS = 60;
const MAX_LABEL = 80;
const MAX_EXT = 12;
const MAX_AREA = 40;
const MAX_DEPT = 60;

/** 2026.7.1 내선 안내 PDF(학교 배치도) 기준 — 초기 텍스트 붙여넣기 시 열이 밀린 진학지원부 */
const JINHAK_EXTENSION_FIX: Readonly<Record<string, string>> = {
  김현승: "254",
  이재원: "284",
  전윤주: "251",
  이태영: "252",
  박준규: "324",
};

export const EXTENSION_DATA_REV = 2;

export function extensionDirectoryRevision(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0;
  const rev = (raw as ExtensionDirectory).dataRev;
  return typeof rev === "number" && Number.isFinite(rev) ? rev : 0;
}

function contactId(label: string, extension: string): string {
  return `c-${extension}-${label}`.replace(/\s+/g, "");
}

function applyExtensionDataRevisions(dir: ExtensionDirectory): ExtensionDirectory {
  const rev = typeof dir.dataRev === "number" ? dir.dataRev : 0;
  if (rev >= EXTENSION_DATA_REV) {
    return { ...dir, dataRev: rev };
  }

  let sections = dir.sections;
  if (rev < 2) {
    sections = sections.map((sec) => {
      if (sec.department !== "진학지원부") return sec;
      return {
        ...sec,
        contacts: sec.contacts.map((c) => {
          const fixed = JINHAK_EXTENSION_FIX[c.label];
          if (!fixed || fixed === c.extension) return c;
          return { ...c, extension: fixed, id: contactId(c.label, fixed) };
        }),
      };
    });
  }

  return { sections, dataRev: EXTENSION_DATA_REV };
}

function clampString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.slice(0, max);
}

function normalizeContact(raw: unknown, index: number): ExtensionContact | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as ExtensionContact;
  const label = clampString(row.label, MAX_LABEL);
  const extension = clampString(row.extension, MAX_EXT).replace(/\s+/g, "");
  if (!label || !extension) return null;
  const id = clampString(row.id, 64) || `c-${index}-${randomUUID()}`;
  return { id, label, extension };
}

function normalizeSection(raw: unknown, index: number): ExtensionSection | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as ExtensionSection;
  const department = clampString(row.department, MAX_DEPT);
  const areaLabel = clampString(row.areaLabel, MAX_AREA);
  if (!department) return null;
  const contactsRaw = Array.isArray(row.contacts) ? row.contacts : [];
  const contacts: ExtensionContact[] = [];
  for (let i = 0; i < contactsRaw.length && contacts.length < MAX_CONTACTS; i++) {
    const c = normalizeContact(contactsRaw[i], i);
    if (c) contacts.push(c);
  }
  const sortOrder =
    typeof row.sortOrder === "number" && Number.isFinite(row.sortOrder)
      ? row.sortOrder
      : index * 10;
  const id = clampString(row.id, 64) || `s-${index}-${randomUUID()}`;
  return {
    id,
    areaLabel: areaLabel || "기타",
    department,
    sortOrder,
    contacts,
  };
}

export function normalizeExtensionDirectory(raw: unknown): ExtensionDirectory {
  const base = defaultExtensionDirectory();
  if (!raw || typeof raw !== "object") return base;
  const input = raw as ExtensionDirectory;
  if (!Array.isArray(input.sections) || input.sections.length === 0) {
    return base;
  }
  const sections: ExtensionSection[] = [];
  for (let i = 0; i < input.sections.length && sections.length < MAX_SECTIONS; i++) {
    const sec = normalizeSection(input.sections[i], i);
    if (sec && sec.contacts.length > 0) sections.push(sec);
  }
  if (sections.length === 0) return base;
  sections.sort((a, b) => a.sortOrder - b.sortOrder || a.department.localeCompare(b.department, "ko"));
  return applyExtensionDataRevisions({ sections, dataRev: input.dataRev });
}
