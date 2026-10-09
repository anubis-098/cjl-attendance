import { normalizeDepartment } from "./departments";

export const EMPLOYEE_FILTERS = [
  { key: "department", header: "แผนก", label: "แผนก" },
  { key: "warehouse", header: "คลัง", label: "คลัง" },
  { key: "shift", header: "กะทำงาน", label: "กะทำงาน" },
  { key: "hours", header: "เวลาทำงาน", label: "เวลาทำงาน" },
  { key: "agency", header: "Sup", label: "บริษัท (Sup)" },
  { key: "area", header: "Area", label: "พื้นที่ (Area)" },
  { key: "employmentStatus", header: "Satatus", label: "สถานะ (Satatus)" },
  { key: "status", header: "Status", label: "สถานะ (Status)" },
] as const;

export function employeeFilterValue(key: string, value: string) {
  return key === "department" ? normalizeDepartment(value) : value.trim();
}
