import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeMasterDate, readEmployeeFile } from "./master-data";
import { masterDate } from "./master-comparison";
import { normalizeDepartment } from "./departments";
import { prepareEmployeeMerge } from "./employee-import";
import { demoData } from "./engine";
import { readMasterSheet } from "./master-headers";
import * as XLSX from "xlsx";
import { MASTER_HEADERS } from "./source-headers";
import {
  applyShiftOverride,
  scheduleBounds,
  scheduledScanDate,
  validateShiftChange,
} from "./shift-overrides";
import { reconcile, type Shift } from "./engine";
import { isWeeklyHoliday, weeklyHolidayDays } from "./master-calendar";

test("latest master fields normalize departure dates and identify weekly rest days", () => {
  assert.equal(normalizeMasterDate(46293), "2026-09-28");
  assert.equal(normalizeMasterDate("9/28/26"), "2026-09-28");
  assert.equal(normalizeMasterDate("2026-02-30"), "");
  assert.deepEqual(weeklyHolidayDays("อาทิตย์"), [0]);
  assert.deepEqual(weeklyHolidayDays("วันอาทิตย์, Wednesday"), [0, 3]);
  assert.equal(isWeeklyHoliday("อาทิตย์", "2026-10-18"), true);
  assert.equal(isWeeklyHoliday("อาทิตย์", "2026-10-19"), false);
});

test("latest Section field drives employee section and master departure date", async () => {
  const record: Record<string, string | number> = {
    ลำดับ: 1,
    รหัส: "MST001",
    "ชื่อ-นามสกุล": "Test person",
    แผนก: "CDC Fresh Food Operation",
    Section: "Frozen",
    "กะทำงาน": "M",
    "เวลาทำงาน": "08:00-17:00",
    "First Time": "08:00",
    "Last Time": "17:00",
    "วันหยุด": "อาทิตย์",
    Status: "Active",
    Sup: "Agency",
    Contract: "Normal",
    "วันที่ออก": 46293,
  };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      [...MASTER_HEADERS],
      MASTER_HEADERS.map((header) => record[header] ?? ""),
    ]),
    "Master data",
  );
  const [employee] = await readEmployeeFile(
    new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" })], "latest.xlsx"),
  );
  assert.equal(employee.source_data.Section, "Frozen");
  assert.equal(employee.source_data["วันหยุด"], "อาทิตย์");
  assert.equal(employee.source_data["วันที่ออก"], "2026-09-28");
  assert.equal(employee.shift_data?.department, "Frozen");
  assert.equal(employee.shift_data?.source_department, "Frozen");
});

test("employee merge retains unrelated schedules and reviews and refreshes imported master shifts", () => {
  const data = demoData();
  const shift = data.shifts[0];
  data.shifts = [
    { ...shift, emp_id: "A", source_day_code: "MASTER" },
    { ...shift, emp_id: "B", source_day_code: "MASTER" },
    { ...shift, emp_id: "A", date: "2026-09-25", source_day_code: "D" },
  ];
  data.reviews = {
    "A|2026-09-24": { approved: true, overBudget: false, note: "" },
    "B|2026-09-24": { approved: true, overBudget: false, note: "" },
  };
  const merged = prepareEmployeeMerge(data, ["A", "C"]);
  assert.deepEqual(merged.shifts, data.shifts.slice(1));
  assert.deepEqual(Object.keys(merged.reviews), ["B|2026-09-24"]);
  assert.equal(merged.punches, data.punches);
  assert.equal(merged.shiftOverrides, data.shiftOverrides);
  assert.equal(data.shifts.length, 3);
  assert.equal(Object.keys(data.reviews).length, 2);
});

test("daily shift changes share a boundary with their actual neighboring shifts", () => {
  const base: Shift = {
    emp_id: "A",
    device_emp_id: "A",
    emp_name: "A",
    department: "Frozen",
    agency: "Test",
    date: "2026-09-03",
    shift_code: "M",
    shift_start: "20:00",
    shift_end: "05:00",
    requested_ot_hrs: 0,
    ot_task_target: "",
  };
  const change = {
    code: "A",
    start: "17:00",
    end: "02:00",
    reason: "Agreed shift",
  };
  const plan = (date: string) =>
    applyShiftOverride(
      { ...base, date },
      date === "2026-09-03" ? change : undefined,
    );
  assert.equal(
    scheduleBounds("2026-09-02", plan).to,
    scheduleBounds("2026-09-03", plan).from,
  );
  assert.equal(
    scheduleBounds("2026-09-03", plan).to,
    scheduleBounds("2026-09-04", plan).from,
  );
  assert.equal(scheduledScanDate("2026-09-03T16:41:00", plan), "2026-09-03");
  assert.equal(scheduledScanDate("2026-09-04T05:00:00", plan), "2026-09-03");
  assert.equal(scheduledScanDate("2026-09-04T16:47:00", plan), "2026-09-04");
  const bounds = scheduleBounds(base.date, plan);
  const r = reconcile(
    {
      ...plan(base.date),
      scan_window_from: bounds.from,
      scan_window_to: bounds.to,
    },
    ["2026-09-03 16:41:00", "2026-09-04 05:00:00", "2026-09-04 16:47:00"].map(
      (punch_timestamp) => ({
        device_emp_id: "A",
        punch_timestamp,
        punch_type: "UNKNOWN",
      }),
    ),
  );
  assert.equal(r.beforeShiftOT, 0);
  assert.equal(r.afterShiftOT, 3);
  assert.equal(r.logs.length, 2);
  for (const code of ["H8", "PH8", "SL"]) {
    const updated = applyShiftOverride({ ...base, shift_code: code }, change);
    assert.equal(updated.shift_code, code);
    assert.equal(updated.base_shift_code, "A");
  }
  assert.throws(() =>
    validateShiftChange({ dates: ["2026-02-30"], change, reason: "Change" }),
  );
  assert.throws(() =>
    validateShiftChange({
      dates: ["2026-09-01", "2026-10-01"],
      change,
      reason: "Change",
    }),
  );
  assert.throws(() =>
    validateShiftChange({
      dates: [base.date],
      change: { ...change, start: "25:00" },
      reason: "Change",
    }),
  );
  assert.throws(() =>
    validateShiftChange({ dates: [base.date], change, reason: "" }),
  );
});

