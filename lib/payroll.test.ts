import { test } from "node:test";
import { validateCompanyHolidays } from "./company-holidays";
import assert from "node:assert/strict";
test("company holiday selection validates dates and allows clearing only the specified month", () => {
  assert.deepEqual(validateCompanyHolidays("2026-09", []), []);
  assert.deepEqual(
    validateCompanyHolidays("2026-09", ["2026-09-25", "2026-09-01"]),
    ["2026-09-01", "2026-09-25"],
  );
  for (const dates of [
    ["2026-09-31"],
    ["2026-10-01"],
    ["2026-09-01", "2026-09-01"],
    [null],
  ])
    assert.throws(() => validateCompanyHolidays("2026-09", dates));
});

import { readFileSync, readdirSync } from "node:fs";
import { calculatePayroll, payrollPeriod, type PayrollBook } from "./payroll";
import { readPayrollRates } from "./payroll-import";
import type { Data, Shift } from "./engine";

test("monthly daily wages count regular attended days only, including overnight shifts regardless of OT approval", () => {
  const codes = [
    "M",
    "N",
    "H",
    "H8",
    "PH",
    "PH8",
    "WOP",
    "PL",
    "SL",
    "AB",
    "R",
    "M",
  ];
  const shifts: Shift[] = codes.map((code, i) => ({
    emp_id: "WAGE",
    device_emp_id: "WAGE",
    emp_name: "Wage person",
    agency: "Test",
    department: "Seafood",
    date: `2026-09-${String(i + 1).padStart(2, "0")}`,
    shift_code: code,
    shift_start: code === "N" ? "20:00" : "08:00",
    shift_end: code === "N" ? "05:00" : "17:00",
    requested_ot_hrs: 0,
    ot_task_target: "",
  }));
  const data: Data = {
    shifts,
    punches: shifts.flatMap((s, i) => [
      {
        device_emp_id: "WAGE",
        punch_timestamp: `${s.date}T${s.shift_start}:00`,
        punch_type: "IN" as const,
      },
      ...(i === 11
        ? []
        : [
            {
              device_emp_id: "WAGE",
              punch_timestamp: `${i === 1 ? "2026-09-03" : s.date}T${s.shift_end}:00`,
              punch_type: "OUT" as const,
            },
          ]),
    ]),
    reviews: {},
    audit: [],
  };
  const report = calculatePayroll(
    data,
    "2026-09",
    "calendar",
    undefined,
    DEFAULT_PAYROLL_SETTINGS,
  );
  const r = report.rows[0];
  assert.equal(r.workedDays, 2);
  assert.equal(r.dailyWageTotal, 856.8);
  assert.equal(r.publicHolidayDays, 2);
  assert.equal(r.weeklyHolidayDays, 2);
  assert.equal(r.publicHolidayWage, 856.8);
  assert.equal(r.weeklyHolidayWage, 0);
  assert.equal(r.salaryWithApprovedOT, 1713.6);
  assert.ok(r.projectedSalary! > r.salaryWithApprovedOT!);
  assert.equal(r.missing, 1);
  assert.deepEqual(
    r.days.map((day) => day.paidWorkday),
    [true, true, ...Array(10).fill(false)],
  );
  const exported = buildPayrollExport(report, ["salary"], true);
  assert.equal(
    exported[1][exported[0].indexOf("Wages for Actual Workdays (THB)")],
    "856.80",
  );
  assert.equal(
    exported[2][exported[0].indexOf("Wages for Actual Workdays (THB)")],
    "856.80",
  );
  const missingRate = calculatePayroll(data, "2026-09", "calendar").rows[0];
  assert.equal(missingRate.dailyWageTotal, null);
  assert.equal(missingRate.salaryWithApprovedOT, null);
});
import {
  buildPayrollExport,
  exportPreset,
  type PayrollReport,
} from "./payroll-export";
import {
  DEFAULT_PAYROLL_SETTINGS,
  departmentAllowance,
  standaloneOTRates,
  validatePayrollSettings,
} from "./payroll-settings";

