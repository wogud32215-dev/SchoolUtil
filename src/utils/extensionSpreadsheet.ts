import type {
  ExtensionContact,
  ExtensionDirectory,
  ExtensionSection,
} from "../types/extensions";

export type ExtensionImportRow = {
  areaLabel: string;
  department: string;
  label: string;
  extension: string;
};

export type ExtensionImportMode = "merge" | "replace";

export type ExtensionImportResult = {
  next: ExtensionDirectory;
  added: number;
  skipped: number;
  invalid: number;
};

const MAX_AREA = 40;
const MAX_DEPT = 60;
const MAX_LABEL = 80;
const MAX_EXT = 12;

function clamp(value: string, max: number): string {
  return value.trim().slice(0, max);
}

function contactKey(label: string, extension: string): string {
  return `${label}\0${extension}`;
}

function sectionKey(areaLabel: string, department: string): string {
  return `${areaLabel}\0${department}`;
}

function normalizeRow(raw: ExtensionImportRow): ExtensionImportRow | null {
  const department = clamp(raw.department, MAX_DEPT);
  const label = clamp(raw.label, MAX_LABEL);
  const extension = clamp(raw.extension, MAX_EXT).replace(/\s+/g, "");
  const areaLabel = clamp(raw.areaLabel, MAX_AREA) || "기타";
  if (!department || !label || !extension) return null;
  return { areaLabel, department, label, extension };
}

function buildSectionsFromRows(rows: ExtensionImportRow[]): ExtensionSection[] {
  const order: string[] = [];
  const byKey = new Map<string, ExtensionSection>();

  for (const raw of rows) {
    const row = normalizeRow(raw);
    if (!row) continue;
    const key = sectionKey(row.areaLabel, row.department);
    let sec = byKey.get(key);
    if (!sec) {
      const sortOrder = (order.length + 1) * 10;
      sec = {
        id: crypto.randomUUID(),
        areaLabel: row.areaLabel,
        department: row.department,
        sortOrder,
        contacts: [],
      };
      byKey.set(key, sec);
      order.push(key);
    }
    const dup = sec.contacts.some(
      (c) => contactKey(c.label, c.extension) === contactKey(row.label, row.extension),
    );
    if (dup) continue;
    sec.contacts.push({
      id: crypto.randomUUID(),
      label: row.label,
      extension: row.extension,
    });
  }

  return order
    .map((k) => byKey.get(k))
    .filter((s): s is ExtensionSection => Boolean(s && s.contacts.length > 0));
}

export function directoryToImportRows(
  directory: ExtensionDirectory,
): ExtensionImportRow[] {
  const rows: ExtensionImportRow[] = [];
  const sorted = [...directory.sections].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.department.localeCompare(b.department, "ko"),
  );
  for (const sec of sorted) {
    for (const c of sec.contacts) {
      rows.push({
        areaLabel: sec.areaLabel,
        department: sec.department,
        label: c.label,
        extension: c.extension,
      });
    }
  }
  return rows;
}

export function mergeExtensionImport(
  base: ExtensionDirectory,
  rawRows: ExtensionImportRow[],
  mode: ExtensionImportMode,
): ExtensionImportResult {
  let invalid = 0;
  const validRows: ExtensionImportRow[] = [];
  for (const raw of rawRows) {
    const row = normalizeRow(raw);
    if (!row) {
      invalid += 1;
      continue;
    }
    validRows.push(row);
  }

  if (mode === "replace") {
    const sections = buildSectionsFromRows(validRows);
    return {
      next: { ...base, sections, dataRev: base.dataRev },
      added: validRows.length,
      skipped: 0,
      invalid,
    };
  }

  let added = 0;
  let skipped = 0;
  const sections = base.sections.map((s) => ({
    ...s,
    contacts: [...s.contacts],
  }));
  const indexByKey = new Map<string, number>();
  for (let i = 0; i < sections.length; i++) {
    indexByKey.set(sectionKey(sections[i].areaLabel, sections[i].department), i);
  }

  for (const row of validRows) {
    const key = sectionKey(row.areaLabel, row.department);
    const idx = indexByKey.get(key);
    if (idx !== undefined) {
      const sec = sections[idx];
      const exists = sec.contacts.some(
        (c) => contactKey(c.label, c.extension) === contactKey(row.label, row.extension),
      );
      if (exists) {
        skipped += 1;
        continue;
      }
      const contact: ExtensionContact = {
        id: crypto.randomUUID(),
        label: row.label,
        extension: row.extension,
      };
      sec.contacts.push(contact);
      added += 1;
      continue;
    }

    const sortOrder =
      sections.length > 0
        ? Math.max(...sections.map((s) => s.sortOrder)) + 1
        : 100;
    const sec: ExtensionSection = {
      id: crypto.randomUUID(),
      areaLabel: row.areaLabel,
      department: row.department,
      sortOrder,
      contacts: [
        {
          id: crypto.randomUUID(),
          label: row.label,
          extension: row.extension,
        },
      ],
    };
    sections.push(sec);
    indexByKey.set(key, sections.length - 1);
    added += 1;
  }

  sections.sort(
    (a, b) => a.sortOrder - b.sortOrder || a.department.localeCompare(b.department, "ko"),
  );

  return {
    next: { ...base, sections: sections.filter((s) => s.contacts.length > 0) },
    added,
    skipped,
    invalid,
  };
}