test("department aliases normalize without merging distinct departments", () => {
  for (const [expected, values] of [
    ["Frozen", ["Frozen", "FROZEN", "Frozen CDC", " Frozen "]],
    ["Dry", ["Dry", "Dry Food", "Dryfood", "Dryfood "]],
    ["Seafood", ["Seafood", "Saefood", "Saefood "]],
    ["FD-FT", ["FD-FT", "FD/FT"]],
  ] as const)
    for (const value of values)
      assert.equal(normalizeDepartment(value), expected);
  for (const name of [
    "Inventory Frozen",
    "Asset Dry",
    "FD",
    "Fresh",
    "Chilled",
    "",
  ])
    assert.equal(normalizeDepartment(name), name);
});

test("duplicate employees differing only by department alias stay usable and preserve source values", async () => {
  const records = [
    ["A", "Frozen", "08:00", "17:00"],
    ["A", "FROZEN", "08:00", "17:00"],
    ["B", "Frozen CDC", "08:00", "17:00"],
    ["C", "Dry", "08:00", "17:00"],
    ["C", "Dry Food", "09:00", "18:00"],
  ].map(([id, department, start, end], i) => {
    const row: Record<string, string> = {
      ลำดับ: String(i + 1),
      รหัส: id,
      "ชื่อ-นามสกุล": id,
      แผนก: department,
      กะทำงาน: "M",
      เวลาทำงาน: `${start}-${end}`,
      "First Time": start,
      "Last Time": end,
      Sup: "Test",
    };
    return MASTER_HEADERS.map((header) => row[header] || "");
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([[...MASTER_HEADERS], ...records]),
    "Master Name",
  );
  const rows = await readEmployeeFile(
    new File(
      [XLSX.write(workbook, { type: "array", bookType: "xlsx" })],
      "aliases.xlsx",
    ),
  );
  assert.equal(rows.length, 3);
  assert.equal(rows[0].shift_data?.department, "Frozen");
  assert.equal(rows[1].shift_data?.department, "Frozen");
  assert.equal(
    JSON.parse(rows[0].source_data.__duplicate_rows)[0].data["แผนก"],
    "FROZEN",
  );
  assert.equal(rows[1].source_data["แผนก"], "Frozen CDC");
  assert.equal(rows[2].shift_data, null);
});

test("duplicate master rows with only a name honorific difference keep the shared shift usable", async () => {
  const records = [
    ["BE001269", "นางสาวณัฐธันยา โพนศรี"],
    ["BE001269", "ณัฐธันยา โพนศรี"],
  ].map(([id, name], i) => {
    const row: Record<string, string> = {
      ลำดับ: String(i + 1),
      รหัส: id,
      "ชื่อ-นามสกุล": name,
      แผนก: "CDC Dry Food Operation",
      Section: "Dry",
      กะทำงาน: "D",
      เวลาทำงาน: "09.00-18.00",
      "First Time": "09.00",
      "Last Time": "18.00",
      Sup: "Beyond",
    };
    return MASTER_HEADERS.map((header) => row[header] || "");
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([[...MASTER_HEADERS], ...records]),
    "Master data",
  );
  const [employee] = await readEmployeeFile(
    new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" })], "duplicate-name.xlsx"),
  );
  assert.equal(employee.shift_data?.shift_start, "09:00");
  assert.equal(employee.shift_data?.shift_end, "18:00");
  assert.equal(employee.shift_data?.emp_name, "นางสาวณัฐธันยา โพนศรี");
  assert.equal(employee.issue.includes("ข้อมูลกะขัดแย้ง"), false);
  assert.equal(JSON.parse(employee.source_data.__duplicate_rows).length, 1);
});

test("master import preserves source headers and duplicate source rows", async () => {
  const rows = await readEmployeeFile(
    new File(
      [readFileSync("examples/Master Name list.xlsx")],
      "Master Name list.xlsx",
    ),
  );
  assert.equal(rows.length, 350);
  const duplicate = rows.find((r) => r.employee_id === "BE001266")!;
  assert.ok(duplicate.shift_data);
  assert.equal(JSON.parse(duplicate.source_data.__duplicate_rows).length, 1);
  assert.ok(Object.hasOwn(duplicate.source_data, "Status"));
  assert.ok(rows.some((r) => r.shift_data === null));
  const variants = rows.filter(
    (r) =>
      r.shift_data &&
      [
        "FROZEN",
        "Frozen CDC",
        "Dry Food",
        "Dryfood",
        "Saefood",
        "FD/FT",
      ].includes(r.source_data["แผนก"]),
  );
  assert.ok(variants.length > 50);
  for (const row of variants)
    assert.equal(
      row.shift_data!.department,
      normalizeDepartment(row.source_data["แผนก"]),
    );
});

test("latest master workbook imports successfully", async () => {
  const rows = await readEmployeeFile(new File([readFileSync("examples/Master Name list 1.xlsx")], "latest.xlsx"));
  assert.ok(rows.length > 300);
  assert.equal(rows.find((row) => row.employee_id === "DF068273")?.shift_data?.shift_start, "06:00");
  const updatedRows = await readEmployeeFile(new File([readFileSync("examples/Master_Name_List_update_19-oct-26.xlsx")], "updated.xlsx"));
  const affected = updatedRows.find((row) => row.employee_id === "BE001269");
  assert.equal(affected?.shift_data?.shift_start, "09:00");
  assert.equal(affected?.shift_data?.shift_end, "18:00");
  assert.equal(affected?.issue.includes("ข้อมูลกะขัดแย้ง"), false);
});

test("midnight represented as 24.00 produces an active overnight master shift", async () => {
  const record: Record<string, string> = {
    ลำดับ: "1",
    รหัส: "NIGHT24",
    "ชื่อ-นามสกุล": "Night worker",
    แผนก: "Frozen",
    "กะทำงาน": "N",
    "เวลาทำงาน": "24.00-09.00",
    "First Time": "24.00",
    "Last Time": "09.00",
    Sup: "Test",
  };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([[...MASTER_HEADERS], MASTER_HEADERS.map((header) => record[header] || "")]),
    "Master Name",
  );
  const [row] = await readEmployeeFile(
    new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" })], "midnight.xlsx"),
  );
  assert.equal(row.issue, "");
  assert.equal(row.shift_data?.shift_start, "00:00");
  assert.equal(row.shift_data?.shift_end, "09:00");
});

test("master headers accept reordered aliases, title rows and optional columns", async () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["Employee report"],
    [" Agency ", "START_TIME", "Employee ID", "Department", "Employee Name", "shift", "End Time", "Extra"],
    ["Test", 0, "0001", "Dry Food", "Test person", "N", "09:00", "unused"],
  ]), "Master Name");
  const [row] = await readEmployeeFile(new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" })], "reordered.xlsx"));
  assert.equal(row.employee_id, "0001");
  assert.equal(row.source_row, 3);
  assert.equal(row.shift_data?.shift_start, "00:00");
  assert.equal(row.shift_data?.shift_end, "09:00");
  assert.equal(row.shift_data?.department, "Dry");
  assert.equal(row.source_data.Status, "");
});