test("manually paired overnight punches are not reused as the next master shift's missing entry", () => {
  const shift = (date: string): Shift => ({
    emp_id: "BE000028",
    device_emp_id: "BE000028",
    emp_name: "Test employee",
    agency: "Beyond",
    department: "Fresh Equipment Cleaning",
    date,
    shift_code: "M",
    shift_start: "07:00",
    shift_end: "16:00",
    requested_ot_hrs: 0,
    ot_task_target: "",
  });
  const data: Data = {
    shifts: [shift("2026-10-03"), shift("2026-10-04")],
    punches: [
      { device_emp_id: "BE000028", punch_timestamp: "2026-10-03 18:33:00", punch_type: "UNKNOWN" },
      { device_emp_id: "BE000028", punch_timestamp: "2026-10-04 06:02:00", punch_type: "UNKNOWN" },
    ],
    reviews: {
      "BE000028|2026-10-03": {
        manualPair: true,
        inTime: "2026-10-03T18:33",
        outTime: "2026-10-04T06:02",
        approved: false,
        overBudget: false,
        note: "",
      },
    },
    audit: [],
  };
  const report = calculatePayroll(data, "2026-10", "calendar", undefined, DEFAULT_PAYROLL_SETTINGS);
  assert.equal(report.rows[0].missing, 0);
  assert.equal(report.rows[0].days.find((day) => day.date === "2026-10-04")?.status, "ABSENT");
  // Production saves reviewed endpoints without the manualPair flag.
  delete data.reviews["BE000028|2026-10-03"].manualPair;
  data.reviews["BE000028|2026-10-03"].approved = true;
  data.reviews["BE000028|2026-10-03"].otRulesVersion = 6;
  data.shifts[0] = { ...data.shifts[0], shift_start: "19:00", shift_end: "04:00",
    shift_code: "A", scan_window_from: 1790980200000, scan_window_to: 1791066600000 };
  data.shifts[1] = { ...data.shifts[1], scan_window_from: 1791066600000, scan_window_to: 1791131400000 };
  const reviewed = calculatePayroll(data, "2026-10", "26-25", undefined, DEFAULT_PAYROLL_SETTINGS).rows[0];
  assert.equal(reviewed.missing, 0);
  assert.equal(reviewed.workedDays, 1);
  assert.equal(reviewed.days[0].approved, true);
  assert.equal(reviewed.approvedHours["1.5"], 2);
  // Other employees' identical scan times remain independent.
  data.shifts.push({ ...data.shifts[1], emp_id: "OTHER", device_emp_id: "OTHER" });
  data.punches.push({ device_emp_id: "OTHER", punch_timestamp: "2026-10-04 06:02:00", punch_type: "UNKNOWN" });
  assert.equal(calculatePayroll(data, "2026-10", "calendar").rows.find((r) => r.id === "OTHER")?.missing, 1);
  // A genuine additional orphan is still flagged, and every export preset
  // carries its date and warning rather than manufacturing payable hours.
  data.punches.push({ device_emp_id: "BE000028", punch_timestamp: "2026-10-04 08:00:00", punch_type: "UNKNOWN" });
  const incomplete = calculatePayroll(data, "2026-10", "calendar", undefined, DEFAULT_PAYROLL_SETTINGS);
  const affected = incomplete.rows.find((r) => r.id === "BE000028")!;
  assert.equal(affected.missing, 1);
  assert.equal(affected.workedDays, 1);
  assert.equal(affected.days.find((d) => d.date === "2026-10-04")?.worked, false);
  for (const preset of ["approved", "pending", "all"] as const) {
    const csv = buildPayrollExport({ ...incomplete, rows: [affected] }, exportPreset(preset), true);
    assert.equal(csv[1][csv[0].indexOf("Incomplete Scan Dates")], "2026-10-04");
    assert.equal(csv[0].filter((header) => header === "Incomplete Scan Shifts").length, 1);
    assert.match(csv[1][csv[0].indexOf("Attendance Calculation Warning")], /excluded/);
  }
});

