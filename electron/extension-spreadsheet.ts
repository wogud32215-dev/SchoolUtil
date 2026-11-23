import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import type { ExtensionDirectory } from "../src/types/extensions";
import {
  directoryToImportRows,
  type ExtensionImportRow,
} from "../src/utils/extensionSpreadsheet";

export const EXTENSION_SHEET_DATA = "입력";
export const EXTENSION_SHEET_GUIDE = "안내";

const HEADERS = ["건물·층", "부서·실", "이름 또는 실명", "내선번호"] as const;

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E3A5F" },
};

const SAMPLE_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF1F5F9" },
};

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFE2E8F0" } },
  left: { style: "thin", color: { argb: "FFE2E8F0" } },
  bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
  right: { style: "thin", color: { argb: "FFE2E8F0" } },
};

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  if (value instanceof Date) return "";
  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text.trim();
  }
  if (typeof value === "object" && "result" in value) {
    return cellText(value.result as ExcelJS.CellValue);
  }
  return String(value).trim();
}

function styleHeaderRow(row: ExcelJS.Row): void {
  row.height = 24;
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = BORDER_THIN;
  });
}

function styleDataRow(row: ExcelJS.Row, sample: boolean): void {
  row.height = 22;
  row.eachCell((cell) => {
    if (sample) {
      cell.fill = SAMPLE_FILL;
      cell.font = { italic: true, color: { argb: "FF64748B" }, size: 11 };
    } else {
      cell.font = { size: 11 };
    }
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = BORDER_THIN;
  });
}

function addGuideSheet(wb: ExcelJS.Workbook): void {
  const ws = wb.addWorksheet(EXTENSION_SHEET_GUIDE, {
    properties: { defaultRowHeight: 20 },
    views: [{ showGridLines: true }],
  });
  ws.columns = [{ width: 72 }];
  const lines = [
    "SchoolUtil 내선번호 엑셀 양식",
    "",
    "1. «입력» 시트에 한 줄에 한 명(또는 한 실)씩 적습니다.",
    "2. 부서·실, 이름, 내선번호는 필수입니다. 건물·층은 비우면 «기타»로 묶입니다.",
    "3. 저장 후 SchoolUtil 내선번호 창 → 편집 → «엑셀 가져오기»를 누릅니다.",
    "4. «기존 목록에 추가»: 중복(같은 부서·이름·번호)은 건너뜁니다.",
    "5. «파일로 전체 교체»: 앱에 있던 내선은 모두 지우고 파일 내용만 반영합니다.",
    "",
    "팁",
    "· «현재 목록 내보내기»로 전체를 엑셀로 받아 수정한 뒤 다시 가져올 수 있습니다.",
    "· 예시 행(회색)은 지우고 입력해도 됩니다.",
    "· CSV로 저장해도 가져올 수 있습니다.",
  ];
  lines.forEach((text, i) => {
    const row = ws.getRow(i + 1);
    row.getCell(1).value = text;
    row.getCell(1).font =
      i === 0
        ? { bold: true, size: 14, color: { argb: "FF1E3A5F" } }
        : { size: 11, color: { argb: "FF334155" } };
  });
}

