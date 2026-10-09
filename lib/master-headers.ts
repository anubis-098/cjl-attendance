import * as XLSX from "xlsx";
import { MASTER_HEADERS } from "./source-headers";

const normalize = (value: unknown) => String(value ?? "").normalize("NFKC").toLowerCase().replace(/[\s\uFEFF\u200B._–—-]/g, "");
const aliases: Record<string, string[]> = {
  "รหัส": ["รหัสพนักงาน", "Employee ID", "emp_id"],
  "ชื่อ-นามสกุล": ["ชื่อพนักงาน", "ชื่อ นามสกุล", "Employee Name", "emp_name"],
  "แผนก": ["Department"],
  "คลัง": ["Warehouse"],
  "กะทำงาน": ["กะ", "Shift", "shift_code"],
  "เวลาทำงาน": ["เวลากะ", "Working Time"],
  "First Time": ["เวลาเข้างาน", "เวลาเริ่มกะ", "shift_start", "Start Time"],
  "Last Time": ["เวลาเลิกงาน", "เวลาจบกะ", "shift_end", "End Time"],
  "Sup": ["บริษัท", "Agency", "Supplier"],
};

export function readMasterSheet(sheet: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  if (range.e.r > 10000) throw Error("เกิน 10,000 แถว");
  // Limit columns to the header area; supplied files have stray values near XFC.
  let lastColumn = 0;
  for (const [address, cell] of Object.entries(sheet)) {
    if (address.startsWith("!") || cell.v == null || cell.v === "") continue;
    const position = XLSX.utils.decode_cell(address);
    if (position.r < 20) lastColumn = Math.max(lastColumn, position.c);
  }
  const options = { header: 1 as const, defval: "", range: { s: { r: 0, c: 0 }, e: { r: range.e.r, c: lastColumn } } };
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { ...options, raw: true });
  const formatted = XLSX.utils.sheet_to_json<string[]>(sheet, { ...options, raw: false });
  const known = new Map(MASTER_HEADERS.flatMap((header) => [header, ...(aliases[header] || [])].map((name) => [normalize(name), header] as const)));
  let headerRow = -1;
  let columns = new Map<string, number>();
  for (let row = 0; row < Math.min(raw.length, 20); row++) {
    const found = new Map<string, number>();
    const duplicates: string[] = [];
    raw[row].forEach((value, column) => {
      const header = known.get(normalize(value));
      if (!header) return;
      if (found.has(header)) duplicates.push(header);
      found.set(header, column);
    });
    if (found.size > columns.size) { columns = found; headerRow = row; }
    if (found.has("รหัส") && found.has("ชื่อ-นามสกุล")) {
      if (duplicates.length) throw Error(`Header ซ้ำหรือกำกวม: ${duplicates.join(", ")}`);
      columns = found; headerRow = row; break;
    }
  }
  const missing = ["รหัส", "ชื่อ-นามสกุล", "แผนก", "กะทำงาน", "Sup"].filter((header) => !columns.has(header));
  if (!columns.has("เวลาทำงาน") && !(columns.has("First Time") && columns.has("Last Time"))) missing.push("เวลาทำงาน หรือ First Time + Last Time");
  if (missing.length) throw Error(`ไม่พบคอลัมน์ที่จำเป็น: ${missing.join(", ")}`);
  const remap = <T,>(rows: T[][]) => rows.map((row) => MASTER_HEADERS.map((header) => columns.has(header) ? row[columns.get(header)!] ?? "" : ""));
  return { raw: remap(raw), formatted: remap(formatted), headerRow };
}
