import { guard } from "@/lib/auth";
import { readWorkspace, updateEmployeeStore } from "@/lib/database";
import { normalizeDayCode, editableDayCodes } from "@/lib/day-codes";
import { audit } from "@/lib/workspace";
import { masterDate } from "@/lib/master-comparison";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const denied = await guard(false, true);
  if (denied) return denied;
  try {
    const body = await request.json();
    const dates: string[] = body.dates;
    const code =
      body.code === null
        ? null
        : typeof body.code === "string"
          ? normalizeDayCode(body.code)
          : "";
    if (
      typeof body.employeeId !== "string" ||
      !Number.isSafeInteger(body.revision) ||
      !Array.isArray(dates) ||
      dates.length < 1 ||
      dates.length > 31 ||
      new Set(dates).size !== dates.length ||
      dates.some(
        (d) =>
          typeof d !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(d) ||
          !Number.isFinite(Date.parse(d)) ||
          new Date(d).toISOString().slice(0, 10) !== d,
      ) ||
      new Set(dates.map((d) => d.slice(0, 7))).size !== 1 ||
      (code !== null && !editableDayCodes.includes(code))
    ) {
      return Response.json(
        { error: "กรุณาเลือกรหัสวันหยุดและวันที่ในเดือนเดียวกันให้ถูกต้อง" },
        { status: 400 },
      );
    }
    const current = await readWorkspace();
    if (dates.some((d) => current.data.companyHolidays?.includes(d)))
      return Response.json(
        {
          error: "วันที่เลือกเป็นวันหยุดองค์กร กรุณาแก้ไขในปฏิทินวันหยุดองค์กร",
        },
        { status: 400 },
      );
    if (current.revision !== body.revision)
      return Response.json(
        { error: "ข้อมูลถูกเปลี่ยนแล้ว กรุณาโหลดใหม่ก่อนบันทึก" },
        { status: 409 },
      );
    const employee = current.employees.find(
      (e) => e.employee_id === body.employeeId,
    );
    if (!employee)
      return Response.json({ error: "ไม่พบพนักงานใน Master" }, { status: 400 });
    const shifts = new Map(
      current.data.shifts
        .filter((s) => s.emp_id === body.employeeId)
        .map((s) => [s.date, s]),
    );
    if (code && dates.some((d) => !shifts.has(d) && !employee.shift_data))
      return Response.json(
        {
          error:
            "กรุณาตรวจสอบเวลากะใน Master ก่อนกำหนดวันหยุดสำหรับวันที่ไม่มีกะ",
        },
        { status: 400 },
      );
    await updateEmployeeStore(async (c, state) => {
      if (Number(state.revision) !== body.revision)
        throw Error("REVISION_CONFLICT");
      const reviews = { ...state.data.reviews };
      const logs = [];
      for (const date of dates) {
        const {
          rows: [before],
        } = await c.query(
          "SELECT holiday_code FROM employee_holidays WHERE employee_id=$1 AND holiday_date=$2",
          [body.employeeId, date],
        );
        if ((before?.holiday_code ?? null) === code) continue;
        const key = `${body.employeeId}|${date}`;
        if (code)
          await c.query(
            "INSERT INTO employee_holidays(employee_id,holiday_date,holiday_code) VALUES($1,$2,$3) ON CONFLICT(employee_id,holiday_date) DO UPDATE SET holiday_code=EXCLUDED.holiday_code,updated_at=now()",
            [body.employeeId, date, code],
          );
        else
          await c.query(
            "DELETE FROM employee_holidays WHERE employee_id=$1 AND holiday_date=$2",
            [body.employeeId, date],
          );
        const oldReview = reviews[key];
        if (oldReview) reviews[key] = { ...oldReview, approved: false };
        // Removing a manually created date may remove its only shift entirely.
        // Keep its review in the audit rather than leaving an orphan that blocks future saves.
        const hasOriginalShift = state.data.shifts.length
          ? state.data.shifts.some(
              (s) => s.emp_id === body.employeeId && s.date === date,
            )
          : employee.shift_data &&
            current.data.punches.some(
              (p) =>
                p.device_emp_id === employee.shift_data!.device_emp_id &&
                masterDate(employee.shift_data!, p.punch_timestamp) === date,
            );
        if (
          code === null &&
          !hasOriginalShift &&
          !current.data.companyHolidays?.includes(date) &&
          !state.data.shiftOverrides?.[key]
        )
          delete reviews[key];
        const base = shifts.get(date) || {
          ...employee.shift_data!,
          date,
          requested_ot_hrs: 0,
          ot_task_target: "",
        };
        logs.push(
          audit(
            { ...base, emp_id: body.employeeId },
            { holiday: before?.holiday_code ?? null, review: oldReview },
            { holiday: code, review: reviews[key] },
            code
              ? `กำหนดวันหยุด ${code} และเปิดตรวจสอบใหม่`
              : "คืนค่าตารางกะเดิมและเปิดตรวจสอบใหม่",
          ),
        );
      }
      await c.query("UPDATE workspace SET data=$1 WHERE id=1", [
        JSON.stringify({
          ...state.data,
          reviews,
          audit: [...logs, ...state.data.audit],
        }),
      ]);
    });
    return Response.json(await readWorkspace());
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error && e.message === "REVISION_CONFLICT"
            ? "ข้อมูลถูกเปลี่ยนแล้ว กรุณาโหลดใหม่ก่อนบันทึก"
            : "บันทึกวันหยุดไม่สำเร็จ",
      },
      {
        status:
          e instanceof Error && e.message === "REVISION_CONFLICT" ? 409 : 400,
      },
    );
  }
}
