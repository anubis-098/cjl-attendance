import { Pool, PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { Data, Punch, Shift, CALCULATION_VERSION } from "./engine";
import type { EmployeeRow } from "./master-data";
import {
  applyShiftOverride,
  scheduleBounds,
  scheduledScanDate,
} from "./shift-overrides";
import { normalizeDepartment } from "./departments";
import { normalizeDayCode } from "./day-codes";
import { isWeeklyHoliday } from "./master-calendar";
import { buildActualOnlyShifts } from "./actual-only-shifts";

const globalDB = globalThis as unknown as {
  employeePool?: Pool;
  fingerPool?: Pool;
};
export const employeeDB = (globalDB.employeePool ||= new Pool({
  database: process.env.EMPLOYEE_DB || "employee_db",
  max: 5,
}));
export const fingerprintDB = (globalDB.fingerPool ||= new Pool({
  database: process.env.FINGERPRINT_DB || "fingerprint_db",
  max: 5,
}));
export const emptyData = (): Data => ({
  calculationVersion: CALCULATION_VERSION,
  shifts: [],
  punches: [],
  reviews: {},
  audit: [],
});
export async function readWorkspace(transaction?: PoolClient) {
  const c = transaction ?? await employeeDB.connect();
  try {
    if(!transaction) await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const {
      rows: [state],
    } = await c.query("SELECT * FROM workspace WHERE id=1");
    const { rows: employees } = await c.query<EmployeeRow>(
      "SELECT * FROM employee_master ORDER BY source_row",
    );
    for (const employee of employees) {
      if (employee.shift_data)
        employee.shift_data = {
          ...employee.shift_data,
          source_department:
            employee.shift_data.source_department ||
            employee.source_data.Section ||
            employee.source_data["แผนก"] ||
            employee.shift_data.department,
          department: normalizeDepartment(employee.shift_data.department),
        };
    }
    const punches: Punch[] = (
      await fingerprintDB.query(
        `SELECT DISTINCT employee_id AS device_emp_id, to_char(punch_timestamp, 'YYYY-MM-DD"T"HH24:MI:SS') AS punch_timestamp,punch_type FROM fingerprint_logs ORDER BY punch_timestamp, device_emp_id,punch_type`,
      )
    ).rows;
    const data: Data = { ...emptyData(), ...state.data, punches };
    data.actualOnlyShifts = buildActualOnlyShifts(employees, punches);
    const imageCounts = await c.query<{ key: string; count: string }>("SELECT employee_id || '|' || to_char(shift_date,'YYYY-MM-DD') AS key, count(*) AS count FROM attendance_evidence WHERE content_type IN ('image/jpeg','image/png','image/webp') GROUP BY employee_id,shift_date");
    data.evidenceImageCounts = Object.fromEntries(imageCounts.rows.map(row => [row.key, Number(row.count)]));
    data.calendarRemarks = (await c.query(
      `SELECT to_char(remark_date,'YYYY-MM-DD') AS date, employee_id AS "employeeId", remark AS text FROM calendar_remarks ORDER BY remark_date,employee_id`,
    )).rows;
    const original = new Map(
      data.shifts.map((s) => [s.emp_id + "|" + s.date, s]),
    );
    const masterPlans = new Map(
      employees
        .filter((e) => e.shift_data)
        .map((e) => [e.employee_id, e.shift_data!]),
    );
    const planFor = (id: string, date: string, fallback?: Shift): Shift =>
      applyShiftOverride(
        original.get(id + "|" + date) || {
          ...(masterPlans.get(id) || fallback!),
          date,
          requested_ot_hrs: 0,
          ot_task_target: "",
        },
        data.shiftOverrides?.[id + "|" + date],
      );
    // Without a daily schedule, compare only dates with scans against the master shift.
    // This does not invent leave/holiday codes or absence on dates with no scans.
    if (employees.length && punches.length) {
      const scheduledEmployees = new Set(data.shifts.map((s) => s.emp_id));
      const byID = new Map(
        employees
          .filter((e) => e.shift_data && !scheduledEmployees.has(e.employee_id))
          .map((e) => [e.shift_data!.device_emp_id, e.shift_data!]),
      );
      const seen = new Set<string>();
      for (const p of punches) {
        const e = byID.get(p.device_emp_id);
        if (!e) continue;
        const date = scheduledScanDate(p.punch_timestamp, (d) =>
          planFor(e.emp_id, d),
        );
        const key = e.emp_id + "|" + date;
        if (seen.has(key)) continue;
        seen.add(key);
        data.shifts.push({
          ...e,
          date,
          requested_ot_hrs: 0,
          requested_ot_known: false,
          ot_task_target: "",
          source_day_code: "MASTER",
        });
      }
    }
    const observedDates = data.shifts.map((shift) => shift.date).sort();
    if (observedDates.length) {
      const firstDate = observedDates[0];
      const lastDate = observedDates.at(-1)!;
      const scheduledKeys = new Set(data.shifts.map((shift) => `${shift.emp_id}|${shift.date}`));
      const dateRange: string[] = [];
      for (let date = firstDate; date <= lastDate; ) {
        dateRange.push(date);
        const next = new Date(`${date}T00:00:00Z`);
        next.setUTCDate(next.getUTCDate() + 1);
        date = next.toISOString().slice(0, 10);
      }
      for (const employee of employees) {
        const plan = employee.shift_data;
        const weeklyHoliday = employee.source_data?.["วันหยุด"];
        if (!plan || !weeklyHoliday) continue;
        const startDate = employee.source_data?.["เริ่มงาน"] || firstDate;
        const endDate = employee.source_data?.["วันที่ออก"] || lastDate;
        for (const date of dateRange) {
          const key = `${employee.employee_id}|${date}`;
          if (
            date < startDate ||
            date > endDate ||
            scheduledKeys.has(key) ||
            !isWeeklyHoliday(weeklyHoliday, date)
          ) continue;
          data.shifts.push({
            ...plan,
            date,
            shift_code: "H",
            base_shift_code: plan.shift_code,
            requested_ot_hrs: 0,
            requested_ot_known: false,
            ot_task_target: "",
            source_day_code: "MASTER_WEEKLY",
          });
          scheduledKeys.add(key);
        }
      }
    }
    data.shifts.sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.emp_id.localeCompare(b.emp_id),
    );
    const { rows: holidays } = await c.query<{
      employee_id: string;
      date: string;
      holiday_code: string;
    }>(
      "SELECT employee_id,to_char(holiday_date,'YYYY-MM-DD') AS date,holiday_code FROM employee_holidays ORDER BY holiday_date,employee_id",
    );
    const employeeById = new Map(employees.map((employee) => [employee.employee_id, employee]));
    const shiftMap = new Map(
      data.shifts.map((s) => [
        s.emp_id + "|" + s.date,
        (() => {
          const base = applyShiftOverride(s, data.shiftOverrides?.[s.emp_id + "|" + s.date]);
          const weeklyHoliday = employeeById.get(s.emp_id)?.source_data?.["วันหยุด"];
          const regularCode = ["1", "M", "D", "A", "N"].includes(normalizeDayCode(base.shift_code));
          return isWeeklyHoliday(weeklyHoliday, s.date) && regularCode
            ? { ...base, shift_code: "H", base_shift_code: base.base_shift_code || base.shift_code }
            : base;
        })(),
      ]),
    );
    for (const key of new Set([...Object.keys(data.shiftOverrides || {}),
      ...Object.keys(data.reviews).filter(key => data.reviews[key].manualPair)])) {
      const separator = key.lastIndexOf("|"),
        id = key.slice(0, separator),
        date = key.slice(separator + 1);
      if (!shiftMap.has(key) && masterPlans.has(id))
        shiftMap.set(key, planFor(id, date));
    }
    const masters = new Map(
      employees.map((e) => [e.employee_id, e.shift_data]),
    );
    for (const h of holidays) {
      const key = h.employee_id + "|" + h.date;
      const base = shiftMap.get(key) || masters.get(h.employee_id);
      if (!base) continue;
      shiftMap.set(key, {
        ...base,
        date: h.date,
        shift_code: h.holiday_code,
        source_day_code: h.holiday_code,
        requested_ot_hrs: 0,
        requested_ot_known: false,
        ot_task_target:
          "ot_task_target" in base && typeof base.ot_task_target === "string"
            ? base.ot_task_target
            : "",
      });
    }
    const { rows: companyDays } = await c.query<{ date: string }>(
      "SELECT to_char(holiday_date,'YYYY-MM-DD') AS date FROM company_holidays ORDER BY holiday_date",
    );
    data.companyHolidays = companyDays.map((h) => h.date);
    for (const date of data.companyHolidays) {
      const ids = new Set([
        ...masterPlans.keys(),
        ...[...shiftMap.values()]
          .filter((s) => s.date === date)
          .map((s) => s.emp_id),
      ]);
      for (const id of ids) {
        const key = id + "|" + date;
        const base = shiftMap.get(key) || planFor(id, date);
        shiftMap.set(key, {
          ...base,
          date,
          shift_code: "PH",
          source_day_code: "PH",
          requested_ot_hrs: 0,
          requested_ot_known: false,
        });
      }
    }
    data.shifts = [...shiftMap.values()].sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.emp_id.localeCompare(b.emp_id),
    );
    data.shifts = data.shifts.map((s) => ({
      ...s,
      scan_window_from: scheduleBounds(s.date, (d) => planFor(s.emp_id, d, s))
        .from,
      scan_window_to: scheduleBounds(s.date, (d) => planFor(s.emp_id, d, s)).to,
      source_department:
        s.source_department ||
        (s.department === normalizeDepartment(s.department) &&
        masters.get(s.emp_id)?.department === s.department
          ? masters.get(s.emp_id)?.source_department
          : undefined) ||
        s.department,
      department: normalizeDepartment(s.department),
      base_shift_code: s.base_shift_code || masters.get(s.emp_id)?.shift_code,
    }));
    data.employeeWeeklyHolidays = Object.fromEntries(
      employees
        .map((employee) => [employee.employee_id, employee.source_data?.["วันหยุด"]?.trim() || ""] as const)
        .filter(([, day]) => day),
    );
    data.employeeEndDates = Object.fromEntries(
      employees
        .map((employee) => [employee.employee_id, employee.source_data?.["วันที่ออก"]?.trim() || ""] as const)
        .filter(([, date]) => /^\d{4}-\d{2}-\d{2}$/.test(date)),
    );
    data.employeesResignedWithoutDate = employees
      .filter((employee) => {
        const status = (employee.source_data?.Status || "").trim().toLowerCase();
        const contract = (employee.source_data?.Contract || "").trim().toLowerCase();
        const resigned = ["resign", "resigned"].includes(status) || contract === "resigned";
        const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(employee.source_data?.["วันที่ออก"] || "");
        return resigned && !hasDate;
      })
      .map((employee) => employee.employee_id);
    if(!transaction) await c.query("COMMIT");
    return {
      data,
      revision: Number(state.revision),
      employeeCount: employees.length,
      employees,
    };
  } catch (e) {
    if(!transaction) await c.query("ROLLBACK");
    throw e;
  } finally {
    if(!transaction) c.release();
  }
}
export async function updateEmployeeStore(
  action: (
    c: PoolClient,
    state: { data: Data; revision: string; active_punch_batch: string | null },
  ) => Promise<void>,
) {
  const { currentSession } = await import("./auth");
  const actor = await currentSession();
  const c = await employeeDB.connect();
  try {
    await c.query("BEGIN");
    const {
      rows: [state],
    } = await c.query("SELECT * FROM workspace WHERE id=1 FOR UPDATE");
    await action(c, state);
    if (actor) {
      const { rows: [updated] } = await c.query("SELECT data FROM workspace WHERE id=1");
      const previousIds = new Set(state.data.audit.map((entry: Data["audit"][number]) => entry.id));
      const audit = (updated.data.audit || []).map((entry: Data["audit"][number]) =>
        previousIds.has(entry.id) ? entry : { ...entry, actor: `${actor.displayName} (${actor.username})` },
      );
      await c.query("UPDATE workspace SET data=jsonb_set(data,'{audit}',$1::jsonb) WHERE id=1", [JSON.stringify(audit)]);
    }
    await c.query("UPDATE workspace SET revision=revision+1 WHERE id=1");
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
export async function writeEmployees(
  c: PoolClient,
  rows: EmployeeRow[],
  mode: "replace" | "merge" = "replace",
) {
  await c.query(
    `INSERT INTO employee_master SELECT employee_id,source_row,source_data,shift_data,issue FROM jsonb_to_recordset($1::jsonb) AS x(employee_id text,source_row integer,source_data jsonb,shift_data jsonb,issue text)
     ON CONFLICT (employee_id) DO UPDATE SET source_row=EXCLUDED.source_row, source_data=EXCLUDED.source_data, shift_data=EXCLUDED.shift_data, issue=EXCLUDED.issue`,
    [JSON.stringify(rows)],
  );
  // Replace the roster only after upserting. Existing employee rows keep their
  // linked profile records; only IDs omitted from a true roster replacement go.
  if (mode === "replace") {
    await c.query("DELETE FROM employee_master WHERE employee_id <> ALL($1::text[])", [
      rows.map((row) => row.employee_id),
    ]);
  }
}
export async function stagePunches(punches: Punch[], filename: string, receipt?: {id:string;hash:string}) {
  const id = randomUUID(),
    c = await fingerprintDB.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(73125001)");
    if(receipt) {
      await c.query("CREATE TABLE IF NOT EXISTS fingerprint_import_receipts (id text PRIMARY KEY, sha256 text NOT NULL, result jsonb NOT NULL)");
      const prior=await c.query("SELECT sha256,result FROM fingerprint_import_receipts WHERE id=$1",[receipt.id]);
      if(prior.rows[0]) {
        if(prior.rows[0].sha256!==receipt.hash) throw Error("Request ID already used for a different file");
        await c.query("COMMIT");
        return prior.rows[0].result as {id:string;added:Punch[];skipped:number;total:number};
      }
    }
    await c.query("INSERT INTO import_batches(id,filename) VALUES($1,$2)", [
      id,
      filename,
    ]);
    const inserted = await c.query<Punch>(
      `INSERT INTO fingerprint_logs
       SELECT DISTINCT $1::uuid, x.device_emp_id,x.punch_timestamp::timestamp,x.punch_type
       FROM jsonb_to_recordset($2::jsonb) AS x(device_emp_id text,punch_timestamp text,punch_type text)
       WHERE NOT EXISTS (SELECT 1 FROM fingerprint_logs f WHERE f.employee_id=x.device_emp_id AND f.punch_timestamp=x.punch_timestamp::timestamp AND f.punch_type=x.punch_type)
       ON CONFLICT DO NOTHING
       RETURNING employee_id AS device_emp_id,to_char(punch_timestamp,'YYYY-MM-DD"T"HH24:MI:SS') AS punch_timestamp,punch_type`,
      [id, JSON.stringify(punches)],
    );
    const count = await c.query(
      "SELECT count(*) FROM (SELECT DISTINCT employee_id,punch_timestamp,punch_type FROM fingerprint_logs) scans",
    );
    const result = {
      id,
      added: inserted.rows,
      skipped: punches.length - inserted.rows.length,
      total: Number(count.rows[0].count),
    };
    if(receipt) await c.query("INSERT INTO fingerprint_import_receipts(id,sha256,result) VALUES($1,$2,$3)",[receipt.id,receipt.hash,JSON.stringify(result)]);
    await c.query("COMMIT");
    return result;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
