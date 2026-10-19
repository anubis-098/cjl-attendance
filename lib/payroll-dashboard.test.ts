import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatePayroll } from "./payroll";
import { payrollDashboard } from "./payroll-dashboard";
import { DEFAULT_PAYROLL_SETTINGS } from "./payroll-settings";
import type { Data, Shift } from "./engine";
import { buildPayrollExport } from "./payroll-export";
import { OT_RULES_VERSION } from "./engine";

test("worked weekly holiday pays confirmed x2/x3 once with no daily holiday wage", () => {
  const s: Shift = {
    emp_id: "H",
    device_emp_id: "H",
    emp_name: "Weekly",
    agency: "Test",
    department: "Seafood",
    date: "2026-09-01",
    shift_code: "H8",
    shift_start: "08:00",
    shift_end: "17:00",
    requested_ot_hrs: 0,
    ot_task_target: "",
  };
  const data: Data = {
    shifts: [s, { ...s, date: "2026-09-02", shift_code: "H" }],
    punches: [
      {
        device_emp_id: "H",
        punch_timestamp: "2026-09-01 08:00:00",
        punch_type: "IN",
      },
      {
        device_emp_id: "H",
        punch_timestamp: "2026-09-01 19:00:00",
        punch_type: "OUT",
      },
    ],
    reviews: {
      "H|2026-09-01": {
        approved: true,
        overBudget: false,
        note: "",
        otRulesVersion: OT_RULES_VERSION,
      },
    },
    audit: [],
  };
  const report = calculatePayroll(
    data,
    "2026-09",
    "calendar",
    undefined,
    DEFAULT_PAYROLL_SETTINGS,
  );
  const row = report.rows[0];
  assert.equal(row.weeklyWorkedDays, 1);
  assert.equal(row.weeklyHolidayWage, 0);
  assert.equal(row.weeklyApprovedOTTotal, 1060.3);
  assert.equal(row.salaryWithApprovedOT, 1060.3);
  assert.equal(row.approvedAllowanceTotal, 0);
  const cards = payrollDashboard(report.rows);
  assert.equal(cards[13].amount, 1060.3);
  assert.equal(cards[15].amount, 1060.3);
  const csv = buildPayrollExport(report, ["salary", "approvedMoney"], true);
  assert.equal(
    csv[1][csv[0].indexOf("Wages + Approved OT + Allowances (THB)")],
    "1060.30",
  );
  data.reviews["H|2026-09-01"].otRulesVersion = 3;
  const pending = calculatePayroll(
    data,
    "2026-09",
    "calendar",
    undefined,
    DEFAULT_PAYROLL_SETTINGS,
  ).rows[0];
  assert.equal(pending.weeklyApprovedOTTotal, 0);
  assert.equal(pending.pendingTotal, 1060.3);
});

test("holiday wages pay scheduled days without punches, once per date, and export separately from OT", () => {
  const shifts: Shift[] = ["PH", "PH8", "H", "H8", "SL", "PL", "AB", "WOP"].map(
    (code, i) => ({
      emp_id: "HOL",
      device_emp_id: "HOL",
      emp_name: "Holiday employee",
      agency: "Test",
      department: "Seafood",
      date: `2026-09-0${i + 1}`,
      shift_code: code,
      shift_start: "08:00",
      shift_end: "17:00",
      requested_ot_hrs: 0,
      ot_task_target: "",
    }),
  );
  const data: Data = {
    shifts: [...shifts, shifts[0]],
    punches: [],
    reviews: {},
    audit: [],
  };
  const report = calculatePayroll(data, "2026-09", "calendar", undefined, {
    ...DEFAULT_PAYROLL_SETTINGS,
    dailyWage: 400,
  });
  const row = report.rows[0];
  assert.equal(row.publicHolidayDays, 2);
  assert.equal(row.weeklyHolidayDays, 2);
  assert.equal(row.holidayWageTotal, 960);
  assert.equal(row.dailyWageTotal, 0);
  assert.equal(row.approvedTotal, 0);
  assert.equal(row.salaryWithApprovedOT, 960);
  const cards = payrollDashboard(report.rows);
  assert.deepEqual(
    cards.slice(12, 14).map((c) => [c.count, c.amount]),
    [
      [2, 960],
      [0, 0],
    ],
  );
  assert.equal(cards[15].amount, 960);
  const csv = buildPayrollExport(report, ["salary"], true);
  const column = csv[0].indexOf("Total Holiday Wages (THB)");
  assert.equal(csv[1][column], "960.00");
  assert.equal(csv[2][column], "960.00");
  const unknown = calculatePayroll(data, "2026-09", "calendar").rows[0];
  assert.equal(unknown.holidayWageTotal, null);
  assert.equal(unknown.salaryWithApprovedOT, null);
});

test("dashboard separates shift and department days, excludes pending allowances and preserves totals", () => {
  const shifts: Shift[] = ["M", "A", "N", "D", "M"].map((code, i) => ({
    emp_id: `E${i}`,
    device_emp_id: `E${i}`,
    emp_name: `Employee ${i}`,
    agency: "Test",
    department: i === 1 ? "Frozen" : "Seafood",
    date: "2026-09-01",
    shift_code: code,
    shift_start: "08:00",
    shift_end: "17:00",
    requested_ot_hrs: 0,
    ot_task_target: "",
  }));
  const data: Data = {
    shifts,
    punches: shifts.flatMap((s) => [
      {
        device_emp_id: s.emp_id,
        punch_timestamp: `${s.date} 08:00:00`,
        punch_type: "IN" as const,
      },
      {
        device_emp_id: s.emp_id,
        punch_timestamp: `${s.date} 19:00:00`,
        punch_type: "OUT" as const,
      },
    ]),
    reviews: Object.fromEntries(
      shifts
        .slice(0, 4)
        .map((s) => [
          `${s.emp_id}|${s.date}`,
          { approved: true, overBudget: false, note: "" },
        ]),
    ),
    audit: [],
  };
  const report = calculatePayroll(
    data,
    "2026-09",
    "calendar",
    undefined,
    DEFAULT_PAYROLL_SETTINGS,
  );
  const cards = payrollDashboard(report.rows);
  assert.equal(cards.length, 16);
  assert.deepEqual(
    cards.slice(0, 4).map((c) => c.count),
    [0, 8, 0, 0],
  );
  assert.deepEqual(
    cards.slice(4, 8).map((c) => [c.count, c.amount]),
    [
      [1, 20.6],
      [1, 41.2],
      [1, 72.1],
      [3, 133.9],
    ],
  );
  assert.deepEqual(
    cards.slice(8, 11).map((c) => [c.count, c.amount]),
    [
      [3, 37.08],
      [1, 51.5],
      [4, 88.58],
    ],
  );
  assert.equal(cards[14].count, 5);
  assert.equal(
    cards[15].amount,
    Math.round(
      report.rows.reduce((sum, row) => sum + row.salaryWithApprovedOT!, 0) *
        100,
    ) / 100,
  );
  assert.equal(payrollDashboard(report.rows.slice(0, 1))[14].count, 1);
  const unknown = report.rows.map((row) => ({
    ...row,
    approvedTotal: null,
    salaryWithApprovedOT: null,
  }));
  assert.equal(payrollDashboard(unknown)[11].amount, null);
  assert.equal(payrollDashboard(unknown)[15].amount, null);
});
