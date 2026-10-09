import { OT_RATES, type OTRate } from "./engine";
import { normalizeDepartment } from "./departments";

export type DepartmentAllowance = "none" | "seafood" | "frozen";
export type PayrollSettings = {
  dailyWage: number;
  servicePercent?: number;
  wageServicePercent?: number;
  seafood: number;
  frozen: number;
  morning: number;
  afternoon: number;
  night: number;
  departments: Record<string, DepartmentAllowance>;
};
export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
  dailyWage: 357,
  servicePercent: 8,
  wageServicePercent: 20,
  seafood: 12.36,
  frozen: 51.5,
  morning: 20.6,
  afternoon: 41.2,
  night: 72.1,
  departments: {},
};
export const payrollSettingFields = [
  ["dailyWage", "ค่าจ้างฐาน / วัน"],
  ["wageServicePercent", "Service ค่าแรง"],
  ["servicePercent", "Service OT"],
  ["seafood", "Seafood · ค่าความคาว / วัน"],
  ["frozen", "Frozen · ค่าเย็น / วัน"],
  ["morning", "Morning · ค่ากะเช้า / วัน"],
  ["afternoon", "Afternoon · ค่ากะบ่าย / วัน"],
  ["night", "Night · ค่ากะดึก / วัน"],
] as const;
// Saved pre-service rates are already payable rates. Do not add 8% again.
export function resolvePayrollSettings(saved?: PayrollSettings): PayrollSettings {
  return saved ? { ...saved } : { ...DEFAULT_PAYROLL_SETTINGS, departments: {} };
}
export function payableDailyWage(settings: PayrollSettings) {
  return Math.round(Math.round(settings.dailyWage * 100) * (10000 + Math.round(wageServicePercent(settings) * 100)) / 10000) / 100;
}
// Preserve explicitly saved historical rates until an administrator changes that month.
export function wageServicePercent(settings: PayrollSettings) {
  return settings.wageServicePercent ?? settings.servicePercent ?? 0;
}
export function departmentAllowance(
  department: string,
  settings: PayrollSettings,
  sourceDepartment = department,
): DepartmentAllowance {
  const canonical = normalizeDepartment(department);
  if (Object.hasOwn(settings.departments, canonical))
    return settings.departments[canonical];
  if (Object.hasOwn(settings.departments, sourceDepartment))
    return settings.departments[sourceDepartment];
  const previous = new Set(
    Object.entries(settings.departments)
      .filter(([key]) => normalizeDepartment(key) === canonical)
      .map(([, value]) => value),
  );
  if (previous.size === 1) return [...previous][0];
  if (Object.hasOwn(settings.departments, department))
    return settings.departments[department];
  const name = canonical.toLowerCase();
  if (["seafood", "saefood", "sf"].includes(name)) return "seafood";
  if (["frozen", "frozen cdc"].includes(name)) return "frozen";
  return "none";
}
export function standaloneOTRates(
  settings: PayrollSettings,
): Record<OTRate, number> {
  return Object.fromEntries(
    OT_RATES.map((rate) => [
      rate,
      // Round the Service-inclusive hourly rate to satang before hours.
      // Integer cents/basis points avoid binary midpoint rounding errors.
      Math.round(Math.round(settings.dailyWage * 100) * (10000 + Math.round((settings.servicePercent ?? 0) * 100)) * Number(rate) / 80000) / 100,
    ]),
  ) as Record<OTRate, number>;
}
export function validatePayrollSettings(input: unknown): PayrollSettings {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw Error("การตั้งค่าไม่ถูกต้อง");
  const settings = input as PayrollSettings;
  for (const key of ["servicePercent", "wageServicePercent"] as const)
    if (Object.hasOwn(settings, key) && settings[key] == null) throw Error("Service ไม่ถูกต้อง");
  for (const [key] of payrollSettingFields) {
    const value = key === "wageServicePercent" ? wageServicePercent(settings) : key === "servicePercent" ? settings[key] ?? 0 : settings[key];
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > (key.endsWith("Percent") ? 100 : 100000) ||
      Math.abs(value * 100 - Math.round(value * 100)) > 0.000001 ||
      (key === "dailyWage" && value === 0)
    )
      throw Error(
        "กรุณาระบุอัตราเป็นจำนวนเงินทศนิยมไม่เกิน 2 ตำแหน่ง และค่าจ้างต้องมากกว่า 0",
      );
  }
  if (
    !settings.departments ||
    typeof settings.departments !== "object" ||
    Array.isArray(settings.departments) ||
    Object.keys(settings.departments).length > 1000 ||
    Object.entries(settings.departments).some(
      ([key, value]) =>
        key.length > 200 || !["none", "seafood", "frozen"].includes(value),
    )
  )
    throw Error("เงื่อนไขเบี้ยเลี้ยงหรือแผนกไม่ถูกต้อง");
  return {
    ...Object.fromEntries(
      payrollSettingFields.map(([key]) => [key, settings[key]]),
    ),
    departments: { ...settings.departments },
    servicePercent: settings.servicePercent ?? 0,
    wageServicePercent: wageServicePercent(settings),
  } as PayrollSettings;
}
