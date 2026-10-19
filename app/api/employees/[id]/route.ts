import { guard, currentSession } from "@/lib/auth";
import { employeeDB, updateEmployeeStore } from "@/lib/database";
import { MASTER_HEADERS } from "@/lib/source-headers";
import { normalizeDepartment } from "@/lib/departments";
import { isoLocal } from "@/lib/engine";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const profileFields = {
  name: 2, department: 3, section: 4, shiftCode: 5, shiftStart: 7,
  shiftEnd: 8, startDate: 9, weeklyHoliday: 10, status: 11,
  company: 12, contract: 18, endDate: 19,
} as const;
const dateOk = (value: string) => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
async function ensureProfileTable() {
  await employeeDB.query(`CREATE TABLE IF NOT EXISTS employee_profiles (
    employee_id text PRIMARY KEY REFERENCES employee_master(employee_id) ON DELETE CASCADE,
    photo bytea NOT NULL,
    content_type text NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/webp')),
    filename text NOT NULL DEFAULT '',
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
}
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guard(false, false, true);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const account = await currentSession();
    if (account?.role === "employee" && account.employeeId !== id)
      return Response.json({ error: "ไม่อนุญาตให้ดูข้อมูลพนักงานรายอื่น" }, { status: 403 });
    await ensureProfileTable();
    const { rows: [row] } = await employeeDB.query(
      "SELECT source_data,shift_data,issue,EXISTS(SELECT 1 FROM employee_profiles p WHERE p.employee_id=employee_master.employee_id) AS has_photo FROM employee_master WHERE employee_id=$1",
      [id],
    );
    if (!row) return Response.json({ error: "ไม่พบพนักงาน" }, { status: 404 });
    const source = row.source_data as Record<string, string>;
    const shift = row.shift_data as Record<string, string> | null;
    const profile = Object.fromEntries(Object.entries(profileFields).map(([field, index]) => [field, source[MASTER_HEADERS[index]] || ""]));
    return Response.json({
      profile: {
        ...profile,
        name: profile.name || shift?.emp_name || id,
        department: profile.department || shift?.department || "",
        company: profile.company || shift?.agency || "",
        shiftCode: shift?.shift_code || profile.shiftCode,
        shiftStart: shift?.shift_start || profile.shiftStart || "08:00",
        shiftEnd: shift?.shift_end || profile.shiftEnd || "17:00",
        issue: row.issue || "",
        hasPhoto: row.has_photo,
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "โหลดโปรไฟล์พนักงานไม่สำเร็จ" }, { status: 503 });
  }
}
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guard(false, true);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!body || typeof body !== "object") throw Error("ข้อมูลไม่ถูกต้อง");
    const values: Record<string, string> = {};
    for (const field of Object.keys(profileFields)) {
      const value = body[field] === undefined ? undefined : String(body[field]).trim();
      if (value === undefined) continue;
      if (value.length > 200) throw Error("ข้อมูลแต่ละช่องต้องไม่เกิน 200 ตัวอักษร");
      values[field] = value;
    }
    for (const field of ["shiftStart", "shiftEnd"])
      if (values[field] !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(values[field])) throw Error("รูปแบบเวลาไม่ถูกต้อง");
    for (const field of ["startDate", "endDate"])
      if (values[field] !== undefined && !dateOk(values[field])) throw Error("รูปแบบวันที่ไม่ถูกต้อง");
    if ((values.name !== undefined && !values.name) || (values.department !== undefined && !values.department) || (values.company !== undefined && !values.company)) throw Error("กรุณากรอกชื่อ แผนก และบริษัทให้ครบ");
    if (values.shiftStart && values.shiftEnd && values.shiftStart === values.shiftEnd) throw Error("เวลาเริ่มและเลิกกะต้องไม่ตรงกัน");
    if (values.startDate && values.endDate && values.endDate < values.startDate) throw Error("วันที่สิ้นสุดงานต้องไม่ก่อนวันที่เริ่มงาน");

    await updateEmployeeStore(async (client, state) => {
      const { rows: [row] } = await client.query("SELECT source_data,shift_data,source_row,issue FROM employee_master WHERE employee_id=$1 FOR UPDATE", [id]);
      if (!row) throw Error("ไม่พบพนักงาน");
      const before = row.source_data as Record<string, string>;
      const source = { ...before };
      for (const [field, value] of Object.entries(values)) source[MASTER_HEADERS[profileFields[field as keyof typeof profileFields]]] = value;
      const code = values.shiftCode ?? source[MASTER_HEADERS[5]];
      const start = values.shiftStart ?? source[MASTER_HEADERS[7]];
      const end = values.shiftEnd ?? source[MASTER_HEADERS[8]];
      source[MASTER_HEADERS[6]] = `${start} - ${end}`;
      const department = normalizeDepartment(values.department ?? source[MASTER_HEADERS[3]]);
      const shiftData = {
        ...(row.shift_data || {}), emp_id: id, device_emp_id: id,
        emp_name: values.name ?? source[MASTER_HEADERS[2]], department,
        source_department: values.department ?? source[MASTER_HEADERS[3]],
        agency: values.company ?? source[MASTER_HEADERS[12]],
        shift_code: code, shift_start: start, shift_end: end,
      };
      await client.query("UPDATE employee_master SET source_data=$2,shift_data=$3,issue='' WHERE employee_id=$1", [id, JSON.stringify(source), JSON.stringify(shiftData)]);
      const today = isoLocal(Date.now()).slice(0, 10);
      const shifts = (state.data.shifts || []).map((s) => {
        if (s.emp_id !== id) return s;
        const identity = {
          ...s,
          emp_name: shiftData.emp_name,
          department: shiftData.department,
          source_department: shiftData.source_department,
          agency: shiftData.agency,
        };
        if (s.date < today || state.data.shiftOverrides?.[`${id}|${s.date}`]) return identity;
        return { ...identity, shift_code: code, shift_start: start, shift_end: end };
      });
      const audit = {
        id: randomUUID(), key: `EMPLOYEE|${id}`, actor: "", timestamp: new Date().toISOString(),
        reason: "แก้ไขข้อมูลโปรไฟล์พนักงาน", before: JSON.stringify(before), after: JSON.stringify(source),
      };
      await client.query("UPDATE workspace SET data=$1 WHERE id=1", [JSON.stringify({ ...state.data, shifts, audit: [audit, ...(state.data.audit || [])] })]);
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "บันทึกข้อมูลไม่สำเร็จ" }, { status: 400 });
  }
}
