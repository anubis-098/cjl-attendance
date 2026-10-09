import { guard } from "@/lib/auth";
import { readWorkspace, updateEmployeeStore } from "@/lib/database";
import {
  applyShiftOverride,
  scheduledScanDate,
  shiftDateOffset,
  validateShiftChange,
} from "@/lib/shift-overrides";
import { shiftWindow } from "@/lib/shift-window";
import { audit } from "@/lib/workspace";
import type { Shift } from "@/lib/engine";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const denied = await guard(false, true);
  if (denied) return denied;
  try {
    const body = await request.json();
    const { dates, change, reason } = validateShiftChange(body);
    if (
      typeof body.employeeId !== "string" ||
      !Number.isSafeInteger(body.revision)
    )
      throw Error("ข้อมูลพนักงานหรือเวอร์ชันไม่ถูกต้อง");
    const current = await readWorkspace();
    if (current.revision !== body.revision) throw Error("REVISION_CONFLICT");
    const employee = current.employees.find(
      (e) => e.employee_id === body.employeeId,
    );
    if (!employee?.shift_data)
      throw Error("กรุณาตรวจสอบกะหลักใน Master ของพนักงานก่อนเปลี่ยนกะ");
    const id = employee.employee_id;
    await updateEmployeeStore(async (c, state) => {
      if (Number(state.revision) !== body.revision)
        throw Error("REVISION_CONFLICT");
      const overrides = { ...state.data.shiftOverrides };
      const changed = dates.filter(
        (date) =>
          JSON.stringify(overrides[id + "|" + date] || null) !==
          JSON.stringify(change),
      );
      for (const date of changed) {
        if (change) overrides[id + "|" + date] = change;
        else delete overrides[id + "|" + date];
      }
      const originals = new Map(
        state.data.shifts
          .filter((s) => s.emp_id === id)
          .map((s) => [s.date, s]),
      );
      const plan = (date: string): Shift =>
        applyShiftOverride(
          originals.get(date) || {
            ...employee.shift_data!,
            date,
            requested_ot_hrs: 0,
            ot_task_target: "",
          },
          overrides[id + "|" + date],
        );
      for (const date of changed) {
        const previous = shiftDateOffset(date, -1),
          next = shiftDateOffset(date, 1);
        const selected = shiftWindow(plan(date), date);
        if (
          shiftWindow(plan(previous), previous).end > selected.start ||
          selected.end > shiftWindow(plan(next), next).start
        )
          throw Error(
            `กะวันที่ ${date} ทับช่วงทำงานของวันข้างเคียง กรุณาตรวจเวลาอีกครั้ง`,
          );
      }
      const reviews = { ...state.data.reviews };
      const affectedDates = [
        ...new Set(
          changed.flatMap((date) =>
            [-1, 0, 1].map((offset) => shiftDateOffset(date, offset)),
          ),
        ),
      ];
      const previousReviews: Record<string, unknown> = {};
      for (const date of affectedDates) {
        const key = id + "|" + date,
          before = reviews[key];
        if (!before) continue;
        previousReviews[key] = before;
        reviews[key] = { ...before, approved: false };
        if (changed.includes(date)) {
          delete reviews[key].inTime;
          delete reviews[key].outTime;
        }
      }
      {
        const holidays = await c.query(
          "SELECT to_char(holiday_date,'YYYY-MM-DD') AS date FROM employee_holidays WHERE employee_id=$1",
          [id],
        );
        const holidayDates = new Set(holidays.rows.map((h) => h.date));
        const scanDates = new Set(
          current.data.punches
            .filter(
              (p) => p.device_emp_id === employee.shift_data!.device_emp_id,
            )
            .map((p) => scheduledScanDate(p.punch_timestamp, plan)),
        );
        for (const date of affectedDates)
          if (
            !originals.has(date) &&
            !holidayDates.has(date) &&
            !current.data.companyHolidays?.includes(date) &&
            !overrides[id + "|" + date] &&
            (state.data.shifts.length > 0 || !scanDates.has(date))
          )
            delete reviews[id + "|" + date];
      }
      const logs = changed.map((date) =>
        audit(
          plan(date),
          {
            shift: state.data.shiftOverrides?.[id + "|" + date] || null,
            reviews: previousReviews,
          },
          {
            shift: change,
            reviews: Object.fromEntries(
              affectedDates.map((d) => [id + "|" + d, reviews[id + "|" + d]]),
            ),
          },
          `${change ? "เปลี่ยนกะ" : "คืนค่ากะเดิม"}: ${reason} · จับสแกนใหม่และเปิดตรวจสอบวันที่เกี่ยวข้อง`,
        ),
      );
      await c.query("UPDATE workspace SET data=$1 WHERE id=1", [
        JSON.stringify({
          ...state.data,
          shiftOverrides: overrides,
          reviews,
          audit: [...logs, ...state.data.audit],
        }),
      ]);
    });
    return Response.json(await readWorkspace());
  } catch (e) {
    const conflict = e instanceof Error && e.message === "REVISION_CONFLICT";
    return Response.json(
      {
        error: conflict
          ? "ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่ก่อนบันทึก"
          : e instanceof Error
            ? e.message
            : "เปลี่ยนกะไม่สำเร็จ",
      },
      { status: conflict ? 409 : 400 },
    );
  }
}
