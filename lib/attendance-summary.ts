import { isoLocal, type Shift, type Punch } from "./engine";
import { punchTime } from "./shift-window";
import { normalizeDayCode, nonWorkingCodes } from "./day-codes";

export function scheduledEmployeeCount(shifts: Shift[], date: string) {
  return new Set(shifts.filter(s => {
    const code = normalizeDayCode(s.shift_code);
    return s.date === date && !nonWorkingCodes.has(code) && !["H", "PH", "OFF"].includes(code) && !!s.shift_start && !!s.shift_end;
  }).map(s => s.emp_id)).size;
}

export function attendancePeriod(date: string, view: string, rangeEnd?: string) {
  const base = Date.parse(date + "T00:00:00Z");
  const start = view === "range" ? date : view === "month" ? date.slice(0, 7) + "-01"
    : new Date(base - ((new Date(base).getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
  const end = Date.parse((rangeEnd || date) + "T00:00:00Z");
  const count = view === "range" ? Math.max(1, Number.isFinite(end) ? Math.floor((end - base) / 86400000) + 1 : 1)
    : view === "month" ? new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0).getDate()
    : view === "biweek" ? 14 : 7;
  return { start, count };
}

// Presence means at least one raw scan on a selected Bangkok calendar date.
// It is not a statement about complete attendance, paid work, or OT approval.
export function scannedEmployees(shifts: Shift[], punches: Punch[], dates: string[]) {
  const employeeByDevice = new Map(shifts.map(s => [s.device_emp_id, s.emp_id]));
  const wanted = new Set(dates), seen = new Set<string>();
  for (const p of punches) {
    const employee = employeeByDevice.get(p.device_emp_id);
    const ms = punchTime(p.punch_timestamp);
    if (employee && Number.isFinite(ms) && wanted.has(isoLocal(ms).slice(0, 10))) seen.add(employee);
  }
  return seen.size;
}
