import type { Data } from "./engine";

export function prepareEmployeeMerge(data: Data, employeeIds: string[]): Data {
  const importedIds = new Set(employeeIds);
  return {
    ...data,
    shifts: data.shifts.filter((shift) => !(importedIds.has(shift.emp_id) && shift.source_day_code === "MASTER")),
    reviews: Object.fromEntries(Object.entries(data.reviews).filter(([key]) => !importedIds.has(key.slice(0, key.lastIndexOf("|"))))),
  };
}
