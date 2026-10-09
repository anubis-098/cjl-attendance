import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pairActualScans,
  buildActualTimeline,
  actualMatchesResult,
  actualCardStatus,
} from "./actual-timeline";
import { reconcile, keyOf, stamp, type Punch, type Shift } from "./engine";
import { layoutShifts } from "./calendar-layout";
import { attendancePeriod, scannedEmployees, scheduledEmployeeCount } from "./attendance-summary";
const p = (
  date: string,
  time: string,
  type: Punch["punch_type"] = "UNKNOWN",
): Punch => ({
  device_emp_id: "E",
  punch_timestamp: `${date} ${time}:00`,
  punch_type: type,
});
const shift: Shift = {
  emp_id: "E",
  device_emp_id: "E",
  emp_name: "Employee",
  agency: "Test",
  department: "Dry",
  date: "2026-10-01",
  shift_code: "M",
  shift_start: "08:00",
  shift_end: "17:00",
  requested_ot_hrs: 0,
  ot_task_target: "",
};

test("BE001030 long daytime OT does not shift exits into the next day's entries", () => {
  const scans = [p("2026-10-03", "04:34"), p("2026-10-03", "15:01"),
    p("2026-10-04", "05:50"), p("2026-10-04", "18:00"),
    p("2026-10-05", "04:41"), p("2026-10-05", "18:01"),
    p("2026-10-06", "04:42"), p("2026-10-06", "17:01"), p("2026-10-07", "04:40")];
  for (const count of [4, 6, 8, 9]) {
    const pairs = pairActualScans(scans.slice(0, count));
    assert.equal(pairs[1].inMs, stamp("2026-10-04", "05:50"));
    assert.equal(pairs[1].outMs, stamp("2026-10-04", "18:00"));
    for (let i = 0; i < Math.floor(count / 2); i++) {
      assert.equal(pairs[i].inMs, Date.parse(scans[i * 2].punch_timestamp.replace(" ", "T") + "+07:00"));
      assert.equal(pairs[i].outMs, Date.parse(scans[i * 2 + 1].punch_timestamp.replace(" ", "T") + "+07:00"));
    }
    if (count === 9) {
      assert.equal(pairs.at(-1)!.outMs, undefined);
      assert.ok(pairs.slice(0, -1).every(x => !x.uncertain), "regular neighbouring days resolve the open-last-scan tie");
    }
  }
});

test("long OT for day and overnight workers keeps chronological pairs with an open final scan", () => {
  for (const startHour of [4, 6, 8, 16, 18, 20]) {
    for (const duration of [9, 10, 11, 12, 13, 14]) {
      const logs: Punch[] = [];
      const starts: number[] = [];
      for (let day = 1; day <= 5; day++) {
        const start = stamp(`2026-10-0${day}`, `${String(startHour).padStart(2, "0")}:00`);
        starts.push(start);
        for (const ms of day === 5 ? [start] : [start, start + duration * 3600000])
          logs.push({ device_emp_id: "E", punch_timestamp: new Date(ms).toISOString(), punch_type: "UNKNOWN" });
      }
      const result = pairActualScans(logs);
      assert.equal(result.length, 5);
      for (let i = 0; i < 4; i++) {
        assert.equal(result[i].inMs, starts[i]);
        assert.equal(result[i].outMs, starts[i] + duration * 3600000);
      }
      assert.equal(result[4].outMs, undefined);
    }
  }
});

test("a new scan that reverses previously clear pairs cannot silently appear reliable", () => {
  const logs: Punch[] = [];
  for (let day = 1; day <= 5; day++) {
    logs.push(p(`2026-10-0${day}`, "04:00"));
    if (day < 5) logs.push(p(`2026-10-0${day}`, "18:30"));
  }
  const before = pairActualScans(logs.slice(0, -1));
  const after = pairActualScans(logs);
  for (const old of before.filter(x => !x.estimated && !x.uncertain)) {
    if (after.some(x => x.inMs === old.inMs && x.outMs === old.outMs)) continue;
    const changed = after.filter(x => x.start <= old.end && x.end >= old.start);
    assert.ok(changed.length);
    assert.ok(changed.every(x => x.uncertain));
  }
});

test("today's schedule counts distinct working employees including worked holidays, not leave or other dates", () => {
  const rows = ["M", "N", "H8", "PH8", "H", "PH", "OFF-M", "SL", "PL", "AB", "WOP", "R"].map((code, i) => ({ ...shift, emp_id: String(i), shift_code: code }));
  rows.push(rows[0], { ...shift, emp_id: "OTHER_DATE", date: "2026-10-02" });
  assert.equal(scheduledEmployeeCount(rows, shift.date), 4);
  assert.equal(scheduledEmployeeCount(rows, "2026-10-03"), 0);
});

