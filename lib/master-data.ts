import * as XLSX from "xlsx";
import { parseCJTime } from "./import-cj";
import type { Shift } from "./engine";
import { MASTER_HEADERS } from "./source-headers";
import { normalizeDepartment } from "./departments";
import { readMasterSheet } from "./master-headers";
export type EmployeeRow = {
  employee_id: string;
  source_row: number;
  source_data: Record<string, string>;
  shift_data: Omit<
    Shift,
    "date" | "requested_ot_hrs" | "ot_task_target"
  > | null;
  issue: string;
};
export async function readEmployeeFile(file: File): Promise<EmployeeRow[]> {
  if (file.size > 10 * 1024 * 1024) throw Error("ไฟล์ต้องไม่เกิน 10 MB");
  const w = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const s = w.Sheets["Master Name"] || w.Sheets[w.SheetNames[0]];
  const { raw, formatted, headerRow } = readMasterSheet(s);
  const out = new Map<string, EmployeeRow>();
  for (let i = headerRow + 1; i < raw.length; i++) {
    const r = raw[i],
      id = String(r[1] ?? "").trim();
    if (!id) continue;
    const source = Object.fromEntries(
      MASTER_HEADERS.map((h, c) => [h, String(formatted[i]?.[c] ?? "").trim()]),
    );
    const pair = String(r[6]).trim().split(/[-–—]/).map(parseCJTime);
    const start = parseCJTime(String(r[7]).trim() === "" ? pair[0] : r[7]),
      end = parseCJTime(String(r[8]).trim() === "" ? pair[1] : r[8]);
    const issue = !source["ชื่อ-นามสกุล"]
      ? "ไม่มีชื่อพนักงาน"
      : !start ||
          !end ||
          (!!r[6] && (pair.length !== 2 || pair[0] !== start || pair[1] !== end))
        ? "เวลาทำงานไม่ตรง First Time / Last Time"
        : "";
    const item: EmployeeRow = {
      employee_id: id,
      source_row: i + 1,
      source_data: source,
      issue,
      shift_data: issue
        ? null
        : {
            emp_id: id,
            device_emp_id: id,
            emp_name: source["ชื่อ-นามสกุล"],
            department: normalizeDepartment(source["แผนก"]),
            agency: source.Sup,
            shift_code: source["กะทำงาน"],
            shift_start: start!,
            shift_end: end!,
          },
    };
    const old = out.get(id);
    if (old) {
      const duplicates = JSON.parse(old.source_data.__duplicate_rows || "[]");
      duplicates.push({ row: i + 1, data: source });
      old.source_data.__duplicate_rows = JSON.stringify(duplicates);
      const conflict =
        JSON.stringify(old.shift_data) !== JSON.stringify(item.shift_data);
      old.issue = [
        old.issue,
        `รหัสซ้ำแถว ${i + 1}: เก็บข้อมูลต้นฉบับทั้งสองแถวไว้${conflict ? " · ข้อมูลกะขัดแย้ง ไม่ใช้คำนวณ" : " · ข้อมูลกะตรงกัน"}`,
      ]
        .filter(Boolean)
        .join("; ");
      if (conflict) old.shift_data = null;
    } else out.set(id, item);
  }
  if (!out.size) throw Error("ไม่พบข้อมูลพนักงาน");
  return [...out.values()];
}
