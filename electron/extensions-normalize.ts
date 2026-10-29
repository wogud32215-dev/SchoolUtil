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
  return { sections };
}