function addDataSheet(
  wb: ExcelJS.Workbook,
  dataRows: ExtensionImportRow[],
  withSamples: boolean,
): void {
  const ws = wb.addWorksheet(EXTENSION_SHEET_DATA, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = [
    { key: "area", width: 22 },
    { key: "dept", width: 20 },
    { key: "label", width: 18 },
    { key: "ext", width: 12 },
  ];

  const header = ws.addRow([...HEADERS]);
  styleHeaderRow(header);
  ws.autoFilter = { from: "A1", to: "D1" };

  const samples: ExtensionImportRow[] = withSamples
    ? [
        {
          areaLabel: "본관 · 1층",
          department: "교육행정실",
          label: "홍길동",
          extension: "299",
        },
        {
          areaLabel: "본관 · 2층",
          department: "교무기획부",
          label: "김선생",
          extension: "210",
        },
      ]
    : [];

  for (const row of samples) {
    const r = ws.addRow([row.areaLabel, row.department, row.label, row.extension]);
    styleDataRow(r, true);
  }

  for (const row of dataRows) {
    const r = ws.addRow([row.areaLabel, row.department, row.label, row.extension]);
    styleDataRow(r, false);
  }

  const tail = ws.rowCount + 1;
  for (let i = 0; i < 40; i++) {
    const r = ws.getRow(tail + i);
    r.height = 22;
    for (let c = 1; c <= 4; c++) {
      r.getCell(c).border = BORDER_THIN;
    }
  }
}

export async function writeExtensionTemplateFile(filePath: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SchoolUtil";
  wb.created = new Date();
  addGuideSheet(wb);
  addDataSheet(wb, [], true);
  await wb.xlsx.writeFile(filePath);
}

export async function writeExtensionExportFile(
  filePath: string,
  directory: ExtensionDirectory,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SchoolUtil";
  wb.created = new Date();
  addGuideSheet(wb);
  addDataSheet(wb, directoryToImportRows(directory), false);
  await wb.xlsx.writeFile(filePath);
}

function headerIndexMap(headerRow: ExcelJS.Row): Map<string, number> | null {
  const map = new Map<string, number>();
  headerRow.eachCell((cell, col) => {
    const text = cellText(cell.value).toLowerCase();
    if (!text) return;
    if (text.includes("건물") || text.includes("층")) map.set("area", col);
    else if (text.includes("부서") || text.includes("실")) map.set("dept", col);
    else if (text.includes("이름") || text.includes("실명")) map.set("label", col);
    else if (text.includes("내선") || text === "번호") map.set("ext", col);
  });
  if (!map.has("dept") || !map.has("label") || !map.has("ext")) {
    if (headerRow.cellCount >= 4) {
      return new Map([
        ["area", 1],
        ["dept", 2],
        ["label", 3],
        ["ext", 4],
      ]);
    }
    return null;
  }
  if (!map.has("area")) map.set("area", 1);
  return map;
}

function findDataSheet(wb: ExcelJS.Workbook): ExcelJS.Worksheet | null {
  const named = wb.getWorksheet(EXTENSION_SHEET_DATA);
  if (named) return named;
  if (wb.worksheets.length === 0) return null;
  const withoutGuide = wb.worksheets.filter((s) => s.name !== EXTENSION_SHEET_GUIDE);
  return withoutGuide[0] ?? wb.worksheets[0];
}

function parseWorksheet(ws: ExcelJS.Worksheet): ExtensionImportRow[] {
  const rows: ExtensionImportRow[] = [];
  let colMap: Map<string, number> | null = null;
  let dataStart = 2;

  for (let r = 1; r <= Math.min(ws.rowCount, 8); r++) {
    const row = ws.getRow(r);
    const probe = headerIndexMap(row);
    if (probe) {
      colMap = probe;
      dataStart = r + 1;
      break;
    }
  }

  if (!colMap) {
    colMap = new Map([
      ["area", 1],
      ["dept", 2],
      ["label", 3],
      ["ext", 4],
    ]);
    dataStart = 2;
  }

  const areaCol = colMap.get("area") ?? 1;
  const deptCol = colMap.get("dept") ?? 2;
  const labelCol = colMap.get("label") ?? 3;
  const extCol = colMap.get("ext") ?? 4;

  for (let r = dataStart; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const department = cellText(row.getCell(deptCol).value);
    const label = cellText(row.getCell(labelCol).value);
    const extension = cellText(row.getCell(extCol).value);
    const areaLabel = cellText(row.getCell(areaCol).value);
    if (!department && !label && !extension) continue;
    rows.push({ areaLabel, department, label, extension });
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && (ch === "," || ch === "\t")) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function parseCsvText(text: string): ExtensionImportRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const rows: ExtensionImportRow[] = [];
  let start = 0;
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const cells = parseCsvLine(lines[i]);
    const joined = cells.join(" ").toLowerCase();
    if (joined.includes("부서") || joined.includes("내선")) {
      start = i + 1;
      break;
    }
  }
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = parseCsvLine(line);
    if (cells.length < 3) continue;
    const areaLabel = cells[0] ?? "";
    const department = cells[1] ?? "";
    const label = cells.length >= 4 ? (cells[2] ?? "") : (cells[1] ?? "");
    const extension =
      cells.length >= 4 ? (cells[3] ?? "") : (cells[2] ?? "");
    if (cells.length === 3 && !department.match(/\d/) && extension.match(/^\d/)) {
      rows.push({
        areaLabel: "기타",
        department: cells[0] ?? "",
        label: cells[1] ?? "",
        extension: cells[2] ?? "",
      });
      continue;
    }
    rows.push({ areaLabel, department, label, extension });
  }
  return rows;
}

export async function parseExtensionSpreadsheetFile(
  filePath: string,
): Promise<ExtensionImportRow[]> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".csv" || ext === ".txt") {
    const text = fs.readFileSync(filePath, "utf8");
    return parseCsvText(text);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = findDataSheet(wb);
  if (!ws) return [];
  return parseWorksheet(ws);
}