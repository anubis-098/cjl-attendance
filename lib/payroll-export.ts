import { OT_RATES } from "./engine";
import { leaveCodes, dayCodeLabels } from "./day-codes";
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
    { label: "ลำดับ", value: (_, i) => i + 1 },
    { label: "รหัสพนักงาน", value: (r) => r.id },
    { label: "ชื่อ-นามสกุล", value: (r) => r.name },
    { label: "แผนก", value: (r) => r.department },
    { label: "Agency", value: (r) => r.agency },
    { label: "เริ่มรอบ", value: () => report.period.from },
    { label: "สิ้นสุดรอบ", value: () => report.period.to },
  ];
  const add = (label: string, value: Column["value"], sum = true) =>
    columns.push({ label, value, sum, numeric: true });
  if (selected.includes("rates")) {
    add("ค่าจ้างฐานรายวัน (บาท)", (r) => r.rate?.baseDailyWage ?? r.rate?.dailyWage ?? null, false);
    add("Service ค่าแรง (%)", (r) => r.rate?.wageServicePercent ?? r.rate?.servicePercent ?? 0, false);
    add("Service OT (%)", (r) => r.rate?.servicePercent ?? 0, false);
    add("ค่าจ้างรายวัน (บาท)", (r) => r.rate?.dailyWage ?? null, false);
    for (const rate of OT_RATES)
      add(
        `อัตรา OT x${rate} (บาท/ชม.)`,
        (r) => r.rate?.rates[rate] ?? null,
        false,
      );
  }
  for (const status of ["approved", "pending"] as const) {
    const label = status === "approved" ? "ยืนยันแล้ว" : "รอยืนยัน";
    if (selected.includes(`${status}Hours`)) {
      for (const rate of OT_RATES)
        add(`OT ${label} x${rate} (ชม.)`, (r) => r[`${status}Hours`][rate]);
      add(`รวม OT ${label} (ชม.)`, (r) =>
        OT_RATES.reduce((n, rate) => n + r[`${status}Hours`][rate], 0),
      );
    }
    if (selected.includes(`${status}Money`)) {
      for (const rate of OT_RATES)
        add(
          `เงิน OT ${label} x${rate} (บาท)`,
          (r) => r[`${status}Amounts`][rate],
        );
      add(`รวมเงิน OT ${label} (บาท)`, (r) => r[`${status}Total`]);
      add(`Service รวมอยู่ในเงิน OT ${label} (บาท)`, (r) => r[`${status}ServiceTotal`]);
    }
    if (selected.includes(`${status}Allowances`)) {
      add(
        `เบี้ยเลี้ยงแผนก${label} (บาท)`,
        (r) => r[`${status}Allowances`].department,
      );
      add(`ค่ากะ${label} (บาท)`, (r) => r[`${status}Allowances`].shift);
      add(
        `รวมเบี้ยเลี้ยงและค่ากะ${label} (บาท)`,
        (r) => r[`${status}AllowanceTotal`],
      );
    }
    if (selected.includes(`${status}Grand`))
      add(`เงินรวม${label} (OT + เบี้ยเลี้ยง + ค่ากะ) (บาท)`, (r) =>
        r[`${status}Total`] == null
          ? null
          : r[`${status}Total`]! + r[`${status}AllowanceTotal`],
      );
  }
  if (selected.includes("notes")) {
    columns.push({
      label: "วันหยุด (รหัส: จำนวนวัน)",
      value: (r) =>
        Object.entries(r.holidays)
          .filter(([code]) => !leaveCodes.some((leave) => leave === code))
          .sort()
          .map(([code, n]) => `${code}: ${n}`)
          .join("; "),
    });
    add("สแกนไม่ครบ (กะ)", (r) => r.missing);
    columns.push({
      label: "หมายเหตุ",
      value: (r) => r.rate?.warnings.join("; ") || "",
    });
  }
  if (selected.includes("leave")) {
    for (const code of leaveCodes)
      add(
        `${code} · ${dayCodeLabels[code]} (วัน)`,
        (r) => r.holidays[code] || 0,
      );
    add("รวมวันลาและขาดงาน (วัน)", (r) =>
      leaveCodes.reduce((n, code) => n + (r.holidays[code] || 0), 0),
    );
  }
  if (selected.includes("publicHolidays")) {
    add("PH วันหยุดประเพณี (วัน)", (r) => r.holidays.PH || 0);
    add("PH8 มาทำงานวันประเพณี (วัน)", (r) => r.holidays.PH8 || 0);
    add(
      "รวมวันหยุดประเพณี (วัน)",
      (r) => (r.holidays.PH || 0) + (r.holidays.PH8 || 0),
    );
  }
  if (selected.includes("salary")) {
    add("วันทำงานจริง ไม่รวมวันหยุด (วัน)", (r) => r.workedDays);
    add("ฐานค่าจ้างรายวัน (บาท/วัน)", (r) => r.rate?.baseDailyWage ?? r.rate?.dailyWage ?? null, false);
    add("Service ค่าจ้าง (%)", (r) => r.rate?.wageServicePercent ?? r.rate?.servicePercent ?? 0, false);
    add("ค่าจ้างรายวันรวม Service (บาท/วัน)", (r) => r.rate?.dailyWage ?? null, false);
    add("ค่าจ้างตามวันทำงานจริง (บาท)", (r) => r.dailyWageTotal);
    add("Service รวมอยู่ในค่าจ้างวันทำงานจริง (บาท)", (r) => r.wageServiceTotal);
    add("วันหยุดนักขัตฤกษ์ที่จ่ายค่าจ้าง (วัน)", (r) => r.publicHolidayDays);
    add("ค่าวันหยุดนักขัตฤกษ์ (บาท)", (r) => r.publicHolidayWage);
    add("วันหยุดประจำสัปดาห์ที่มาทำงาน (วัน)", (r) => r.weeklyWorkedDays);
    add("OT วันหยุดประจำสัปดาห์ยืนยันแล้ว รวมอยู่ในยอด OT (บาท)", (r) => r.weeklyApprovedOTTotal);
    add("รวมค่าจ้างวันหยุด (บาท)", (r) => r.holidayWageTotal);
    add(
      "รวมค่าจ้าง + OT และเบี้ยเลี้ยงยืนยันแล้ว (บาท)",
      (r) => r.salaryWithApprovedOT,
    );
    add("ยอดประมาณการ รวมรายการรอยืนยัน (บาท)", (r) => r.projectedSalary);
  }
  const format = (value: string | number | null, numeric?: boolean) =>
    value === null
      ? "อัตราไม่ครบ"
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
        if (i === 0) return "รวมทั้งหมด";
        if (!c.sum) return "";
        if (records.some((r) => r[i] === null)) return "อัตราไม่ครบ";
        return format(
          records.reduce((n, r) => n + Number(r[i]), 0),
          true,
        );
      }),
    );
  return result;
}
