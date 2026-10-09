import { guard } from "@/lib/auth";
import { employeeDB, updateEmployeeStore } from "@/lib/database";
import { payrollPeriod } from "@/lib/payroll";
import { resolvePayrollSettings } from "@/lib/payroll-settings";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  try {
    const params = new URL(request.url).searchParams;
    const month = params.get("month") || "", employeeId = params.get("employeeId") || "";
    payrollPeriod(month, "calendar");
    if (!employeeId || !(await employeeDB.query("SELECT 1 FROM employee_master WHERE employee_id=$1", [employeeId])).rowCount)
      return Response.json({ error: "ไม่พบพนักงาน" }, { status: 404 });
    const { rows: [state] } = await employeeDB.query("SELECT data,revision FROM workspace WHERE id=1");
    return Response.json({ revision: Number(state.revision), global: resolvePayrollSettings(state.data.payrollSettings?.[month]), local: state.data.employeePayrollSettings?.[month]?.[employeeId] || null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return Response.json({ error: "โหลดอัตราค่าจ้างไม่สำเร็จ" }, { status: 400 }); }
}
export async function PUT(request: Request) {
  const denied = await guard(true, true);
  if (denied) return denied;
  try {
    const { month, employeeId, dailyWage, revision } = await request.json();
    payrollPeriod(month, "calendar");
    if (typeof employeeId !== "string" || !employeeId || !Number.isSafeInteger(revision) ||
      (dailyWage !== null && (typeof dailyWage !== "number" || !Number.isFinite(dailyWage) || dailyWage <= 0 || dailyWage > 100000 || Math.abs(dailyWage * 100 - Math.round(dailyWage * 100)) > 0.000001))) throw Error("ข้อมูลอัตราค่าจ้างไม่ถูกต้อง");
    await updateEmployeeStore(async (c, state) => {
      if (Number(state.revision) !== revision) throw Error("CONFLICT");
      if (!(await c.query("SELECT 1 FROM employee_master WHERE employee_id=$1", [employeeId])).rowCount) throw Error("ไม่พบพนักงาน");
      const rates = { ...state.data.employeePayrollSettings?.[month] };
      const before = rates[employeeId] || null;
      if (dailyWage === null) delete rates[employeeId];
      else rates[employeeId] = { dailyWage };
      const entry = { id: crypto.randomUUID(), key: `EMPLOYEE_PAYROLL|${employeeId}|${month}`, actor: "ผู้ใช้งานเว็บ", timestamp: new Date().toISOString(), reason: "ตั้งค่าจ้างรายบุคคล", before: JSON.stringify(before), after: JSON.stringify(rates[employeeId] || null) };
      await c.query("UPDATE workspace SET data=$1 WHERE id=1", [JSON.stringify({ ...state.data, employeePayrollSettings: { ...state.data.employeePayrollSettings, [month]: rates }, audit: [entry, ...state.data.audit] })]);
    });
    return Response.json({ saved: true });
  } catch (e) {
    const conflict = e instanceof Error && e.message === "CONFLICT";
    return Response.json({ error: conflict ? "ข้อมูลเปลี่ยนแล้ว กรุณาเปิดการตั้งค่าใหม่" : "บันทึกอัตราค่าจ้างไม่สำเร็จ" }, { status: conflict ? 409 : 400 });
  }
}
