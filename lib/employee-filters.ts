import { normalizeDepartment } from "./departments";

export const EMPLOYEE_FILTERS = [
  { key: "department", header: "แผนก", label: "แผนก" },
  { key: "section", header: "Section", label: "Section" },
  { key: "shift", header: "กะทำงาน", label: "กะทำงาน" },
  { key: "hours", header: "เวลาทำงาน", label: "เวลาทำงาน" },
  { key: "weeklyHoliday", header: "วันหยุด", label: "วันหยุดประจำสัปดาห์" },
  { key: "agency", header: "Sup", label: "บริษัท (Sup)" },
  { key: "status", header: "Status", label: "สถานะ (Status)" },
  { key: "contract", header: "Contract", label: "ประเภทสัญญา" },
] as const;

export function employeeFilterValue(key: string, value: string) {
  return ["department", "section"].includes(key)
    ? normalizeDepartment(value)
    : value.trim();
}