test("payroll export separates confirmed and pending amounts, selects columns and keeps incomplete totals unknown", () => {
  const report: PayrollReport = {
    period: { from: "2026-08-26", to: "2026-09-25" },
    rows: [
      {
        id: "001",
        name: 'Name, "Quoted"',
        department: "Seafood",
        agency: "Test",
        rate: undefined,
        approvedHours: { "1.0": 0, "1.5": 2, "2.0": 0, "3.0": 0 },
        pendingHours: { "1.0": 8, "1.5": 0, "2.0": 0, "3.0": 1.5 },
        approvedAmounts: { "1.0": 0, "1.5": 144.58, "2.0": 0, "3.0": 0 },
        pendingAmounts: { "1.0": 385.6, "1.5": 0, "2.0": 0, "3.0": 216.89 },
        approvedTotal: 144.58,
        pendingTotal: 602.49,
        approvedAllowances: { department: 12.36, shift: 20.6, days: 1 },
        pendingAllowances: { department: 0, shift: 0, days: 0 },
        approvedAllowanceTotal: 32.96,
        pendingAllowanceTotal: 0,
        holidays: { PH8: 1 },
        missing: 0,
        workedDays: 1,
        dailyWageTotal: 385.56,
        wageServiceTotal: 0,
        approvedServiceTotal: 0,
        pendingServiceTotal: 0,
        publicHolidayDays: 1,
        weeklyHolidayDays: 0,
        weeklyWorkedDays: 0,
        weeklyApprovedOTTotal: 0,
        publicHolidayWage: 385.56,
        weeklyHolidayWage: 0,
        holidayWageTotal: 385.56,
        salaryWithApprovedOT: 563.1,
        projectedSalary: 1165.59,
        days: [
          {
            date: "2026-09-01",
            code: "M",
            status: "approved",
            approved: true,
            hours: { "1.0": 0, "1.5": 0, "2.0": 0, "3.0": 0 },
            departmentAllowance: 12.36,
            shiftAllowance: 20.6,
            allowanceNote: "",
            paidWorkday: true,
            worked: true,
            shiftKind: "M",
            departmentKind: "seafood",
          },
        ],
      },
    ],
  };
  const confirmed = buildPayrollExport(report, exportPreset("approved"), true);
  assert.ok(!confirmed[0].some((h) => h.includes("Pending Approval")));
  assert.equal(confirmed[1].at(-1), "177.54");
  assert.equal(confirmed[2].at(-1), "177.54");
  assert.equal(confirmed[1][2], 'Name, "Quoted"');
  assert.ok(confirmed[0].indexOf("Agency") < confirmed[0].indexOf("Department"));
  assert.equal(
    confirmed[1][confirmed[0].indexOf("Approved Seafood Allowance (THB)")],
    "12.36",
  );
  assert.equal(
    confirmed[1][confirmed[0].indexOf("Approved Frozen Allowance (THB)")],
    "0.00",
  );
  assert.equal(
    confirmed[1][confirmed[0].indexOf("Approved Shift Allowance (THB)")],
    "20.60",
  );
  const pending = buildPayrollExport(report, exportPreset("pending"), false);
  assert.ok(!pending[0].some((h) => h.includes("Approved")));
  assert.equal(pending[1].at(-1), "602.49");
  assert.equal(pending.length, 2);
  const custom = buildPayrollExport(
    report,
    ["approvedGrand", "pendingHours"],
    false,
  );
  assert.equal(custom[0].length, 13);
  assert.equal(custom[1].at(-1), "9.50");
  report.rows.push({
    ...report.rows[0],
    id: "002",
    approvedTotal: null,
    approvedAmounts: { ...report.rows[0].approvedAmounts, "1.5": null },
  });
  const all = buildPayrollExport(report, exportPreset("all"), true);
  assert.ok(all.every((row) => row.length === all[0].length));
  const grand = all[0].findIndex((h) => h === "Approved Total Income (THB)");
  assert.equal(all[2][grand], "RATE INCOMPLETE");
  assert.equal(all[3][grand], "RATE INCOMPLETE");
  const hours = all[0].indexOf("Total Approved OT (hours)");
  assert.equal(all[3][hours], "4.00");
  assert.equal(all[3][all[0].indexOf("Daily Wage incl. Service (THB/day)")], "");
  assert.ok(all[0].every((header) => !/[ก-๙]/.test(header)));
});

