import { MASTER_HEADERS } from "./source-headers";
import { normalizeDepartment } from "./departments";
import { departmentAllowance, payableDailyWage, standaloneOTRates, type PayrollSettings } from "./payroll-settings";
import type { EmployeeRow } from "./master-data";

export const EMPLOYEE_MONEY_HEADERS = ["Cost per head", "OT per hrs.", "OT Holiday", "Shift Allowance", "FF Allowance"];
export const EMPLOYEE_CHOICE_HEADERS = ["แผนก", "คลัง", "กะทำงาน", "Sup", "Area", "Satatus", "Status"];
export function employeeMoneyDefaults(settings: PayrollSettings, department: string, shift: string) {
  const rates = standaloneOTRates(settings);
  const kind = departmentAllowance(department, settings);
  return {
    "Cost per head": payableDailyWage(settings).toFixed(2),
    "OT per hrs.": rates["1.5"].toFixed(2),
    "OT Holiday": rates["3.0"].toFixed(2),
    "Shift Allowance": (shift === "M" ? settings.morning : shift === "A" ? settings.afternoon : shift === "N" ? settings.night : 0).toFixed(2),
    "FF Allowance": (kind === "none" ? 0 : settings[kind]).toFixed(2),
  };
}
export function createEmployeeRow(input: unknown, sequence: number, settings: PayrollSettings): EmployeeRow {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("ข้อมูลพนักงานไม่ถูกต้อง");
  const values = input as Record<string, unknown>;
  const source = Object.fromEntries(MASTER_HEADERS.map(h => {
    const value = values[h] ?? "";
    if (typeof value !== "string" || value.length > 200) throw Error("ข้อมูลพนักงานไม่ถูกต้อง");
    return [h, value.trim()];
  }));
  const id = source["รหัส"];
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw Error("กรุณากรอกรหัสพนักงานเป็นตัวอักษรหรือตัวเลข ไม่เกิน 64 ตัว");
  for (const header of ["ชื่อ-นามสกุล", "แผนก", "คลัง", "กะทำงาน", "Sup"]) if (!source[header]) throw Error(`กรุณาระบุ ${header}`);
  const start = source["First Time"], end = source["Last Time"];
  const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (!validTime(start) || !validTime(end) || start === end) throw Error("กรุณาระบุเวลาเริ่มและสิ้นสุดกะให้ถูกต้อง");
  for (const field of ["เริ่มงาน", "End "]) {
    const date = source[field];
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date)) throw Error("วันที่เริ่มงานหรือสิ้นสุดงานไม่ถูกต้อง");
  }
  if (source["End "] && source["เริ่มงาน"] && source["End "] < source["เริ่มงาน"]) throw Error("วันสิ้นสุดต้องไม่ก่อนวันเริ่มงาน");
  source["ลำดับ"] = String(sequence);
  source["แผนก"] = normalizeDepartment(source["แผนก"]);
  source["เวลาทำงาน"] = `${start} - ${end}`;
  // Monetary master columns are snapshots of current global settings, not payroll overrides.
  Object.assign(source, employeeMoneyDefaults(settings, source["แผนก"], source["กะทำงาน"]));
  return { employee_id:id, source_row:sequence, source_data:source, issue:"", shift_data:{
    emp_id:id, device_emp_id:id, emp_name:source["ชื่อ-นามสกุล"], department:source["แผนก"], agency:source.Sup,
    shift_code:source["กะทำงาน"], shift_start:start, shift_end:end,
  }};
}
