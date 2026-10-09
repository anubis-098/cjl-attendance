import { guard } from "@/lib/auth";
import { readWorkspace, updateEmployeeStore } from "@/lib/database";
export const runtime = "nodejs";
export async function PUT(request: Request) {
  const denied = await guard(false, true);
  if (denied) return denied;
  try {
    const { date, employeeId, text, expected } = await request.json();
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date ||
      typeof employeeId !== "string" || typeof text !== "string" || text.length > 1000 ||
      typeof expected !== "string") throw Error("INVALID");
    await updateEmployeeStore(async (c, state) => {
      if (employeeId && !(await c.query("SELECT 1 FROM employee_master WHERE employee_id=$1", [employeeId])).rowCount) throw Error("INVALID");
      const { rows } = await c.query("SELECT remark FROM calendar_remarks WHERE remark_date=$1 AND employee_id=$2", [date, employeeId]);
      const previous = rows[0]?.remark || "";
      if (previous !== expected) throw Error("CONFLICT");
      const next = text.trim();
      if (next === previous) return;
      if (next) await c.query("INSERT INTO calendar_remarks(remark_date,employee_id,remark) VALUES($1,$2,$3) ON CONFLICT(remark_date,employee_id) DO UPDATE SET remark=EXCLUDED.remark", [date, employeeId, next]);
      else await c.query("DELETE FROM calendar_remarks WHERE remark_date=$1 AND employee_id=$2", [date, employeeId]);
      await c.query("UPDATE workspace SET data=$1 WHERE id=1", [JSON.stringify({ ...state.data, audit: [{
        id: crypto.randomUUID(), key: `REMARK|${employeeId || "GLOBAL"}|${date}`,
        actor: "ผู้ใช้งานเว็บ", timestamp: new Date().toISOString(),
        reason: next ? "แก้ไขหมายเหตุรายวัน" : "ลบหมายเหตุรายวัน", before: previous, after: next,
      }, ...state.data.audit] })]);
    });
    return Response.json({ ok: true });
  } catch (e) {
    const conflict = e instanceof Error && e.message === "CONFLICT";
    return Response.json({ error: conflict ? "หมายเหตุถูกเปลี่ยนแล้ว กรุณาปิดและโหลดข้อมูลใหม่" : "บันทึกไม่สำเร็จ กรุณาตรวจสอบข้อมูล" }, { status: conflict ? 409 : 400 });
  }
}