test("standalone settings validate money, derive hourly rates and match explicit department aliases", () => {
  const legacy = {
    ...DEFAULT_PAYROLL_SETTINGS,
    departments: { FROZEN: "none", "Frozen CDC": "frozen" },
  } as const;
  assert.equal(departmentAllowance("Frozen", legacy, "FROZEN"), "none");
  assert.equal(departmentAllowance("Frozen", legacy, "Frozen CDC"), "frozen");
  assert.equal(
    departmentAllowance(
      "Frozen",
      { ...legacy, departments: { ...legacy.departments, Frozen: "seafood" } },
      "FROZEN",
    ),
    "seafood",
  );
  assert.deepEqual(standaloneOTRates(DEFAULT_PAYROLL_SETTINGS), {
    "1.0": 48.2,
    "1.5": 72.29,
    "2.0": 96.39,
    "3.0": 144.59,
  });
  assert.deepEqual(
    standaloneOTRates({ ...DEFAULT_PAYROLL_SETTINGS, dailyWage: 400 }),
    { "1.0": 54, "1.5": 81, "2.0": 108, "3.0": 162 },
  );
  assert.equal(
    departmentAllowance(" Saefood ", DEFAULT_PAYROLL_SETTINGS),
    "seafood",
  );
  assert.equal(
    departmentAllowance("FROZEN CDC", DEFAULT_PAYROLL_SETTINGS),
    "frozen",
  );
  assert.equal(
    departmentAllowance("Inventory Frozen", DEFAULT_PAYROLL_SETTINGS),
    "none",
  );
  assert.equal(
    departmentAllowance("Seafood", {
      ...DEFAULT_PAYROLL_SETTINGS,
      departments: { Seafood: "none" },
    }),
    "none",
  );
  for (const value of [-1, 0, Infinity, NaN, "400", 12.345])
    assert.throws(() =>
      validatePayrollSettings({
        ...DEFAULT_PAYROLL_SETTINGS,
        dailyWage: value,
      }),
    );
  assert.throws(() =>
    validatePayrollSettings({
      ...DEFAULT_PAYROLL_SETTINGS,
      departments: { Seafood: "invalid" },
    }),
  );
});

