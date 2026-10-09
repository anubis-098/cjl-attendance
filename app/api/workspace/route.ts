import { guard } from "@/lib/auth";
import { readWorkspace, updateEmployeeStore } from "@/lib/database";
import { keyOf, reconcile, Review } from "@/lib/engine";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const denied = await guard(false, false);
  if (denied) return denied;
  try {
    return Response.json(await readWorkspace());
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: "เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบบริการ PostgreSQL" },
      { status: 503 },
    );
  }
}
export async function PUT(request: Request) {
  const denied = await guard(false, true);
  if (denied) return denied;
  try {
    const body = await request.json();
    const current = await readWorkspace();
    if (body.revision !== current.revision)
      return Response.json(
        { error: "ข้อมูลถูกเปลี่ยนแล้ว กรุณาโหลดใหม่ก่อนบันทึก" },
        { status: 409 },
      );
    const changes: Record<string, Review> = body.reviews;
    if (
      !changes ||
      typeof changes !== "object" ||
      Array.isArray(changes) ||
      !Array.isArray(body.audit)
    )
      throw Error("รูปแบบข้อมูลตรวจสอบไม่ถูกต้อง");
    const shifts = new Map(current.data.shifts.map((s) => [keyOf(s), s]));
    const punches = new Map<string, typeof current.data.punches>();
    for (const p of current.data.punches) {
      const list = punches.get(p.device_emp_id) || [];
      list.push(p);
      punches.set(p.device_emp_id, list);
    }
    for (const [key, review] of Object.entries(changes)) {
      const s = shifts.get(key);
      if (!s) throw Error("ไม่พบกะที่ต้องการตรวจสอบ");
      if (
        typeof review.approved !== "boolean" ||
        typeof review.overBudget !== "boolean" ||
        (review.otRulesVersion !== undefined &&
          !Number.isInteger(review.otRulesVersion)) ||
        (review.deductOTBreak !== undefined &&
          typeof review.deductOTBreak !== "boolean") ||
        typeof review.note !== "string"
      )
        throw Error("ผลตรวจสอบไม่ถูกต้อง");
      for (const t of [review.inTime, review.outTime])
        if (
          t &&
          (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t) ||
            !Number.isFinite(Date.parse(t + ":00+07:00")))
        )
          throw Error("เวลาไม่ถูกต้อง");
      if (review.inTime && review.outTime && review.outTime <= review.inTime)
        throw Error("เวลาออกต้องหลังเวลาเข้า");
      const r = reconcile(s, punches.get(s.device_emp_id) || [], review);
      if (
        review.approved &&
        !(
          r.approvalNeedsReview &&
          JSON.stringify(review) === JSON.stringify(current.data.reviews[key])
        ) &&
        (r.missing ||
          r.off ||
          r.nonWorking ||
          r.ratePending ||
          r.requiresOvertimeApproval)
      )
        throw Error("รายการนี้ยังไม่สามารถรับรองได้");
    }
    await updateEmployeeStore(async (c, state) => {
      if (Number(state.revision) !== body.revision)
        throw Error("ข้อมูลถูกเปลี่ยนแล้ว กรุณาโหลดใหม่");
      await c.query("UPDATE workspace SET data=$1 WHERE id=1", [
        JSON.stringify({ ...state.data, reviews: changes, audit: body.audit }),
      ]);
    });
    return Response.json(await readWorkspace());
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ" },
      { status: 400 },
    );
  }
}
