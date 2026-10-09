import { guard } from "@/lib/auth";
import { readWorkspace, updateEmployeeStore } from "@/lib/database";
import { validateCompanyHolidays } from "@/lib/company-holidays";
import { applyShiftOverride, scheduledScanDate } from "@/lib/shift-overrides";
import { audit } from "@/lib/workspace";
import type { Audit, Shift } from "@/lib/engine";
export const runtime = "nodejs";
export async function PUT(request: Request) {
  const denied = await guard(false, true);
  if (denied) return denied;
  try {
    const body = await request.json();
    const dates = validateCompanyHolidays(body.month, body.dates);
    if (!Number.isSafeInteger(body.revision))
      throw Error("ข้อมูลเวอร์ชันไม่ถูกต้อง");
    const current = await readWorkspace();
    if (current.revision !== body.revision) throw Error("REVISION_CONFLICT");
    await updateEmployeeStore(async (c, state) => {
      if (Number(state.revision) !== body.revision)
        throw Error("REVISION_CONFLICT");
      const previous = (current.data.companyHolidays || []).filter((d) =>
        d.startsWith(body.month),
      );
      const changed = new Set([
        ...previous.filter((d) => !dates.includes(d)),
        ...dates.filter((d) => !previous.includes(d)),
      ]);
      if (!changed.size) return;
      const { rows: personal } = await c.query<{
        employee_id: string;
        date: string;
        holiday_code: string;
      }>(
        "SELECT employee_id,to_char(holiday_date,'YYYY-MM-DD') AS date,holiday_code FROM employee_holidays",
      );
      const personalKeys = new Map(
        personal.map((h) => [`${h.employee_id}|${h.date}`, h.holiday_code]),
      );
      const originals = new Map(
        state.data.shifts.map((s) => [`${s.emp_id}|${s.date}`, s]),
      );
      const scheduledEmployees = new Set(
        state.data.shifts.map((s) => s.emp_id),
      );
      const masters = new Map(
        current.employees
          .filter((e) => e.shift_data)
          .map((e) => [
            e.employee_id,
            {
              ...e.shift_data!,
              date: "",
              requested_ot_hrs: 0,
              ot_task_target: "",
            },
          ]),
      );
      const plan = (id: string, date: string, fallback: Shift) =>
        applyShiftOverride(
          originals.get(`${id}|${date}`) || {
            ...(masters.get(id) || fallback),
            date,
          },
          state.data.shiftOverrides?.[`${id}|${date}`],
        );
      const scanDays = new Set<string>();
      const byDevice = new Map(
        [...masters.values()].map((s) => [s.device_emp_id, s]),
      );
      for (const punch of current.data.punches) {
        const master = byDevice.get(punch.device_emp_id);
        if (!master || scheduledEmployees.has(master.emp_id)) continue;
        scanDays.add(
          `${master.emp_id}|${scheduledScanDate(punch.punch_timestamp, (d) => plan(master.emp_id, d, master))}`,
        );
      }
      const reviews = { ...state.data.reviews };
      const logs: Audit[] = [];
      for (const s of current.data.shifts) {
        if (!changed.has(s.date)) continue;
        const key = `${s.emp_id}|${s.date}`;
        const base = plan(s.emp_id, s.date, s);
        const nextCode = dates.includes(s.date)
          ? "PH"
          : personalKeys.get(key) || base.shift_code;
        const remains =
          dates.includes(s.date) ||
          personalKeys.has(key) ||
          originals.has(key) ||
          !!state.data.shiftOverrides?.[key] ||
          scanDays.has(key);
        if (nextCode === s.shift_code && remains) continue;
        const old = reviews[key];
        if (!old) continue;
        if (remains) reviews[key] = { ...old, approved: false };
        else delete reviews[key];
        logs.push(
          audit(
            s,
            old,
            reviews[key] || null,
            "เปลี่ยนวันหยุดองค์กรและเปิดตรวจสอบใหม่",
          ),
        );
      }
      await c.query(
        "DELETE FROM company_holidays WHERE to_char(holiday_date,'YYYY-MM')=$1",
        [body.month],
      );
      if (dates.length)
        await c.query(
          "INSERT INTO company_holidays(holiday_date) SELECT unnest($1::date[])",
          [dates],
        );
      logs.unshift({
        id: crypto.randomUUID(),
        key: `COMPANY_HOLIDAYS|${body.month}`,
        actor: "ผู้ใช้งานเว็บ",
        timestamp: new Date().toISOString(),
        reason: "กำหนดวันหยุดประเพณีองค์กรร่วมกันทุกพนักงาน",
        before: JSON.stringify(previous),
        after: JSON.stringify(dates),
      });
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
    const conflict = e instanceof Error && e.message === "REVISION_CONFLICT";
    return Response.json(
      {
        error: conflict
          ? "ข้อมูลถูกเปลี่ยนแล้ว กรุณาโหลดใหม่ก่อนบันทึก"
          : "บันทึกวันหยุดองค์กรไม่สำเร็จ กรุณาตรวจสอบวันที่",
      },
      { status: conflict ? 409 : 400 },
    );
  }
}
