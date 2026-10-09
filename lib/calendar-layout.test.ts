import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutShifts } from "./calendar-layout";
import type { ActualInterval } from "./actual-timeline";
import { keyOf, reconcile, stamp, type Shift } from "./engine";
const shift = (date: string): Shift => ({
  emp_id: "N",
  device_emp_id: "N",
  emp_name: "Night",
  agency: "Test",
  department: "Packing",
  date,
  shift_code: "N",
  shift_start: "20:00",
  shift_end: "05:00",
  requested_ot_hrs: 0,
  ot_task_target: "",
});
test("missing scans remain pending until the scheduled end in Bangkok time", () => {
  for (const [start, end, endDate] of [
    ["08:00", "17:00", "2026-09-24"],
    ["20:00", "05:00", "2026-09-25"],
  ]) {
    const s = { ...shift("2026-09-24"), shift_start: start, shift_end: end };
    for (const punches of [[], [{ device_emp_id: "N", punch_timestamp: `2026-09-24 ${start}:00`, punch_type: "IN" as const }]]) {
      const r = reconcile(s, punches);
      const at = (now: number) => layoutShifts([s], [s.date, endDate], new Map([[keyOf(s), r]]), now)[0];
      assert.equal(at(stamp("2026-09-24", "10:16")).pending, true);
      assert.equal(at(stamp(endDate, end) - 1).pending, true);
      assert.equal(at(stamp(endDate, end)).pending, false);
      assert.equal(r.missing, true);
    }
  }
});
test("pre-shift work extends the card into the previous date without moving shift identity", () => {
  const s = {
    ...shift("2026-09-15"),
    shift_start: "00:00",
    shift_end: "09:00",
  };
  const r = reconcile(s, [
    {
      device_emp_id: "N",
      punch_timestamp: "2026-09-14 21:00:00",
      punch_type: "UNKNOWN",
    },
    {
      device_emp_id: "N",
      punch_timestamp: "2026-09-15 09:00:00",
      punch_type: "UNKNOWN",
    },
  ]);
  const [event] = layoutShifts([s], ["2026-09-14"], new Map([[keyOf(s), r]]));
  assert.equal(event.shift.date, "2026-09-15");
  assert.equal(event.continuesAfter, true);
  assert.equal(event.left, 87.5);
  assert.equal(r.beforeShiftOT, 3);
  assert.equal(r.afterShiftOT, 0);
});
test("overnight cards use hourly proportions and nonoverlapping shifts share a lane", () => {
  const shifts = [shift("2026-09-14"), shift("2026-09-15")];
  const results = new Map(shifts.map((s) => [keyOf(s), reconcile(s, [])]));
  const events = layoutShifts(
    shifts,
    ["2026-09-14", "2026-09-15", "2026-09-16"],
    results,
  );
  assert.deepEqual(
    events.map((e) => [e.first, e.last, e.lane]),
    [
      [0, 1, 0],
      [1, 2, 0],
    ],
  );
  assert.ok(Math.abs(events[0].left - (20 / 48) * 100) < 0.00001);
  assert.ok(Math.abs(events[0].right - (19 / 48) * 100) < 0.00001);
});
test("week boundaries clip visual cards without changing shift identity", () => {
  const shifts = [shift("2026-09-13"), shift("2026-09-15")];
  const results = new Map(shifts.map((s) => [keyOf(s), reconcile(s, [])]));
  const events = layoutShifts(shifts, ["2026-09-14", "2026-09-15"], results);
  assert.equal(events[0].continuesBefore, true);
  assert.equal(events[0].shift.date, "2026-09-13");
  assert.equal(events[0].first, 0);
  assert.equal(events[0].last, 0);
  assert.equal(events[1].continuesAfter, true);
  assert.equal(events[1].last, 1);
  assert.ok(Math.abs(events[0].right - (19 / 24) * 100) < 0.00001);
  assert.ok(Math.abs(events[1].left - (20 / 24) * 100) < 0.00001);
});
test("day shifts occupy nine hours and midnight ends stay in the starting column", () => {
  for (const [start, end, expectedLeft, expectedRight] of [
    ["08:00", "17:00", 8, 7],
    ["20:00", "00:00", 20, 0],
  ] as const) {
    const s = { ...shift("2026-09-14"), shift_start: start, shift_end: end };
    const [event] = layoutShifts(
      [s],
      ["2026-09-14", "2026-09-15"],
      new Map([[keyOf(s), reconcile(s, [])]]),
    );
    assert.equal(event.first, 0);
    assert.equal(event.last, 0);
    assert.ok(Math.abs(event.left - (expectedLeft / 24) * 100) < 0.00001);
    assert.ok(Math.abs(event.right - (expectedRight / 24) * 100) < 0.00001);
  }
});

test("actual calendars hide Master-only work but retain holidays, leave and incomplete scans", () => {
  const shifts = [shift("2026-09-14"), shift("2026-09-15"), { ...shift("2026-09-16"), shift_code: "H" }, { ...shift("2026-09-17"), shift_code: "SL" }];
  const results = new Map(shifts.map(s => [keyOf(s), reconcile(s, [])]));
  const actual: ActualInterval = { id: "single", start: stamp("2026-09-15", "20:00"), end: stamp("2026-09-16", "04:00"), inMs: stamp("2026-09-15", "20:00"), estimated: true, uncertain: true, reviewed: false, reason: "single scan" };
  const events = layoutShifts(shifts, shifts.map(s => s.date), results, Date.now(), new Map([[keyOf(shifts[1]), [actual]]]));
  assert.deepEqual(events.map(e => e.shift.date), ["2026-09-15", "2026-09-16", "2026-09-17"]);
  assert.equal(events[0].actual, actual);
  assert.equal(events[0].actual?.outMs, undefined);
  assert.equal(events[0].last, 2);
  assert.equal(events[1].allDay, true);
  assert.equal(events[2].allDay, true);
  assert.equal(events.some(e => e.plannedOnly), false);
});
