import { guard, currentSession } from "@/lib/auth";
import { readWorkspace, updateEmployeeStore } from "@/lib/database";
import { applyManualPairs } from "@/lib/manual-pairing";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const denied = await guard(false, true);
  if (denied) return denied;
  try {
    const body = await request.json();
    if (typeof body.employeeId !== "string" || !Number.isSafeInteger(body.revision)) throw Error("ข้อมูลไม่ถูกต้อง");
    const current = await readWorkspace();
    if (current.revision !== body.revision) throw Error("REVISION_CONFLICT");
    const employee = current.employees.find(e => e.employee_id === body.employeeId);
    if (!employee?.shift_data) throw Error("ไม่พบพนักงาน");
    const user = await currentSession();
    if (!user) return Response.json({ error: "กรุณาล็อกอินใหม่" }, { status: 401 });
    await updateEmployeeStore(async (c, state) => {
      if (Number(state.revision) !== body.revision) throw Error("REVISION_CONFLICT");
      const next = applyManualPairs({ ...current.data, reviews: state.data.reviews, audit: state.data.audit },
        employee.employee_id, employee.shift_data!.device_emp_id, body.pairs, user.displayName);
      await c.query("UPDATE workspace SET data=$1 WHERE id=1", [JSON.stringify({ ...state.data, reviews: next.reviews, audit: next.audit })]);
    });
    return Response.json(await readWorkspace());
  } catch (e) {
    const conflict = e instanceof Error && e.message === "REVISION_CONFLICT";
    return Response.json({ error: conflict ? "ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่ก่อนบันทึก" : e instanceof Error ? e.message : "บันทึกไม่สำเร็จ" }, { status: conflict ? 409 : 400 });
  }
}
