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

function sameMasterShift(
  a: EmployeeRow["shift_data"],
  b: EmployeeRow["shift_data"],
) {
  if (!a || !b) return a === b;
  return (
    a.emp_id === b.emp_id &&
    a.device_emp_id === b.device_emp_id &&
    a.department === b.department &&
    a.source_department === b.source_department &&
    a.agency === b.agency &&
    a.shift_code === b.shift_code &&
    a.shift_start === b.shift_start &&
    a.shift_end === b.shift_end
  );
}

export function normalizeMasterDate(raw: unknown, formatted = "") {
  let year: number, month: number, day: number;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const date = XLSX.SSF.parse_date_code(raw);
    if (!date) return "";
    ({ y: year, m: month, d: day } = date);
  } else {
    const value = String(raw ?? formatted).trim();
    const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const slash = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (iso) {
      year = Number(iso[1]);
      month = Number(iso[2]);
      day = Number(iso[3]);
    } else if (slash) {
      const first = Number(slash[1]);
      const second = Number(slash[2]);
      const y = Number(slash[3]);
      year = y < 100 ? 2000 + y : y;
      month = first > 12 ? second : first;
      day = first > 12 ? first : second;
    } else return "";
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

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
    source["เริ่มงาน"] = normalizeMasterDate(r[9], source["เริ่มงาน"]);
    source["วันที่ออก"] = normalizeMasterDate(r[19], source["วันที่ออก"]);
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
            department: normalizeDepartment(source.Section || source["แผนก"]),
            source_department: normalizeDepartment(source.Section || source["แผนก"]),
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
      // Duplicate rows may differ only in display-name formatting (such as
      // an honorific). Keep the usable plan unless scheduling fields conflict.
      const conflict = !sameMasterShift(old.shift_data, item.shift_data);
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
