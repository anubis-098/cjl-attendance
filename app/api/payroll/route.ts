import { guard } from "@/lib/auth";
import { readWorkspace, updateEmployeeStore } from "@/lib/database";
import { calculatePayroll, payrollPeriod } from "@/lib/payroll";
import {
  DEFAULT_PAYROLL_SETTINGS,
  validatePayrollSettings,
  resolvePayrollSettings,
} from "@/lib/payroll-settings";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guard(false, false);
  if (denied) return denied;
  try {
    const q = new URL(request.url).searchParams;
    const month = q.get("month") || "",
      cycle = q.get("cycle") || "26-25";
    payrollPeriod(month, cycle);
    const current = await readWorkspace();
    const settings =
      resolvePayrollSettings(current.data.payrollSettings?.[month]);
    return Response.json({
      ...calculatePayroll(current.data, month, cycle, undefined, settings),
      settings,
      settingsSaved: Boolean(current.data.payrollSettings?.[month]),
      departments: [
        ...new Set(current.data.shifts.map((s) => s.department)),
      ].sort(),
      revision: current.revision,
    });
  } catch {
    return Response.json(
      { error: "อ่านรายงานไม่ได้ กรุณาตรวจสอบรอบเดือนหรือฐานข้อมูล" },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  const denied = await guard(true, true);
  if (denied) return denied;
  try {
    const body = await request.json();
    payrollPeriod(body.month, "26-25");
    if (!Number.isSafeInteger(body.revision))
      throw Error("เวอร์ชันข้อมูลไม่ถูกต้อง");
    const settings = validatePayrollSettings(body.settings);
    await updateEmployeeStore(async (c, state) => {
      if (Number(state.revision) !== body.revision)
        throw Error("REVISION_CONFLICT");
      await c.query("UPDATE workspace SET data=$1 WHERE id=1", [
        JSON.stringify({
          ...state.data,
          payrollSettings: {
            ...state.data.payrollSettings,
            [body.month]: settings,
          },
          audit: [
            {
              id: crypto.randomUUID(),
              key: `PAYROLL_SETTINGS|${body.month}`,
              actor: "ผู้ใช้งานเว็บ",
              timestamp: new Date().toISOString(),
              reason: "กำหนดค่าจ้าง อัตรา OT และเบี้ยเลี้ยงประจำเดือน",
              before: JSON.stringify(
                state.data.payrollSettings?.[body.month] ||
                  DEFAULT_PAYROLL_SETTINGS,
              ),
              after: JSON.stringify(settings),
            },
            ...state.data.audit,
          ],
        }),
      ]);
    });
    return Response.json({ saved: true });
  } catch (e) {
    const conflict = e instanceof Error && e.message === "REVISION_CONFLICT";
    return Response.json(
      {
        error: conflict
          ? "ข้อมูลเปลี่ยนแล้ว กรุณาอัปเดตยอดและลองบันทึกใหม่"
          : e instanceof Error
            ? e.message
            : "บันทึกไม่สำเร็จ",
      },
      { status: conflict ? 409 : 400 },
    );
  }
}