test("BE000044 repeat exit at 04:00 extends to 06:02 without creating a phantom eight-hour period", () => {
  const logs = [p("2026-09-23", "18:36"), p("2026-09-24", "04:00"), p("2026-09-24", "06:02"),
    p("2026-09-24", "18:36"), p("2026-09-25", "06:00")];
  const original = JSON.stringify(logs);
  const actual = pairActualScans(logs);
  assert.equal(actual.length, 2);
  assert.equal(actual[0].inMs, stamp("2026-09-23", "18:36"));
  assert.equal(actual[0].outMs, stamp("2026-09-24", "06:02"));
  assert.equal(actual[0].estimated, false);
  assert.equal(actual[0].uncertain, false);
  assert.equal(actual[1].inMs, stamp("2026-09-24", "18:36"));
  assert.equal(JSON.stringify(logs), original);
  const explicit = pairActualScans([p("2026-09-23", "18:36", "IN"), p("2026-09-24", "04:00", "OUT"), p("2026-09-24", "06:02", "OUT")]);
  assert.equal(explicit.length, 1);
  assert.equal(explicit[0].outMs, stamp("2026-09-24", "06:02"));
  const nextEntry = pairActualScans([p("2026-09-23", "18:36", "IN"), p("2026-09-24", "04:00", "OUT"), p("2026-09-24", "06:02", "IN"), p("2026-09-24", "15:02", "OUT")]);
  assert.equal(nextEntry.length, 2);
  assert.equal(nextEntry[0].outMs, stamp("2026-09-24", "04:00"));
  assert.equal(nextEntry[1].inMs, stamp("2026-09-24", "06:02"));
});

test("presence counts distinct known employees from raw Bangkok scan dates including single scans", () => {
  const shifts = [shift, { ...shift, emp_id: "B", device_emp_id: "B" }];
  const logs = [p("2026-09-23", "18:36"), p("2026-09-24", "04:00"), p("2026-09-24", "06:02"),
    { ...p("2026-09-24", "08:00"), device_emp_id: "B" },
    { ...p("2026-09-24", "08:00"), device_emp_id: "UNKNOWN_EMPLOYEE" }];
  assert.equal(scannedEmployees(shifts, logs, ["2026-09-23"]), 1);
  assert.equal(scannedEmployees(shifts, logs, ["2026-09-23", "2026-09-24"]), 2);
  assert.equal(scannedEmployees(shifts, logs, ["2026-09-25"]), 0);
  assert.deepEqual(attendancePeriod("2026-09-23", "range", "2026-09-25"), { start: "2026-09-23", count: 3 });
  assert.deepEqual(attendancePeriod("2026-12-31", "range", "2027-01-01"), { start: "2026-12-31", count: 2 });
  assert.equal(attendancePeriod("2026-09-23", "range", "2026-09-23").count, 1);
});

test("a corrected 04:00 exit followed by a real 06:02 scan shows one full conflict period without rewriting the review", () => {
  const s = { ...shift, date: "2026-09-22", shift_start: "19:00", shift_end: "04:00" };
  const reviews = { [keyOf(s)]: { inTime: "2026-09-22T18:36", outTime: "2026-09-23T04:00", approved: true, overBudget: false, note: "Saved correction" } };
  const before = JSON.stringify(reviews);
  const timeline = buildActualTimeline([s, { ...s, date: "2026-09-23" }], new Map([["E", [p("2026-09-22", "18:36"), p("2026-09-23", "06:02"), p("2026-09-23", "18:45"), p("2026-09-24", "06:02")]]]), reviews);
  const interval = timeline.get(keyOf(s))![0];
  assert.equal(interval.start, stamp("2026-09-22", "18:36"));
  assert.equal(interval.end, stamp("2026-09-23", "06:02"));
  assert.equal(interval.estimated, false);
  assert.equal(interval.uncertain, true);
  assert.equal(timeline.get("E|2026-09-23")!.length, 1);
  assert.equal(JSON.stringify(reviews), before);
});

