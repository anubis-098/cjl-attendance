import type { Data } from "./engine";

export function prepareMasterImport(data: Data, employeeIds: string[]): Data {
  const importedIds = new Set(employeeIds);
  return {
    ...data,
    // Refresh only generated master-plan rows. Keep daily schedules, reviews,
    // manual scan pairs, OT approvals, break choices, shift overrides, and audit.
    shifts: data.shifts.filter((shift) => !(importedIds.has(shift.emp_id) && shift.source_day_code === "MASTER")),
  };
}
