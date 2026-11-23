import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "docs", "SchoolUtil-내선번호-양식.xlsx");

const EXTENSION_SHEET_DATA = "입력";
const EXTENSION_SHEET_GUIDE = "안내";
const HEADERS = ["건물·층", "부서·실", "이름 또는 실명", "내선번호"];

const HEADER_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E3A5F" },
};

const SAMPLE_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF1F5F9" },
};

const BORDER_THIN = {
  top: { style: "thin", color: { argb: "FFE2E8F0" } },
  left: { style: "thin", color: { argb: "FFE2E8F0" } },
  bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
  right: { style: "thin", color: { argb: "FFE2E8F0" } },
};

function styleHeaderRow(row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = BORDER_THIN;
  });
}

function styleDataRow(row, sample) {
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

const wb = new ExcelJS.Workbook();
wb.creator = "SchoolUtil";
wb.created = new Date();

const guide = wb.addWorksheet(EXTENSION_SHEET_GUIDE);
guide.columns = [{ width: 72 }];
[
  "SchoolUtil 내선번호 엑셀 양식",
  "",
  "«입력» 시트에 한 줄에 한 명씩 적고, 앱에서 «엑셀 가져오기»를 실행하세요.",
].forEach((text, i) => {
  guide.getRow(i + 1).getCell(1).value = text;
});

const ws = wb.addWorksheet(EXTENSION_SHEET_DATA, {
  views: [{ state: "frozen", ySplit: 1 }],
});
ws.columns = [
  { width: 22 },
  { width: 20 },
  { width: 18 },
  { width: 12 },
];
const header = ws.addRow(HEADERS);
styleHeaderRow(header);
ws.autoFilter = { from: "A1", to: "D1" };

const samples = [
  ["본관 · 1층", "교육행정실", "홍길동", "299"],
  ["본관 · 2층", "교무기획부", "김선생", "210"],
];
for (const row of samples) {
  styleDataRow(ws.addRow(row), true);
}

await wb.xlsx.writeFile(outPath);
console.log("Wrote", outPath);