import test from "node:test";
import assert from "node:assert/strict";
import { buildActualOnlyShifts } from "./actual-only-shifts";
import { buildActualTimeline } from "./actual-timeline";
import type { EmployeeRow } from "./master-data";
import type { Punch } from "./engine";

test("invalid Master times still produce Actual-only calendar anchors from exact-ID scans", () => {
  const employee: EmployeeRow = {
    employee_id: "DFCJ69141",
    source_row: 41,
    source_data: { Section: "Inventory FZ", Sup: "CJ" },
    shift_data: null,
    issue: "Working hours do not match First Time / Last Time",
  };
  const punches: Punch[] = [
    { device_emp_id: employee.employee_id, punch_timestamp: "2026-10-20 18:00:00", punch_type: "UNKNOWN" },
    { device_emp_id: employee.employee_id, punch_timestamp: "2026-10-21 06:00:00", punch_type: "UNKNOWN" },
    { device_emp_id: employee.employee_id, punch_timestamp: "2026-10-21 18:03:00", punch_type: "UNKNOWN" },
    { device_emp_id: employee.employee_id, punch_timestamp: "2026-10-22 06:04:00", punch_type: "UNKNOWN" },
  ];

  const shifts = buildActualOnlyShifts([employee], punches);
  assert.equal(shifts.length, 2);
  assert.ok(shifts.every(shift => shift.source_day_code === "ACTUAL_ONLY"));
  const timeline = buildActualTimeline(shifts, new Map([[employee.employee_id, punches]]), {});
  assert.equal(timeline.get("DFCJ69141|2026-10-20")?.[0].inMs, Date.parse("2026-10-20T18:00:00+07:00"));
  assert.equal(timeline.get("DFCJ69141|2026-10-20")?.[0].outMs, Date.parse("2026-10-21T06:00:00+07:00"));
  assert.equal(timeline.get("DFCJ69141|2026-10-21")?.[0].inMs, Date.parse("2026-10-21T18:03:00+07:00"));
  assert.equal(timeline.get("DFCJ69141|2026-10-21")?.[0].outMs, Date.parse("2026-10-22T06:04:00+07:00"));
});

test("actual-only anchors do not guess missing endpoints or include unmatched device IDs", () => {
  const employee: EmployeeRow = {
    employee_id: "DFCJ69162", source_row: 42, source_data: {}, shift_data: null, issue: "invalid time",
  };
  const punches: Punch[] = [
    { device_emp_id: employee.employee_id, punch_timestamp: "2026-10-23 08:05:00", punch_type: "UNKNOWN" },
    { device_emp_id: "OTHER", punch_timestamp: "2026-10-23 09:00:00", punch_type: "UNKNOWN" },
  ];
  const shifts = buildActualOnlyShifts([employee], punches);
  const timeline = buildActualTimeline(shifts, new Map([[employee.employee_id, punches.slice(0, 1)]]), {});
  assert.equal(shifts.length, 1);
  assert.equal(timeline.get("DFCJ69162|2026-10-23")?.[0].estimated, true);
  assert.equal(timeline.get("DFCJ69162|2026-10-23")?.[0].outMs, undefined);
});
