import * as XLSX from "xlsx";
import { CALCULATION_VERSION, Data, Punch, Shift } from "./engine";
import { dayCodeLabels, normalizeDayCode, nonWorkingCodes } from "./day-codes";

export type ImportIssue = {
  source: string;
  row: number;
  employee: string;
  date: string;
  reason: string;
};
export type CJImport = {
  data: Data;
  issues: ImportIssue[];
  summary: {
    employees: number;
    rawScans: number;
    duplicateScans: number;
    unmatchedScans: number;
    from: string;
    to: string;
    monthlyOT: number;
  };
};
const text = (v: unknown) => String(v ?? "").trim();
export function parseFingerLog(input: string) {
  const punches: Punch[] = [],
    seen = new Set<string>();
  let duplicateScans = 0;
  for (const [i, line] of input
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .entries()) {
    if (!line.trim()) continue;
    const parts = line.trim().split(/\s+/);
    if (
      parts.length !== 3 ||
      !/^\d{8}$/.test(parts[1]) ||
      !/^\d{4}$/.test(parts[2])
    )
      throw Error(
        `Fingerprint แถว ${i + 1}: ต้องเป็นรหัส วันที่ YYYYMMDD และเวลา HHmm`,
      );
    const [id, d, t] = parts;
    const date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
    if (
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date ||
      +t.slice(0, 2) > 23 ||
      +t.slice(2) > 59
    )
      throw Error(`Fingerprint แถว ${i + 1}: วันที่หรือเวลาไม่ถูกต้อง`);
    const timestamp = `${date}T${t.slice(0, 2)}:${t.slice(2)}:00`,
      key = `${id}|${timestamp}`;
    if (seen.has(key)) {
      duplicateScans++;
      continue;
    }
    seen.add(key);
    punches.push({
      device_emp_id: id,
      punch_timestamp: timestamp,
      punch_type: "UNKNOWN",
    });
  }
  if (!punches.length) throw Error("ไม่พบข้อมูลสแกนนิ้ว");
  punches.sort((a, b) => a.punch_timestamp.localeCompare(b.punch_timestamp));
  return { punches, duplicateScans };
}
export function parseCJTime(value: unknown): string | null {
  if (typeof value === "number" && value >= 0 && value < 1) {
    const mins = Math.round(value * 1440) % 1440;
    return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  }
  const match = text(value).match(/^(\d{1,2})[.:](\d{2})$/);
  if (
    !match ||
    +match[1] > 24 ||
    +match[2] > 59 ||
    (+match[1] === 24 && +match[2] !== 0)
  )
    return null;
  return `${String(+match[1] % 24).padStart(2, "0")}:${match[2]}`;
}
async function workbook(file: File) {
  if (file.size > 10 * 1024 * 1024) throw Error("ไฟล์ต้องมีขนาดไม่เกิน 10 MB");
  return XLSX.read(await file.arrayBuffer(), { type: "array" });
}
// Bound the range: the supplied workbook formats otherwise empty columns through XFC.
function matrix(sheet: XLSX.WorkSheet, columns: number) {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  if (range.e.r > 10000) throw Error("ไฟล์มีแถวเกิน 10,000 แถว");
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: "",
    range: { s: { r: 0, c: 0 }, e: { r: range.e.r, c: columns - 1 } },
  });
}

