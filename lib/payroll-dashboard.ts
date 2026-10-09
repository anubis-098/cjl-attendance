import { OT_RATES } from "./engine";

import { moneyRound, type calculatePayroll } from "./payroll";

type Rows = ReturnType<typeof calculatePayroll>["rows"];
export type PayrollCard = {
  title: string;
  count: number;
  unit: "ชม." | "คน-วัน" | "คน" | "วัน";
  amount: number | null;
  sensitive?: boolean;
};
const sumMoney = (values: (number | null)[]) =>
  values.some((v) => v === null)
    ? null
    : moneyRound(values.reduce<number>((sum, value) => sum + (value ?? 0), 0));

export function payrollDashboard(rows: Rows): PayrollCard[] {
  const days = rows.flatMap((row) => row.days);
  const allowance = (
    title: string,
    predicate: (day: Rows[number]["days"][number]) => boolean,
    field: "shiftAllowance" | "departmentAllowance",
  ): PayrollCard => {
    const selected = days.filter(
      (day) => day.approved && day.paidWorkday && predicate(day),
    );
    return {
      title,
      count: selected.length,
      unit: "วัน",
      amount: sumMoney(selected.map((day) => day[field])),
    };
  };
  const ot = OT_RATES.map((rate) => ({
    title: `OT x${rate} ยืนยันแล้ว`,
    unit: "ชม." as const,
    count: rows.reduce((sum, row) => sum + row.approvedHours[rate], 0),
    amount: sumMoney(rows.map((row) => row.approvedAmounts[rate])),
  }));
  return [
    ...ot,
    allowance("ค่ากะเช้า", (day) => day.shiftKind === "M", "shiftAllowance"),
    allowance("ค่ากะบ่าย", (day) => day.shiftKind === "A", "shiftAllowance"),
    allowance("ค่ากะดึก", (day) => day.shiftKind === "N", "shiftAllowance"),
    allowance(
      "รวมค่ากะ",
      (day) => ["M", "A", "N"].includes(day.shiftKind),
      "shiftAllowance",
    ),
    allowance(
      "ค่าความคาว",
      (day) => day.departmentKind === "seafood",
      "departmentAllowance",
    ),
    allowance(
      "ค่าความเย็น",
      (day) => day.departmentKind === "frozen",
      "departmentAllowance",
    ),
    allowance(
      "รวมค่าเย็น + คาว",
      (day) => day.departmentKind !== "none",
      "departmentAllowance",
    ),
    {
      title: "รวมค่าโอที",
      count: ot.reduce((sum, card) => sum + card.count, 0),
      unit: "ชม.",
      amount: sumMoney(rows.map((row) => row.approvedTotal)),
    },
    {
      title: "ค่าวันหยุดนักขัตฤกษ์",
      count: rows.reduce((sum, row) => sum + row.publicHolidayDays, 0),
      unit: "วัน",
      amount: sumMoney(rows.map((row) => row.publicHolidayWage)),
      sensitive: true,
    },
    {
      title: "วันหยุดประจำสัปดาห์",
      count: rows.reduce((sum, row) => sum + row.weeklyWorkedDays, 0),
      unit: "วัน",
      amount: sumMoney(rows.map((row) => row.weeklyApprovedOTTotal)),
      sensitive: true,
    },
    {
      title: "วันทำงานปกติ",
      count: rows.reduce((sum, row) => sum + row.workedDays, 0),
      unit: "วัน",
      amount: sumMoney(rows.map((row) => row.dailyWageTotal)),
      sensitive: true,
    },
    {
      title: "รวมเงินได้ทั้งหมด",
      count: rows.length,
      unit: "คน",
      amount: sumMoney(rows.map((row) => row.salaryWithApprovedOT)),
      sensitive: true,
    },
  ];
}
