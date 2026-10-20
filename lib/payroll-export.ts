import { OT_RATES } from "./engine";
import { leaveCodes } from "./day-codes";
import type { calculatePayroll } from "./payroll";

export type PayrollReport = ReturnType<typeof calculatePayroll>;
type Row = PayrollReport["rows"][number];
export const EXPORT_GROUPS = [
  {
    id: "salary",
    label: "สรุปค่าจ้างรายเดือนและวันทำงานจริง",
    section: "ข้อมูลประกอบ",
  },
  {
    id: "publicHolidays",
    label: "จำนวนวันหยุดประเพณี (PH / PH8)",
    section: "ข้อมูลประกอบ",
  },
  {
    id: "leave",
    label: "จำนวนวันลาและขาดงาน (WOP / PL / SL / AB)",
    section: "ข้อมูลประกอบ",
  },
  {
    id: "approvedHours",
    label: "ชั่วโมง OT ยืนยันแล้ว",
    section: "ยืนยันแล้ว",
  },
  { id: "approvedMoney", label: "เงิน OT ยืนยันแล้ว", section: "ยืนยันแล้ว" },
  {
    id: "approvedAllowances",
    label: "เบี้ยเลี้ยงและค่ากะยืนยันแล้ว",
    section: "ยืนยันแล้ว",
  },
  {
    id: "approvedGrand",
    label: "เงินรวมยืนยันแล้ว (OT + เบี้ยเลี้ยง + ค่ากะ)",
    section: "ยืนยันแล้ว",
  },
  { id: "pendingHours", label: "ชั่วโมง OT รอยืนยัน", section: "รอยืนยัน" },
  { id: "pendingMoney", label: "เงิน OT รอยืนยัน", section: "รอยืนยัน" },
  {
    id: "pendingAllowances",
    label: "เบี้ยเลี้ยงและค่ากะรอยืนยัน",
    section: "รอยืนยัน",
  },
  {
    id: "pendingGrand",
    label: "เงินรวมรอยืนยัน (OT + เบี้ยเลี้ยง + ค่ากะ)",
    section: "รอยืนยัน",
  },
  {
    id: "rates",
    label: "ค่าจ้างรายวันและอัตรา OT ต่อชั่วโมง",
    section: "ข้อมูลประกอบ",
  },
  {
    id: "notes",
    label: "วันหยุด สแกนไม่ครบ และหมายเหตุ",
    section: "ข้อมูลประกอบ",
  },
] as const;
export type ExportGroup = (typeof EXPORT_GROUPS)[number]["id"];
export function exportPreset(
  preset: "approved" | "pending" | "all",
): ExportGroup[] {
  return EXPORT_GROUPS.filter(
    (g) => preset === "all" || g.id.startsWith(preset),
  ).map((g) => g.id);
}
type Column = {
  label: string;
  value: (row: Row, index: number) => string | number | null;
  sum?: boolean;
  numeric?: boolean;
};
export function buildPayrollExport(
  report: PayrollReport,
  selected: ExportGroup[],
  totals: boolean,
) {
  const columns: Column[] = [
    { label: "No.", value: (_, i) => i + 1 },
    { label: "Employee ID", value: (r) => r.id },
    { label: "Employee Name", value: (r) => r.name },
    { label: "Agency", value: (r) => r.agency },
    { label: "Department", value: (r) => r.department },
    { label: "Period Start", value: () => report.period.from },
    { label: "Period End", value: () => report.period.to },
  ];
  const add = (label: string, value: Column["value"], sum = true) =>
    columns.push({ label, value, sum, numeric: true });
  if (selected.includes("rates")) {
    add(
      "Base Daily Wage (THB/day)",
      (r) => r.rate?.baseDailyWage ?? r.rate?.dailyWage ?? null,
      false,
    );
    add(
      "Wage Service (%)",
      (r) => r.rate?.wageServicePercent ?? r.rate?.servicePercent ?? 0,
      false,
    );
    add("OT Service (%)", (r) => r.rate?.servicePercent ?? 0, false);
    add("Daily Wage incl. Service (THB/day)", (r) => r.rate?.dailyWage ?? null, false);
    for (const rate of OT_RATES)
      add(
        `OT Rate x${rate} (THB/hour)`,
        (r) => r.rate?.rates[rate] ?? null,
        false,
      );
  }
  for (const status of ["approved", "pending"] as const) {
    const label = status === "approved" ? "Approved" : "Pending Approval";
    if (selected.includes(`${status}Hours`)) {
      for (const rate of OT_RATES)
        add(`${label} OT x${rate} (hours)`, (r) => r[`${status}Hours`][rate]);
      add(`Total ${label} OT (hours)`, (r) =>
        OT_RATES.reduce((n, rate) => n + r[`${status}Hours`][rate], 0),
      );
    }
    if (selected.includes(`${status}Money`)) {
      for (const rate of OT_RATES)
        add(
          `${label} OT x${rate} Amount (THB)`,
          (r) => r[`${status}Amounts`][rate],
        );
      add(`Total ${label} OT Amount (THB)`, (r) => r[`${status}Total`]);
      add(
        `${label} OT Service Amount (THB)`,
        (r) => r[`${status}ServiceTotal`],
      );
    }
    if (selected.includes(`${status}Allowances`)) {
      const sumDepartmentAllowance = (r: Row, kind: "seafood" | "frozen") =>
        moneyTotal(
          r.days
            .filter(
              (day) =>
                day.approved === (status === "approved") &&
                day.departmentKind === kind,
            )
            .map((day) => day.departmentAllowance),
        );
      add(
        `${label} Department Allowance (THB)`,
        (r) => r[`${status}Allowances`].department,
      );
      add(`${label} Seafood Allowance (THB)`, (r) =>
        sumDepartmentAllowance(r, "seafood"),
      );
      add(`${label} Frozen Allowance (THB)`, (r) =>
        sumDepartmentAllowance(r, "frozen"),
      );
      add(`${label} Shift Allowance (THB)`, (r) => r[`${status}Allowances`].shift);
      add(
        `Total ${label} Allowances (THB)`,
        (r) => r[`${status}AllowanceTotal`],
      );
    }
    if (selected.includes(`${status}Grand`))
      add(`${label} Total Income (THB)`, (r) =>
        r[`${status}Total`] == null
          ? null
          : r[`${status}Total`]! + r[`${status}AllowanceTotal`],
      );
  }
  if (selected.includes("notes")) {
    columns.push({
      label: "Holidays (code: days)",
      value: (r) =>
        Object.entries(r.holidays)
          .filter(([code]) => !leaveCodes.some((leave) => leave === code))
          .sort()
          .map(([code, n]) => `${code}: ${n}`)
          .join("; "),
    });
    columns.push({
      label: "Notes",
      value: (r) => r.rate?.warnings.join("; ") || "",
    });
  }
  if (selected.includes("notes") || report.rows.some((r) => r.missing > 0)) {
    add("Incomplete Scan Shifts", (r) => r.missing);
    columns.push({
      label: "Incomplete Scan Dates",
      value: (r) => [...new Set(r.days
        .filter((day) => day.missing ?? day.status === "MISSING")
        .map((day) => day.date))].join("; "),
    }, {
      label: "Attendance Calculation Warning",
      value: (r) => r.missing > 0
        ? "Incomplete attendance: attendance-based wages, OT and allowances for incomplete shifts are excluded; review listed dates."
        : "",
    });
  }
  if (selected.includes("leave")) {
    const leaveNames: Record<string, string> = {
      WOP: "Leave without pay",
      PL: "Personal business leave",
      SL: "Sick leave",
      AB: "Absent",
    };
    for (const code of leaveCodes)
      add(
        `${code} ${leaveNames[code] || code} (days)`,
        (r) => r.holidays[code] || 0,
      );
    add("Total Leave and Absence (days)", (r) =>
      leaveCodes.reduce((n, code) => n + (r.holidays[code] || 0), 0),
    );
  }
  if (selected.includes("publicHolidays")) {
    add("PH Public Holidays (days)", (r) => r.holidays.PH || 0);
    add("PH8 Worked Public Holidays (days)", (r) => r.holidays.PH8 || 0);
    add(
      "Total Public Holidays (days)",
      (r) => (r.holidays.PH || 0) + (r.holidays.PH8 || 0),
    );
  }
  if (selected.includes("salary")) {
    add("Worked Days (excluding holidays)", (r) => r.workedDays);
    add(
      "Base Daily Wage (THB/day)",
      (r) => r.rate?.baseDailyWage ?? r.rate?.dailyWage ?? null,
      false,
    );
    add(
      "Wage Service (%)",
      (r) => r.rate?.wageServicePercent ?? r.rate?.servicePercent ?? 0,
      false,
    );
    add(
      "Daily Wage incl. Service (THB/day)",
      (r) => r.rate?.dailyWage ?? null,
      false,
    );
    add("Wages for Actual Workdays (THB)", (r) => r.dailyWageTotal);
    add(
      "Wage Service Amount (THB)",
      (r) => r.wageServiceTotal,
    );
    add("Paid Public Holidays (days)", (r) => r.publicHolidayDays);
    add("Public Holiday Wages (THB)", (r) => r.publicHolidayWage);
    add("Weekly Holidays Worked (days)", (r) => r.weeklyWorkedDays);
    add(
      "Approved Weekly Holiday OT (included in OT total) (THB)",
      (r) => r.weeklyApprovedOTTotal,
    );
    add("Total Holiday Wages (THB)", (r) => r.holidayWageTotal);
    add(
      "Wages + Approved OT + Allowances (THB)",
      (r) => r.salaryWithApprovedOT,
    );
    add("Projected Total incl. Pending Items (THB)", (r) => r.projectedSalary);
  }
  const format = (value: string | number | null, numeric?: boolean) =>
    value === null
      ? "RATE INCOMPLETE"
      : numeric && typeof value === "number"
        ? value.toFixed(2)
        : String(value);
  const records = report.rows.map((r, i) => columns.map((c) => c.value(r, i)));
  const result = [
    columns.map((c) => c.label),
    ...records.map((row) => row.map((v, i) => format(v, columns[i].numeric))),
  ];
  if (totals)
    result.push(
      columns.map((c, i) => {
        if (i === 0) return "GRAND TOTAL";
        if (!c.sum) return "";
        if (records.some((r) => r[i] === null)) return "RATE INCOMPLETE";
        return format(
          records.reduce((n, r) => n + Number(r[i]), 0),
          true,
        );
      }),
    );
  return result;
}

function moneyTotal(values: number[]) {
  return (
    Math.round(
      (values.reduce((sum, value) => sum + value, 0) + Number.EPSILON) * 100,
    ) / 100
  );
}
