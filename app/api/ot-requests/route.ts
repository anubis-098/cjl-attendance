import { guard, currentSession } from "@/lib/auth";
import { employeeDB, readWorkspace, updateEmployeeStore } from "@/lib/database";
import { nonWorkingCodes, normalizeDayCode } from "@/lib/day-codes";
import { shiftWindow } from "@/lib/shift-window";
import { audit } from "@/lib/workspace";
import type { Shift } from "@/lib/engine";
export const runtime = "nodejs";

function validMonth(month: unknown): month is string {
  return typeof month === "string" && /^20\d{2}-(0[1-9]|1[0-2])$/.test(month);
}
async function context(employeeId: string, month: string) {
  const workspace = await readWorkspace();
  const employee = workspace.employees.find((e) => e.employee_id === employeeId);
  const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  const plans: Shift[] = [];
  for (let day = 1; day <= days; day++) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const shift = workspace.data.shifts.find((s) => s.emp_id === employeeId && s.date === date)
      || (employee?.shift_data ? { ...employee.shift_data, date, requested_ot_hrs: 0, requested_ot_known: false, ot_task_target: "" } : null);
    if (shift) plans.push(shift);
  }
  return { workspace, employee, plans };
}
export async function GET(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const query = new URL(request.url).searchParams;
  const employeeId = query.get("employeeId"), month = query.get("month");
  if (!employeeId || !validMonth(month)) return Response.json({ error: "ข้อมูลคำขอ OT ไม่ถูกต้อง" }, { status: 400 });
  const { workspace, employee, plans } = await context(employeeId, month);
  if (!employee) return Response.json({ error: "ไม่พบพนักงานใน Master" }, { status: 404 });
  const { rows } = await employeeDB.query(
    "SELECT *,to_char(shift_date,'YYYY-MM-DD') AS date FROM ot_requests WHERE employee_id=$1 AND shift_date >= $2::date AND shift_date < $2::date + interval '1 month' ORDER BY shift_date",
    [employeeId, month + "-01"],
  );
  return Response.json({ revision: workspace.revision, plans, requests: rows });
}
export async function POST(request: Request) {
  const denied = await guard(false, true);
  if (denied) return denied;
  try {
    const body = await request.json();
    const { employeeId, month, dates, beforeHours, afterHours } = body;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const validHours = (n: unknown) => typeof n === "number" && Number.isFinite(n) && (n === 0 || (n >= 1 && n <= 24 && Number.isInteger(n * 2)));
    if (typeof employeeId !== "string" || !validMonth(month) || !Number.isSafeInteger(body.revision)
      || !Array.isArray(dates) || !dates.length || dates.length > 31 || new Set(dates).size !== dates.length
      || !validHours(beforeHours) || !validHours(afterHours) || beforeHours + afterHours < 1
      || !reason || reason.length > 1000)
      return Response.json({ error: "เลือกวัน ระบุเหตุผล และขอ OT อย่างน้อย 1 ชั่วโมง เพิ่มครั้งละ 0.5 ชั่วโมง" }, { status: 400 });
    const { workspace, employee, plans } = await context(employeeId, month);
    if (!employee) return Response.json({ error: "ไม่พบพนักงานใน Master" }, { status: 404 });
    const chosen = dates.map((date) => plans.find((s) => s.date === date));
    if (chosen.some((s) => !s || nonWorkingCodes.has(normalizeDayCode(s.shift_code))
      || !Number.isFinite(shiftWindow(s, s.date).start)
      || (shiftWindow(s, s.date).end - shiftWindow(s, s.date).start) / 3600000 + beforeHours + afterHours > 24))
      return Response.json({ error: "วันที่เลือกไม่มีกะ เป็นวันลา หรือช่วงกะรวม OT เกิน 24 ชั่วโมง" }, { status: 400 });
    const actor = await currentSession();
    await updateEmployeeStore(async (client, state) => {
      if (Number(state.revision) !== body.revision || workspace.revision !== body.revision) throw Error("REVISION_CONFLICT");
      const logs = [];
      for (const shift of chosen as Shift[]) {
        const { rows: [previous] } = await client.query("SELECT * FROM ot_requests WHERE employee_id=$1 AND shift_date=$2", [employeeId, shift.date]);
        if (previous && previous.status !== "pending") throw Error("REQUEST_LOCKED");
        const next = { beforeHours, afterHours, reason, status: "pending", shift };
        await client.query(`INSERT INTO ot_requests(employee_id,shift_date,before_hours,after_hours,reason,shift_snapshot,requested_by)
          VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(employee_id,shift_date) DO UPDATE SET before_hours=EXCLUDED.before_hours,
          after_hours=EXCLUDED.after_hours,reason=EXCLUDED.reason,shift_snapshot=EXCLUDED.shift_snapshot,requested_by=EXCLUDED.requested_by,updated_at=now()`,
          [employeeId, shift.date, beforeHours, afterHours, reason, JSON.stringify(shift), `${actor!.displayName} (${actor!.username})`]);
        logs.push(audit(shift, previous || null, next, "บันทึกคำขอ OT รออนุมัติ"));
      }
      await client.query("UPDATE workspace SET data=$1 WHERE id=1", [JSON.stringify({ ...state.data, audit: [...logs, ...state.data.audit] })]);
    });
    return Response.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return Response.json({ error: code === "REVISION_CONFLICT" ? "ข้อมูลถูกเปลี่ยนแล้ว กรุณาโหลดใหม่ก่อนบันทึก" : code === "REQUEST_LOCKED" ? "คำขอนี้ผ่านการตรวจสอบแล้ว ไม่สามารถแก้ไขได้" : "บันทึกคำขอ OT ไม่สำเร็จ" }, { status: code === "REVISION_CONFLICT" || code === "REQUEST_LOCKED" ? 409 : 400 });
  }
}
