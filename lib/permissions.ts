import type { Data } from "./engine";
export type AccountRole = "super_admin" | "supervisor" | "guest" | "employee";
export const roleLabels: Record<AccountRole, string> = { super_admin: "Super Admin", supervisor: "Supervisor", guest: "Guest", employee: "Employee" };
export const canManageAttendance = (role: AccountRole) => role === "super_admin" || role === "supervisor";
export const canViewMoney = canManageAttendance;
export function visibleWorkspace<T extends { data: Data; employees: { employee_id: string; shift_data?: unknown }[]; employeeCount: number; revision: number }>(workspace: T, account: { role: AccountRole; employeeId?: string | null }) {
  if (canManageAttendance(account.role)) return workspace;
  const own = account.role === "employee";
  const matches = (id: string) => !own || (!!account.employeeId && id === account.employeeId);
  const shifts = workspace.data.shifts.filter(s => matches(s.emp_id));
  const devices = new Set(shifts.map(s => s.device_emp_id));
  const employees = workspace.employees.filter(e => matches(e.employee_id)).map(e => ({ employee_id: e.employee_id }));
  // Explicit allowlist: never send payroll books, settings, raw import fields or audit payloads.
  const data: Data = {
    calculationVersion: workspace.data.calculationVersion,
    shifts,
    punches: workspace.data.punches.filter(p => !own || devices.has(p.device_emp_id)),
    reviews: Object.fromEntries(Object.entries(workspace.data.reviews).filter(([key]) => matches(key.split("|")[0]))),
    audit: [],
    evidenceImageCounts: Object.fromEntries(Object.entries(workspace.data.evidenceImageCounts || {}).filter(([key]) => matches(key.split("|")[0]))),
    companyHolidays: workspace.data.companyHolidays,
    calendarRemarks: workspace.data.calendarRemarks?.filter(r => !r.employeeId || matches(r.employeeId)),
    shiftOverrides: Object.fromEntries(Object.entries(workspace.data.shiftOverrides || {}).filter(([key]) => matches(key.split("|")[0]))),
  };
  return { data, employees, employeeCount: employees.length, revision: workspace.revision };
}