test("master headers report missing and ambiguous columns", () => {
  assert.throws(() => readMasterSheet(XLSX.utils.aoa_to_sheet([["รหัส", "ชื่อ-นามสกุล"]])), /แผนก/);
  assert.throws(() => readMasterSheet(XLSX.utils.aoa_to_sheet([[...MASTER_HEADERS, "Employee ID"]])), /ซ้ำหรือกำกวม/);
});
test("master comparison assigns early and overnight scans to correct shift date", () => {
  const night = { shift_start: "20:00", shift_end: "05:00" };
  assert.equal(masterDate(night, "2026-09-03T16:41:00"), "2026-09-03");
  assert.equal(masterDate(night, "2026-09-04T05:00:00"), "2026-09-03");
  assert.equal(masterDate(night, "2026-09-04T16:47:00"), "2026-09-04");
  assert.equal(masterDate(night, "2026-09-03T12:30:00"), "2026-09-03");
  assert.equal(masterDate(night, "2026-09-03T12:29:00"), "2026-09-02");
  assert.equal(masterDate(night, "2026-09-14T19:55:00"), "2026-09-14");
  assert.equal(masterDate(night, "2026-09-15T07:00:00"), "2026-09-14");
  const midnight = { shift_start: "00:00", shift_end: "09:00" };
  assert.equal(masterDate(midnight, "2026-09-14T23:55:00"), "2026-09-15");
  assert.equal(masterDate(midnight, "2026-09-15T11:00:00"), "2026-09-15");
});