test("actual colours follow rounded credited hours even when the Master shift differs", () => {
  const interval = (from: string, to: string) => pairActualScans([p(shift.date, from, "IN"), p(shift.date, to, "OUT")])[0];
  assert.equal(actualCardStatus(interval("07:45", "17:00"), shift), "actual");
  assert.equal(actualCardStatus(interval("08:20", "18:00"), shift), "actual-ot");
  assert.equal(actualCardStatus(interval("08:21", "18:00"), shift), "actual-ot");
  assert.equal(actualCardStatus(interval("08:21", "19:00"), { ...shift, shift_start: "20:00", shift_end: "05:00" }), "actual-ot");
  assert.equal(actualCardStatus(interval("08:00", "17:00"), { ...shift, shift_code: "H8" }), "actual-ot");
  assert.equal(actualCardStatus({ ...interval("08:00", "19:00"), uncertain: true }, shift), "missing");
  assert.equal(actualCardStatus(pairActualScans([p(shift.date, "08:00", "IN")])[0], shift), "missing");
});

test("actual night scans ignore a morning master and do not mutate payroll or source", () => {
  const punches = [p(shift.date, "20:00"), p("2026-10-02", "05:00")];
  const original = JSON.stringify({ shift, punches });
  const r = reconcile(shift, punches);
  const timeline = buildActualTimeline([shift], new Map([["E", punches]]), {});
  const a = timeline.get(keyOf(shift))![0];
  assert.equal(a.start, stamp(shift.date, "20:00"));
  assert.equal(a.end, stamp("2026-10-02", "05:00"));
  assert.equal(a.estimated, false);
  const event = layoutShifts(
    [shift],
    [shift.date, "2026-10-02"],
    new Map([[keyOf(shift), r]]),
    Date.now(),
    timeline,
  )[0];
  assert.equal(event.start, a.start);
  assert.equal(event.end, a.end);
  assert.equal(event.last, 1);
  assert.equal(actualMatchesResult([a], r), false);
  assert.deepEqual(reconcile(shift, punches), r);
  assert.equal(JSON.stringify({ shift, punches }), original);
});

test("a missing exit is estimated at entry plus eight hours without stealing next day scans", () => {
  const a = pairActualScans([
    p("2026-10-01", "08:00"),
    p("2026-10-02", "08:00"),
    p("2026-10-02", "17:00"),
  ]);
  assert.equal(a.length, 2);
  assert.equal(a[0].estimated, true);
  assert.equal(a[0].outMs, undefined);
  assert.equal(a[0].end, stamp("2026-10-01", "16:00"));
  assert.equal(a[1].start, stamp("2026-10-02", "08:00"));
  assert.equal(a[1].end, stamp("2026-10-02", "17:00"));
  assert.equal(a[1].estimated, false);
});

test("a lone exit near the next entry remains ambiguous and never consumes the entry", () => {
  const a = pairActualScans([
    p("2026-10-01", "07:00", "OUT"),
    p("2026-10-01", "08:00", "IN"),
    p("2026-10-01", "17:00", "OUT"),
  ]);
  assert.equal(a.length, 2);
  assert.equal(a[0].inMs, undefined);
  assert.equal(a[0].start, stamp("2026-09-30", "23:00"));
  assert.equal(a[1].inMs, stamp("2026-10-01", "08:00"));
  assert.equal(a[0].uncertain, true);
  assert.equal(a[1].uncertain, true);
});

test("repeated scans and missing first entry do not shift subsequent pairs", () => {
  const a = pairActualScans([
    p("2026-10-01", "17:00"),
    p("2026-10-02", "08:00"),
    p("2026-10-02", "08:01"),
    p("2026-10-02", "17:00"),
    p("2026-10-03", "08:00"),
    p("2026-10-03", "17:00"),
  ]);
  assert.equal(a.length, 3);
  assert.equal(a[0].estimated, true);
  assert.deepEqual(
    a.slice(1).map((a) => [a.start, a.end]),
    [
      [stamp("2026-10-02", "08:00"), stamp("2026-10-02", "17:00")],
      [stamp("2026-10-03", "08:00"), stamp("2026-10-03", "17:00")],
    ],
  );
});

test("verified corrections take precedence without manufacturing a missing endpoint", () => {
  const timeline = buildActualTimeline(
    [shift],
    new Map([["E", [p(shift.date, "08:00")]]]),
    {
      [keyOf(shift)]: {
        inTime: "2026-10-01T08:00",
        approved: false,
        overBudget: false,
        note: "",
      },
    },
  );
  assert.equal(timeline.get(keyOf(shift))!.length, 1);
  const a = timeline.get(keyOf(shift))![0];
  assert.equal(a.outMs, undefined);
  assert.equal(a.end, stamp(shift.date, "16:00"));
  assert.equal(a.reviewed, true);
  assert.equal(a.estimated, true);
});