export async function importCJFiles(
  master: File,
  raw: File,
  attendance: File,
): Promise<CJImport> {
  if (raw.size > 10 * 1024 * 1024) throw Error("ไฟล์ต้องมีขนาดไม่เกิน 10 MB");
  const [mw, aw, input] = await Promise.all([
    workbook(master),
    workbook(attendance),
    raw.text(),
  ]);
  const masterSheet = mw.Sheets["Master Name"];
  const attendanceSheet = aw.Sheets["3) Time Attendance From Agency"];
  if (!masterSheet || !attendanceSheet)
    throw Error("ต้องใช้ชีต Master Name และ 3) Time Attendance From Agency");
  const issues: ImportIssue[] = [];
  const issue = (
    source: string,
    row: number,
    employee: string,
    date: string,
    reason: string,
  ) => issues.push({ source, row, employee, date, reason });
  const employees = new Map<
    string,
    Omit<Shift, "date" | "requested_ot_hrs" | "ot_task_target">
  >();
  const blocked = new Set<string>();
  const masterRows = matrix(masterSheet, 21);
  for (let i = 1; i < masterRows.length; i++) {
    const r = masterRows[i],
      id = text(r[1]);
    if (!id) continue;
    const start = parseCJTime(r[7]),
      end = parseCJTime(r[8]);
    const pair = text(r[6]).split(/[-–]/).map(parseCJTime);
    if (
      !start ||
      !end ||
      pair.length !== 2 ||
      pair[0] !== start ||
      pair[1] !== end
    ) {
      blocked.add(id);
      issue(
        "Master Name",
        i + 1,
        id,
        "",
        "เวลากะไม่ถูกต้อง หรือ First/Last Time ไม่ตรงเวลาทำงาน",
      );
      continue;
    }
    if (text(r[7]).startsWith("24")) {
      blocked.add(id);
      issue(
        "Master Name",
        i + 1,
        id,
        "",
        "เวลาเริ่ม 24.00 ต้องยืนยันว่าเป็นวันเดียวกันหรือวันถัดไป",
      );
      continue;
    }
    const employee = {
      emp_id: id,
      device_emp_id: id,
      emp_name: text(r[2]),
      department: normalizeDepartment(text(r[3])),
      agency: text(r[12]),
      shift_code: text(r[5]),
      shift_start: start,
      shift_end: end,
    };
    const previous = employees.get(id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(employee)) {
      blocked.add(id);
      issue("Master Name", i + 1, id, "", "รหัสซ้ำแต่ข้อมูลต่างกัน");
    } else if (previous)
      issue("Master Name", i + 1, id, "", "รวมแถวซ้ำที่ข้อมูลตรงกัน");
    else employees.set(id, employee);
  }
  for (const id of blocked) employees.delete(id);
  const parsed = parseFingerLog(input),
    from = parsed.punches[0].punch_timestamp.slice(0, 10),
    to = parsed.punches.at(-1)!.punch_timestamp.slice(0, 10);
  const unmatched = new Map<string, number>();
  for (const p of parsed.punches)
    if (!employees.has(p.device_emp_id))
      unmatched.set(p.device_emp_id, (unmatched.get(p.device_emp_id) || 0) + 1);
  for (const [id, count] of unmatched)
    issue(
      "Fingerprint",
      0,
      id,
      "",
      `ไม่พบ Master ที่ใช้ได้: ${count} สแกน (เก็บไว้ในข้อมูลดิบ)`,
    );
  const rows = matrix(attendanceSheet, 69),
    header = rows.findIndex(
      (r) => text(r[0]) === "Employee ID" && text(r[11]) === "Working Time",
    );
  if (header < 0) throw Error("ไม่พบหัวตาราง Attendance");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const dates = rows[header]
    .map((v, c) => {
      const match = text(v).match(/^(\d{1,2})-([A-Za-z]{3})$/);
      if (!match) return null;
      const month = months.indexOf(match[2]) + 1;
      if (!month) return null;
      const candidates = [
        +from.slice(0, 4) - 1,
        +from.slice(0, 4),
        +from.slice(0, 4) + 1,
      ].map(
        (year) =>
          `${year}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}`,
      );
      const date = candidates.find((d) => d >= from && d <= to);
      return date ? { c, date } : null;
    })
    .filter((d): d is { c: number; date: string } => !!d);
  if (!dates.length) throw Error("วันที่ใน Attendance ไม่ตรงช่วงข้อมูลสแกน");
  const shifts: Shift[] = [],
    keys = new Set<string>();
  let monthlyOT = 0;
  for (let i = header + 1; i < rows.length; i++) {
    const r = rows[i],
      id = text(r[0]);
    if (!id || !text(r[1])) continue;
    monthlyOT += [12, 14, 16, 18].reduce(
      (sum, c) => sum + (Number(r[c]) || 0),
      0,
    );
    const employee = employees.get(id);
    if (!employee) {
      issue("Attendance", i + 1, id, "", "ไม่พบรหัสใน Master ที่ใช้ได้");
      continue;
    }
    for (const { c, date } of dates) {
      const originalCode = text(r[c]).toUpperCase();
      const code = normalizeDayCode(originalCode);
      if (!code) continue;
      if (!Object.hasOwn(dayCodeLabels, code)) {
        issue("Attendance", i + 1, id, date, `รอยืนยันโค้ด ${code}`);
        continue;
      }
      if (["M", "A", "N", "D"].includes(code) && code !== employee.shift_code) {
        issue(
          "Attendance",
          i + 1,
          id,
          date,
          `กะ ${code} ต่างจาก Master ${employee.shift_code}: รอยืนยันเวลา`,
        );
        continue;
      }
      const key = `${id}|${date}`;
      if (keys.has(key))
        throw Error(`Attendance แถว ${i + 1}: พนักงานและวันที่ซ้ำ ${key}`);
      keys.add(key);
      shifts.push({
        ...employee,
        base_shift_code: employee.shift_code,
        worker_type: normalizeWorkerType(r[4]),
        date,
        shift_code: code,
        requested_ot_hrs: 0,
        requested_ot_known: nonWorkingCodes.has(code),
        ot_task_target: "",
        source_day_code: originalCode,
      });
    }
  }
  shifts.sort(
    (a, b) => a.date.localeCompare(b.date) || a.emp_id.localeCompare(b.emp_id),
  );
  return {
    data: {
      calculationVersion: CALCULATION_VERSION,
      shifts,
      punches: parsed.punches,
      reviews: {},
      audit: [],
    },
    issues,
    summary: {
      employees: new Set(shifts.map((s) => s.emp_id)).size,
      rawScans: parsed.punches.length + parsed.duplicateScans,
      duplicateScans: parsed.duplicateScans,
      unmatchedScans: [...unmatched.values()].reduce((a, b) => a + b, 0),
      from,
      to,
      monthlyOT,
    },
  };
}
import { normalizeWorkerType } from "./worker-type";
import { normalizeDepartment } from "./departments";
