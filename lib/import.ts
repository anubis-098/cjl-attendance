import * as XLSX from "xlsx";
import { Data, Punch, Shift } from "./engine";
import { normalizeDayCode } from "./day-codes";
async function rows(file: File): Promise<Record<string, unknown>[]> {
  if (file.size > 10 * 1024 * 1024) throw Error("ไฟล์ต้องมีขนาดไม่เกิน 10 MB");
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: "array",
    cellDates: false,
  });
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
    raw: false,
    defval: "",
  });
}
const value = (r: Record<string, unknown>, k: string) =>
  String(r[k] ?? "").trim();
export async function importFiles(master: File, raw: File): Promise<Data> {
  const [masters, punches] = await Promise.all([rows(master), rows(raw)]);
  if (!masters.length || !punches.length)
    throw Error("ไฟล์ต้องมีข้อมูลอย่างน้อย 1 แถว");
  const seen = new Set<string>();
  const shifts: Shift[] = masters.map((r, i) => {
    const get = (k: string) => value(r, k);
    for (const field of [
      "emp_id",
      "emp_name",
      "department",
      "date",
      "shift_code",
    ])
      if (!get(field)) throw Error(`Master แถว ${i + 2}: ไม่พบ ${field}`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(get("date")) ||
      !Number.isFinite(Date.parse(get("date"))) ||
      new Date(get("date")).toISOString().slice(0, 10) !== get("date")
    )
      throw Error(`Master แถว ${i + 2}: date ต้องเป็น YYYY-MM-DD`);
    for (const field of ["shift_start", "shift_end"])
      if (
        get("shift_code") !== "OFF" &&
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(get(field))
      )
        throw Error(`Master แถว ${i + 2}: ${field} ต้องเป็น HH:mm`);
    const ot = Number(get("requested_ot_hrs"));
    if (!Number.isFinite(ot) || ot < 0 || ot > 12)
      throw Error(`Master แถว ${i + 2}: OT ต้องอยู่ระหว่าง 0–12 ชั่วโมง`);
    const key = get("emp_id") + "|" + get("date");
    if (seen.has(key)) throw Error(`Master แถว ${i + 2}: พนักงานและวันที่ซ้ำ`);
    seen.add(key);
    return {
      emp_id: get("emp_id"),
      emp_name: get("emp_name"),
      worker_type: normalizeWorkerType(get("worker_type")),
      department: normalizeDepartment(get("department")),
      agency: get("agency") || "Agency",
      device_emp_id: get("device_emp_id") || get("emp_id"),
      date: get("date"),
      shift_code: normalizeDayCode(get("shift_code")),
      shift_start: get("shift_start") || "08:00",
      shift_end: get("shift_end") || "17:00",
      requested_ot_hrs: ot,
      ot_task_target: get("ot_task_target"),
    };
  });
  const ids = new Set(shifts.map((s) => s.device_emp_id));
  const logs: Punch[] = punches.map((r, i) => {
    const id = value(r, "device_emp_id"),
      timestamp = value(r, "punch_timestamp").replace(" ", "T"),
      kind = value(r, "punch_type").replace("CHECK_", "") || "UNKNOWN";
    if (!ids.has(id))
      throw Error(
        `Punch แถว ${i + 2}: ไม่พบรหัสเครื่อง ${id} ใน Master (ระบุ device_emp_id ให้ตรงกัน)`,
      );
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(timestamp) ||
      !Number.isFinite(Date.parse(timestamp + "+07:00"))
    )
      throw Error(`Punch แถว ${i + 2}: เวลาไม่ถูกต้อง ใช้ YYYY-MM-DD HH:mm:ss`);
    if (!["IN", "OUT", "UNKNOWN"].includes(kind))
      throw Error(`Punch แถว ${i + 2}: punch_type ไม่ถูกต้อง`);
    return {
      device_emp_id: id,
      punch_timestamp: timestamp,
      punch_type: kind as Punch["punch_type"],
    };
  });
  return { shifts, punches: logs, reviews: {}, audit: [] };
}
import { normalizeWorkerType } from "./worker-type";
import { normalizeDepartment } from "./departments";
