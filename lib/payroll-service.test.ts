import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PAYROLL_SETTINGS, resolvePayrollSettings, standaloneOTRates, validatePayrollSettings, payableDailyWage } from "./payroll-settings";
import { calculatePayroll, moneyRound } from "./payroll";
import { buildPayrollExport } from "./payroll-export";
import { OT_RULES_VERSION, type Data } from "./engine";

const fixture = (): Data => ({
  shifts: ["LOCAL", "GLOBAL"].map(id => ({ emp_id: id, device_emp_id: id, emp_name: id, agency: "Test", department: "Frozen", date: "2026-09-14", shift_code: "M", shift_start: "08:00", shift_end: "17:00", requested_ot_hrs: 0, ot_task_target: "" })),
  punches: ["LOCAL", "GLOBAL"].flatMap(id => [{ device_emp_id: id, punch_timestamp: "2026-09-14 08:00:00", punch_type: "IN" as const }, { device_emp_id: id, punch_timestamp: "2026-09-14 19:00:00", punch_type: "OUT" as const }]),
  reviews: { "LOCAL|2026-09-14": { approved: true, otRulesVersion: OT_RULES_VERSION, overBudget: false, note: "" } }, audit: [],
  employeePayrollSettings: { "2026-09": { LOCAL: { dailyWage: 400 } } },
});

test("Service is applied once to base wages and OT, with fixed allowances and local/global separation", () => {
  const data = fixture(), snapshot = JSON.stringify(data);
  const report = calculatePayroll(data, "2026-09", "calendar", undefined, DEFAULT_PAYROLL_SETTINGS);
  const global = report.rows.find(row => row.id === "GLOBAL")!, local = report.rows.find(row => row.id === "LOCAL")!;
  assert.equal(global.rate?.baseDailyWage, 357);
  assert.equal(global.dailyWageTotal, 428.4);
  assert.equal(global.pendingAmounts["1.5"], 144.58);
  assert.equal(global.wageServiceTotal, 71.4);
  assert.equal(global.pendingServiceTotal, 10.7);
  assert.equal(global.pendingAllowanceTotal, 72.1);
  assert.equal(global.projectedSalary, 645.08);
  assert.equal(local.rate?.rateSource, "local");
  assert.equal(local.dailyWageTotal, 480);
  assert.equal(local.approvedAmounts["1.5"], 162);
  assert.equal(local.approvedAllowanceTotal, 72.1);
  assert.equal(local.salaryWithApprovedOT, 714.1);
  assert.equal(JSON.stringify(data), snapshot);
  const csv = buildPayrollExport(report, ["salary", "rates", "approvedMoney", "pendingMoney"], true);
  const row = csv.find(row => row[csv[0].indexOf("รหัสพนักงาน")] === "GLOBAL")!;
  assert.equal(row[csv[0].indexOf("ฐานค่าจ้างรายวัน (บาท/วัน)")], "357.00");
  assert.equal(row[csv[0].indexOf("Service OT (%)")], "8.00");
  assert.equal(row[csv[0].indexOf("รวมเงิน OT รอยืนยัน (บาท)")], "144.58");
  assert.equal(row[csv[0].indexOf("ยอดประมาณการ รวมรายการรอยืนยัน (บาท)")], "645.08");
});

test("rates round to satang before hours, and Service can be changed or disabled", () => {
  for (const servicePercent of [0, 8, 10, 12.5]) {
    const settings = { ...DEFAULT_PAYROLL_SETTINGS, servicePercent };
    const rates = standaloneOTRates(settings);
    for (const multiplier of ["1.0", "1.5", "2.0", "3.0"] as const)
      assert.equal(moneyRound(rates[multiplier] * 2), moneyRound(moneyRound(357 / 8 * Number(multiplier) * (1 + servicePercent / 100)) * 2));
  }
  assert.equal(standaloneOTRates(DEFAULT_PAYROLL_SETTINGS)["1.0"], 48.2);
  assert.equal(moneyRound(standaloneOTRates(DEFAULT_PAYROLL_SETTINGS)["1.5"] * 2), 144.58);
  for (const servicePercent of [-1, 101, 1.234, NaN, Infinity, "8", null])
    assert.throws(() => validatePayrollSettings({ ...DEFAULT_PAYROLL_SETTINGS, servicePercent }));
});

test("historical saved payable rates are not charged Service again or re-rounded", () => {
  const { servicePercent: _, wageServicePercent: __, ...old } = DEFAULT_PAYROLL_SETTINGS;
  const saved = { ...old, dailyWage: 385.56 };
  const resolved = resolvePayrollSettings(saved);
  assert.equal(resolved.dailyWage, 385.56);
  assert.equal(resolved.servicePercent, undefined);
  assert.equal(standaloneOTRates(resolved)["1.5"], 72.29);
  assert.equal(resolvePayrollSettings().dailyWage, 357);
  const data = fixture();
  delete data.employeePayrollSettings;
  const row = calculatePayroll(data, "2026-09", "calendar", undefined, resolved).rows[0];
  assert.equal(row.dailyWageTotal, 385.56);
  assert.equal(row.pendingTotal, 144.58);
});

test("local wages can be reset and never leak to a different pay month", () => {
  const data = fixture();
  delete data.employeePayrollSettings!["2026-09"].LOCAL;
  assert.equal(calculatePayroll(data, "2026-09", "calendar", undefined, DEFAULT_PAYROLL_SETTINGS).rows.find(row => row.id === "LOCAL")!.dailyWageTotal, 428.4);
  const october = fixture();
  october.shifts.forEach(s => s.date = s.date.replace("2026-09", "2026-10"));
  october.punches.forEach(p => p.punch_timestamp = p.punch_timestamp.replace("2026-09", "2026-10"));
  assert.equal(calculatePayroll(october, "2026-10", "calendar", undefined, DEFAULT_PAYROLL_SETTINGS).rows.find(row => row.id === "LOCAL")!.dailyWageTotal, 428.4);
});

 test("wage Service and OT Service are independent, including saved legacy settings", () => {
   const wage = { ...DEFAULT_PAYROLL_SETTINGS, wageServicePercent: 35 };
   assert.equal(payableDailyWage(wage), 481.95);
   assert.deepEqual(standaloneOTRates(wage), standaloneOTRates(DEFAULT_PAYROLL_SETTINGS));
   const ot = { ...DEFAULT_PAYROLL_SETTINGS, servicePercent: 20 };
   assert.equal(payableDailyWage(ot), 428.4);
   assert.equal(standaloneOTRates(ot)["1.0"], 53.55);
   for (const value of [-1, 101, 1.234, NaN, Infinity, "20", null])
     assert.throws(() => validatePayrollSettings({ ...DEFAULT_PAYROLL_SETTINGS, wageServicePercent: value }));
   const { wageServicePercent: _, ...legacy } = DEFAULT_PAYROLL_SETTINGS;
   assert.equal(payableDailyWage(resolvePayrollSettings(legacy)), 385.56);
   assert.equal(validatePayrollSettings(legacy).wageServicePercent, 8);
 });