test("standalone pay includes regular-day allowances only, no shift pay for D, and respects OT break", () => {
  const base: Shift = {
    emp_id: "A",
    device_emp_id: "A",
    emp_name: "A",
    agency: "Test",
    department: "Seafood",
    date: "2026-09-01",
    shift_code: "M",
    shift_start: "08:00",
    shift_end: "17:00",
    requested_ot_hrs: 0,
    ot_task_target: "",
  };
  const shifts = ["M", "D", "A", "N", "H8", "PH8", "SL", "M", "1"].map(
    (code, i) => ({
      ...base,
      date: `2026-09-${String(i + 1).padStart(2, "0")}`,
      shift_code: code,
      base_shift_code: "M",
      department: i === 2 ? "Frozen" : "Seafood",
      ...(code === "N" ? { shift_start: "20:00", shift_end: "05:00" } : {}),
    }),
  );
  const data: Data = {
    shifts,
    punches: shifts.flatMap((s, i) => [
      {
        device_emp_id: "A",
        punch_timestamp: `${s.date} ${s.shift_start}:00`,
        punch_type: "IN" as const,
      },
      ...(i === 7
        ? []
        : [
            {
              device_emp_id: "A",
              punch_timestamp:
                i === 3 ? "2026-09-05 05:00:00" : `${s.date} 20:30:00`,
              punch_type: "OUT" as const,
            },
          ]),
    ]),
    reviews: {
      "A|2026-09-01": {
        approved: true,
        deductOTBreak: true,
        overBudget: false,
        note: "OK",
      },
    },
    audit: [],
  };
  const [r] = calculatePayroll(
    data,
    "2026-09",
    "calendar",
    undefined,
    DEFAULT_PAYROLL_SETTINGS,
  ).rows;
  assert.equal(r.approvedHours["1.5"], 3);
  assert.equal(r.approvedTotal, 216.87);
  assert.equal(r.approvedAllowanceTotal, 32.96);
  assert.deepEqual(
    r.days.slice(0, 4).map((d) => d.shiftAllowance),
    [20.6, 0, 41.2, 72.1],
  );
  assert.equal(r.days[2].departmentAllowance, 51.5);
  for (const d of r.days.slice(4, 8)) {
    assert.equal(d.departmentAllowance, 0);
    assert.equal(d.shiftAllowance, 0);
  }
  assert.equal(r.days[8].shiftAllowance, 20.6);
  assert.equal(r.pendingAllowances.days, 4);
});
test("payroll dates handle year rollover and leap-month endings", () => {
  assert.deepEqual(payrollPeriod("2026-01", "26-25"), {
    from: "2025-12-26",
    to: "2026-01-25",
  });
  assert.deepEqual(payrollPeriod("2024-02", "calendar"), {
    from: "2024-02-01",
    to: "2024-02-29",
  });
  assert.throws(() => payrollPeriod("2026-13", "26-25"));
});
test("real workbook rates come from each row formula, including inconsistent x1 and missing formulas", async () => {
  const name = readdirSync("examples").find((n) => n.startsWith("1_CDC"))!;
  const rows = await readPayrollRates(
    new File([readFileSync(`examples/${name}`)], name),
  );
  const first = rows.find((r) => r.id === "BE000523")!;
  assert.equal(first.rates["1.0"], 48.2);
  assert.equal(first.rates["1.5"], 72.29);
  assert.equal(first.dailyWage, 428.4);
  assert.equal(first.holidayWage, 357);
  assert.ok(rows.some((r) => r.rates["1.0"] === 72 && r.warnings.length > 0));
  assert.ok(rows.some((r) => r.rates["1.0"] === null));
  assert.ok(rows.some((r) => r.rates["1.0"] === 48.19));
});
test("approved and pending pay are separate, missing rates stay unknown, and holidays use engine hours", () => {
  const shift: Shift = {
    emp_id: "A",
    device_emp_id: "A",
    emp_name: "A",
    agency: "Test",
    department: "Test",
    date: "2026-09-14",
    shift_code: "M",
    shift_start: "08:00",
    shift_end: "17:00",
    requested_ot_hrs: 0,
    ot_task_target: "",
  };
  const data: Data = {
    shifts: [
      shift,
      { ...shift, date: "2026-09-15", shift_code: "PH8" },
      { ...shift, date: "2026-09-26" },
    ],
    punches: [14, 15, 26].flatMap((d) => [
      {
        device_emp_id: "A",
        punch_timestamp: `2026-09-${d} 08:00:00`,
        punch_type: "IN" as const,
      },
      {
        device_emp_id: "A",
        punch_timestamp: `2026-09-${d} ${d === 15 ? "18:30" : "19:00"}:00`,
        punch_type: "OUT" as const,
      },
    ]),
    reviews: {
      "A|2026-09-14": { approved: true, overBudget: false, note: "OK" },
    },
    audit: [],
  };
  const book: PayrollBook = {
    filename: "rates.xlsx",
    importedAt: "",
    rows: [
      {
        id: "A",
        name: "A",
        dailyWage: 428.4,
        holidayWage: 357,
        rates: { "1.0": 48.2, "1.5": 72.29, "2.0": 96.39, "3.0": 144.59 },
        row: 12,
        warnings: [],
      },
    ],
  };
  const [r] = calculatePayroll(data, "2026-09", "26-25", book).rows;
  assert.equal(r.approvedTotal, 144.58);
  assert.equal(r.pendingTotal, 602.49);
  assert.equal(r.holidays.PH8, 1);
  assert.equal(r.days.length, 2);
  assert.equal(
    calculatePayroll(data, "2026-09", "26-25").rows[0].approvedTotal,
    null,
  );
  assert.equal(
    calculatePayroll(data, "2026-09", "26-25").rows[0].pendingTotal,
    null,
  );
});
