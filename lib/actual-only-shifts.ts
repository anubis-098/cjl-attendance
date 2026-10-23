import { clock, isoLocal, type Punch, type Shift } from "./engine";
import { pairActualScans } from "./actual-timeline";
import { MASTER_HEADERS } from "./source-headers";
import type { EmployeeRow } from "./master-data";
import { normalizeDepartment } from "./departments";

/** Build display-only calendar anchors when a Master row has scans but its
 * shift times are invalid. These rows never enter attendance or payroll data. */
export function buildActualOnlyShifts(employees: EmployeeRow[], punches: Punch[]): Shift[] {
  const punchMap = new Map<string, Punch[]>();
  for (const punch of punches) {
    const list = punchMap.get(punch.device_emp_id) || [];
    list.push(punch);
    punchMap.set(punch.device_emp_id, list);
  }

  const shifts: Shift[] = [];
  for (const employee of employees) {
    if (employee.shift_data) continue;
    const logs = punchMap.get(employee.employee_id) || [];
    if (!logs.length) continue;
    const byDate = new Map<string, { start: number; end: number }>();
    for (const interval of pairActualScans(logs)) {
      const start = interval.inMs ?? interval.start;
      const date = isoLocal(interval.start).slice(0, 10);
      if (byDate.has(date)) continue;
      byDate.set(date, { start, end: interval.outMs ?? start + 8 * 60 * 60 * 1000 });
    }

    const name = employee.source_data[MASTER_HEADERS[2]] || employee.employee_id;
    const section = employee.source_data.Section || employee.source_data[MASTER_HEADERS[3]] || "";
    for (const [date, interval] of byDate) {
      shifts.push({
        emp_id: employee.employee_id,
        device_emp_id: employee.employee_id,
        emp_name: name,
        department: normalizeDepartment(section),
        source_department: section,
        agency: employee.source_data.Sup || "",
        date,
        shift_code: "ACTUAL",
        shift_start: clock(interval.start),
        shift_end: clock(interval.end),
        requested_ot_hrs: 0,
        requested_ot_known: false,
        ot_task_target: "",
        source_day_code: "ACTUAL_ONLY",
      });
    }
  }
  return shifts;
}
