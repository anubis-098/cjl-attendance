import {
  OT_RATES,
  emptyOT,
  keyOf,
  reconcile,
  type Data,
  type OTRate,
} from "./engine";
import { normalizeDayCode, leaveCodes } from "./day-codes";
import {
  departmentAllowance,
  standaloneOTRates,
  payableDailyWage,
  wageServicePercent,
  type PayrollSettings,
} from "./payroll-settings";
export type PayrollRate = {
  id: string;
  name: string;
  dailyWage: number | null;
  baseDailyWage?: number;
  servicePercent?: number;
  wageServicePercent?: number;
  rateSource?: "local" | "global";
  holidayWage: number | null;
  rates: Record<OTRate, number | null>;
  row: number;
  warnings: string[];
};
export type PayrollBook = {
  filename: string;
  importedAt: string;
  rows: PayrollRate[];
};
export function payrollPeriod(month: string, cycle: string) {
  if (
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ||
    !["26-25", "calendar"].includes(cycle)
  )
    throw Error("รอบเดือนไม่ถูกต้อง");
  const first = new Date(`${month}-01T12:00:00Z`);
  const previous = new Date(first);
  previous.setUTCMonth(previous.getUTCMonth() - 1);
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  return cycle === "26-25"
    ? { from: previous.toISOString().slice(0, 7) + "-26", to: month + "-25" }
    : { from: month + "-01", to: last.toISOString().slice(0, 10) };
}
export const moneyRound = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;
export function calculatePayroll(
  data: Data,
  month: string,
  cycle: string,
  book?: PayrollBook,
  settings?: PayrollSettings,
) {
  const period = payrollPeriod(month, cycle);
  const rates = new Map(book?.rows.map((r) => [r.id, r]) || []);
  const punches = new Map<string, Data["punches"]>();
  for (const p of data.punches) {
    const list = punches.get(p.device_emp_id) || [];
    list.push(p);
    punches.set(p.device_emp_id, list);
  }
  const groups = new Map<
    string,
    {
      id: string;
      name: string;
      agency: string;
      department: string;
      rate?: PayrollRate;
      approvedHours: ReturnType<typeof emptyOT>;
      pendingHours: ReturnType<typeof emptyOT>;
      holidays: Record<string, number>;
      missing: number;
      workedDays: number;
      approvedAllowances: { department: number; shift: number; days: number };
      pendingAllowances: { department: number; shift: number; days: number };
      days: {
        date: string;
        code: string;
        status: string;
        approved: boolean;
        hours: ReturnType<typeof emptyOT>;
        departmentAllowance: number;
        shiftAllowance: number;
        allowanceNote: string;
        paidWorkday: boolean;
        worked: boolean;
        shiftKind: string;
        departmentKind: "none" | "seafood" | "frozen";
      }[];
    }
  >();
  for (const s of data.shifts) {
    if (s.date < period.from || s.date > period.to) continue;
    const employeeSettings = settings ? { ...settings, ...data.employeePayrollSettings?.[month]?.[s.emp_id] } : undefined;
    let row = groups.get(s.emp_id);
    if (!row) {
      row = {
        id: s.emp_id,
        name: s.emp_name,
        agency: s.agency,
        department: s.department,
        rate: employeeSettings
          ? {
              id: s.emp_id,
              name: s.emp_name,
              dailyWage: payableDailyWage(employeeSettings),
              baseDailyWage: employeeSettings.dailyWage,
              servicePercent: employeeSettings.servicePercent ?? 0,
              wageServicePercent: wageServicePercent(employeeSettings),
              rateSource: data.employeePayrollSettings?.[month]?.[s.emp_id] ? "local" as const : "global" as const,
              holidayWage: null,
              rates: standaloneOTRates(employeeSettings),
              row: 0,
              warnings: [],
            }
          : rates.get(s.emp_id),
        approvedHours: emptyOT(),
        pendingHours: emptyOT(),
        holidays: {},
        missing: 0,
        workedDays: 0,
        approvedAllowances: { department: 0, shift: 0, days: 0 },
        pendingAllowances: { department: 0, shift: 0, days: 0 },
        days: [],
      };
      groups.set(s.emp_id, row);
    }
    const r = reconcile(
      s,
      punches.get(s.device_emp_id) || [],
      data.reviews[keyOf(s)],
    );
    const dayCode = normalizeDayCode(s.shift_code);
    if (r.holiday || leaveCodes.some((code) => code === dayCode))
      row.holidays[dayCode] = (row.holidays[dayCode] || 0) + 1;
    row.missing += Number(r.missing);
    let departmentPay = 0,
      shiftPay = 0,
      allowanceNote = "";
    let departmentKind: "none" | "seafood" | "frozen" = "none";
    const shiftKind = ["M", "D", "A", "N"].includes(dayCode)
      ? dayCode
      : s.base_shift_code || "";
    const worked =
      !r.off &&
      !r.missing &&
      !r.nonWorking &&
      !r.ratePending &&
      r.inMs !== undefined &&
      r.outMs !== undefined &&
      r.outMs > r.inMs;
    const paidWorkday = worked && !r.holiday;
    if (
      paidWorkday &&
      !row.days.some((day) => day.date === s.date && day.paidWorkday)
    )
      row.workedDays++;
    if (settings && worked && !r.holiday) {
      const kind = departmentAllowance(
        s.department,
        settings,
        s.source_department,
      );
      departmentKind = kind;
      departmentPay = kind === "none" ? 0 : settings[kind];
      const code = normalizeDayCode(s.shift_code);
      const baseCode = ["M", "D", "A", "N"].includes(code)
        ? code
        : s.base_shift_code;
      shiftPay =
        baseCode === "M"
          ? settings.morning
          : baseCode === "A"
            ? settings.afternoon
            : baseCode === "N"
              ? settings.night
              : 0;
      allowanceNote =
        baseCode === "D"
          ? "กะ D ไม่มีค่ากะ"
          : !["M", "A", "N"].includes(baseCode || "")
            ? "ไม่พบกะหลัก M/A/N/D กรุณาตรวจ Master"
            : "";
      const allowances = r.approved
        ? row.approvedAllowances
        : row.pendingAllowances;
      allowances.department = moneyRound(allowances.department + departmentPay);
      allowances.shift = moneyRound(allowances.shift + shiftPay);
      allowances.days++;
    } else if (settings) {
      allowanceNote = !worked
        ? "ไม่นับเบี้ยเลี้ยง: ไม่มีเวลาทำงานครบหรือเป็นวันลา/ขาดงาน"
        : "ไม่จ่ายเบี้ยเลี้ยงในวันหยุด";
    }
    for (const rate of OT_RATES)
      (r.approved ? row.approvedHours : row.pendingHours)[rate] +=
        r.rawOT[rate];
    row.days.push({
      date: s.date,
      code: s.shift_code,
      status: r.status,
      approved: r.approved,
      hours: r.rawOT,
      departmentAllowance: departmentPay,
      shiftAllowance: shiftPay,
      allowanceNote,
      paidWorkday,
      worked,
      shiftKind,
      departmentKind,
    });
  }
  const rows = [...groups.values()]
    .map((row) => {
      const amounts = (hours: ReturnType<typeof emptyOT>) =>
        Object.fromEntries(
          OT_RATES.map((r) => [
            r,
            hours[r] === 0
              ? 0
              : row.rate?.rates[r] == null
                ? null
                : moneyRound(hours[r] * row.rate.rates[r]!),
          ]),
        ) as Record<OTRate, number | null>;
      const approvedAmounts = amounts(row.approvedHours),
        pendingAmounts = amounts(row.pendingHours);
      const total = (values: Record<OTRate, number | null>) =>
        Object.values(values).some((v) => v === null)
          ? null
          : moneyRound(
              Object.values(values).reduce<number>(
                (sum, v) => sum + (v || 0),
                0,
              ),
            );
      const dailyWageTotal =
        row.workedDays === 0
          ? 0
          : row.rate?.dailyWage == null
            ? null
            : moneyRound(row.workedDays * row.rate.dailyWage);
      const approvedTotal = total(approvedAmounts),
        pendingTotal = total(pendingAmounts);
      const wageServiceTotal = dailyWageTotal === null ? null : row.rate?.baseDailyWage === undefined ? 0
        : moneyRound(dailyWageTotal - moneyRound(row.workedDays * row.rate.baseDailyWage));
      const otService = (hours: ReturnType<typeof emptyOT>, amount: number | null) => {
        if (amount === null) return null;
        if (row.rate?.baseDailyWage === undefined || !row.rate.servicePercent) return 0;
        const base = OT_RATES.reduce((sum, rate) => sum + moneyRound(hours[rate] * row.rate!.baseDailyWage! / 8 * Number(rate)), 0);
        return moneyRound(amount - base);
      };
      const holidayDays = (codes: string[]) =>
        new Set(
          row.days
            .filter((day) => codes.includes(normalizeDayCode(day.code)))
            .map((day) => day.date),
        ).size;
      const publicHolidayDays = holidayDays(["PH", "PH8"]);
      const weeklyHolidayDays = holidayDays(["H", "H8"]);
      const holidayPay = (days: number) =>
        days === 0
          ? 0
          : row.rate?.dailyWage == null
            ? null
            : moneyRound(days * row.rate.dailyWage);
      const publicHolidayWage = holidayPay(publicHolidayDays);
      // Weekly rest days earn OT only when worked; no flat daily wage.
      const weeklyHolidayWage = 0;
      const weeklyDays = row.days.filter(
        (day) => ["H", "H8"].includes(normalizeDayCode(day.code)) && day.worked,
      );
      const weeklyWorkedDays = new Set(weeklyDays.map((day) => day.date)).size;
      const weeklyHours = emptyOT();
      for (const day of weeklyDays.filter((day) => day.approved)) {
        for (const rate of OT_RATES) weeklyHours[rate] += day.hours[rate];
      }
      const weeklyApprovedOTTotal = total(amounts(weeklyHours));
      const holidayWageTotal =
        publicHolidayWage === null || weeklyHolidayWage === null
          ? null
          : moneyRound(publicHolidayWage + weeklyHolidayWage);
      const salaryWithApprovedOT =
        dailyWageTotal === null ||
        approvedTotal === null ||
        holidayWageTotal === null
          ? null
          : moneyRound(
              dailyWageTotal +
                holidayWageTotal +
                approvedTotal +
                row.approvedAllowances.department +
                row.approvedAllowances.shift,
            );
      const projectedSalary =
        salaryWithApprovedOT === null || pendingTotal === null
          ? null
          : moneyRound(
              salaryWithApprovedOT +
                pendingTotal +
                row.pendingAllowances.department +
                row.pendingAllowances.shift,
            );
      return {
        ...row,
        dailyWageTotal,
        wageServiceTotal,
        approvedServiceTotal: otService(row.approvedHours, approvedTotal),
        pendingServiceTotal: otService(row.pendingHours, pendingTotal),
        publicHolidayDays,
        weeklyHolidayDays,
        weeklyWorkedDays,
        weeklyApprovedOTTotal,
        publicHolidayWage,
        weeklyHolidayWage,
        holidayWageTotal,
        salaryWithApprovedOT,
        projectedSalary,
        approvedAmounts,
        pendingAmounts,
        approvedTotal: total(approvedAmounts),
        pendingTotal: total(pendingAmounts),
        approvedAllowanceTotal: moneyRound(
          row.approvedAllowances.department + row.approvedAllowances.shift,
        ),
        pendingAllowanceTotal: moneyRound(
          row.pendingAllowances.department + row.pendingAllowances.shift,
        ),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  return { period, rows };
}
