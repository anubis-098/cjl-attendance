import { test } from "node:test";
import assert from "node:assert/strict";
import { canApprove, approveShifts, matchesStatus } from "./workspace";
import { creditedStart, workTime } from "./work-time";
import {
  reconcile,
  Shift,
  Punch,
  emptyOT,
  migrateCalculation,
  Data,
  OT_RULES_VERSION,
} from "./engine";
const shift: Shift = {
  emp_id: "A1",
  device_emp_id: "001",
  emp_name: "Test",
  department: "Packing",
  agency: "Test",
  date: "2026-09-14",
  shift_code: "S1",
  shift_start: "08:00",
  shift_end: "17:00",
  requested_ot_hrs: 2,
  ot_task_target: "Pack",
};
const punches = (start: string, end?: string): Punch[] => [
  { device_emp_id: "001", punch_timestamp: start, punch_type: "IN" },
  ...(end
    ? [
        {
          device_emp_id: "001",
          punch_timestamp: end,
          punch_type: "OUT" as const,
        },
      ]
    : []),
];

test("credited entry rounds minutes 01-20 down and later minutes up without changing recorded times", () => {
  for (const [actual, rounded, ot] of [
    ["07:45:00", "08:00:00", 1],
    ["08:00:00", "08:00:00", 1],
    ["08:01:00", "08:00:00", 1],
    ["08:20:00", "08:00:00", 1],
    ["08:20:59", "08:00:00", 1],
    ["08:21:00", "09:00:00", 1],
    ["08:45:00", "09:00:00", 1],
  ] as const) {
    const source = punches(`2026-09-14 ${actual}`, "2026-09-14 18:00:00");
    const original = JSON.stringify(source);
    const r = reconcile(shift, source);
    assert.equal(r.inMs, Date.parse(`2026-09-14T${actual}+07:00`));
    assert.equal(r.calculationStart, Date.parse(`2026-09-14T${rounded}+07:00`));
    assert.equal(r.rawOT["1.5"], ot);
    assert.equal(r.normal, rounded === "09:00:00" ? 7 : 8);
    assert.equal(r.late, actual > "08:05:00");
    assert.equal(JSON.stringify(source), original);
  }
  const atMidnight = creditedStart(Date.parse("2026-09-14T23:45:00+07:00"));
  assert.equal(atMidnight, Date.parse("2026-09-15T00:00:00+07:00"));
  const overnight = workTime(Date.parse("2026-09-14T20:20:00+07:00"), Date.parse("2026-09-15T06:30:00+07:00"));
  assert.equal(overnight.overtimeStart, Date.parse("2026-09-15T05:00:00+07:00"));
  assert.equal(overnight.overtimeHours, 1.5);
});

test("version 6 reopens version 5 approvals only when payable OT changes", () => {
  const review = { approved: true, overBudget: false, note: "Previous confirmation", otRulesVersion: 5 };
  const logs = punches("2026-09-14 08:21:00", "2026-09-14 19:00:00");
  const changed = reconcile(shift, logs, review);
  assert.equal(changed.actualOT, 2);
  assert.equal(changed.approvalNeedsReview, true);
  assert.equal(changed.approved, false);
  assert.equal(reconcile(shift, logs, { ...review, otRulesVersion: OT_RULES_VERSION }).approved, true);
  assert.equal(reconcile(shift, punches("2026-09-14 07:45:00", "2026-09-14 19:00:00"), review).approved, true);
});
test("BE000609 early entry stays with September 3 without stealing the next evening scan", () => {
  const s = {
    ...shift,
    date: "2026-09-03",
    shift_start: "20:00",
    shift_end: "05:00",
  };
  const p: Punch[] = [
    "2026-09-03 16:41:00",
    "2026-09-04 05:00:00",
    "2026-09-04 16:47:00",
    "2026-09-05 05:00:00",
  ].map((punch_timestamp) => ({
    device_emp_id: "001",
    punch_timestamp,
    punch_type: "UNKNOWN",
  }));
  const r = reconcile(s, p);
  assert.equal(r.inMs, Date.parse("2026-09-03T16:41:00+07:00"));
  assert.equal(r.outMs, Date.parse("2026-09-04T05:00:00+07:00"));
  assert.equal(r.normal, 8);
  assert.equal(r.beforeShiftOT, 3);
  assert.equal(r.afterShiftOT, 0);
  assert.equal(r.rawOT["1.5"], 3);
  assert.equal(r.canDeductOTBreak, true);
  assert.equal(reconcile({ ...s, date: "2026-09-02" }, p).logs.length, 0);
  const next = reconcile({ ...s, date: "2026-09-04" }, p);
  assert.equal(next.inMs, Date.parse("2026-09-04T16:47:00+07:00"));
  assert.equal(next.beforeShiftOT, 3);
  assert.equal(next.afterShiftOT, 0);
  assert.ok(
    !r.logs.some((log) => next.logs.some((other) => other.ms === log.ms)),
  );
});
test("pre-shift overtime has no break deduction; optional break applies only after planned shift", () => {
  const p = punches("2026-09-14 04:41:00", "2026-09-14 20:30:00");
  for (const code of ["M", "H8", "PH8"]) {
    const r = reconcile({ ...shift, shift_code: code }, p, {
      approved: false,
      overBudget: false,
      note: "",
      deductOTBreak: true,
    });
    assert.equal(r.beforeShiftOT, 3);
    assert.equal(r.afterShiftOT, 3);
    assert.equal(r.otBreakHours, 0.5);
    assert.equal(r.rawOT[code === "M" ? "1.5" : "3.0"], 6);
    if (code === "H8") assert.equal(r.rawOT["2.0"], 8);
    if (code === "PH8") assert.equal(r.rawOT["1.0"], 8);
  }
  for (const start of ["07:01", "07:30"])
    assert.equal(
      reconcile(shift, punches(`2026-09-14 ${start}:00`, "2026-09-14 17:00:00"))
        .beforeShiftOT,
      start === "07:01" ? 1 : 0,
    );
  assert.equal(reconcile(shift, punches("2026-09-14 06:00:00")).actualOT, 0);
});

test("BE001030 six-to-fifteen plan splits pre/post OT without shifting the planned end", () => {
  const s = { ...shift, shift_start: "06:00", shift_end: "15:00" };
  const regular = reconcile(s, punches("2026-09-14 04:41:00", "2026-09-14 18:01:00"));
  assert.equal(regular.beforeShiftOT, 1);
  assert.equal(regular.afterShiftOT, 3);
  assert.equal(regular.normal, 8);
  assert.equal(regular.overtimeStart, Date.parse("2026-09-14T15:00:00+07:00"));
  assert.equal(regular.rawOT["1.5"], 4);
  const sunday = reconcile(s, punches("2026-09-14 05:50:00", "2026-09-14 18:00:00"));
  assert.equal(sunday.beforeShiftOT, 0);
  assert.equal(sunday.afterShiftOT, 3);
  const earlyOnly = reconcile(s, punches("2026-09-14 02:00:00", "2026-09-14 15:00:00"), { approved: false, overBudget: false, note: "", deductOTBreak: true });
  assert.equal(earlyOnly.beforeShiftOT, 3.5);
  assert.equal(earlyOnly.afterShiftOT, 0);
  assert.equal(earlyOnly.otBreakHours, 0.5);
});
test("changed historical approvals require confirmation under the new OT rules", () => {
  const p = punches("2026-09-14 05:00:00", "2026-09-14 17:00:00");
  const old = {
    approved: true,
    overBudget: false,
    note: "Previously approved",
  };
  assert.equal(reconcile(shift, p, old).approvalNeedsReview, true);
  assert.equal(reconcile(shift, p, old).approved, false);
  const data: Data = {
    shifts: [shift],
    punches: p,
    reviews: { "A1|2026-09-14": old },
    audit: [],
  };
  const updated = approveShifts(data, [shift]);
  assert.equal(
    updated.reviews["A1|2026-09-14"].otRulesVersion,
    OT_RULES_VERSION,
  );
  assert.equal(
    reconcile(shift, p, updated.reviews["A1|2026-09-14"]).approved,
    true,
  );
  assert.equal(
    reconcile(shift, punches("2026-09-14 08:00:00", "2026-09-14 17:00:00"), old)
      .approved,
    true,
  );
});
test("optional OT break can be used at any post-shift OT amount", () => {
  const review = {
    approved: false,
    overBudget: false,
    note: "",
    deductOTBreak: true,
  };
  for (const [end, gross, net] of [
    ["20:00", 3, 2.5],
    ["20:29", 3, 2.5],
    ["20:30", 3.5, 3],
    ["21:10", 4, 3.5],
  ] as const) {
    const p = punches("2026-09-14 08:00:00", `2026-09-14 ${end}:00`);
    for (const code of ["M", "H8", "PH8"]) {
      const s = { ...shift, shift_code: code };
      const r = reconcile(s, p, review);
      assert.equal(r.grossAfterShiftOT, gross);
      assert.equal(r.monitoredOT, net);
      assert.equal(r.otBreakHours, 0.5);
      assert.equal(reconcile(s, p).monitoredOT, gross);
      if (code === "PH8") assert.equal(r.rawOT["1.0"], 8);
      assert.equal(r.outMs, reconcile(s, p).outMs);
    }
  }
  assert.equal(
    reconcile(shift, punches("2026-09-14 08:00:00"), review).otBreakHours,
    0,
  );
});
test("OT credits actual hours and requires confirmation without a request", () => {
  const p = punches("2026-09-14 07:55:00", "2026-09-14 20:00:00");
  for (const known of [false, true, undefined]) {
    const s = { ...shift, requested_ot_hrs: 0, requested_ot_known: known };
    const r = reconcile(s, p);
    assert.equal(r.actualOT, 3);
    assert.equal(r.punchedOT, 3);
    assert.equal(r.status, "UNAPPROVED");
    assert.equal(r.highOT, false);
    assert.equal(canApprove(r), true);
    const confirmed = reconcile(s, p, {
      approved: true,
      overBudget: false,
      note: "Confirmed",
    });
    assert.equal(confirmed.approved, true);
    assert.equal(confirmed.status, "APPROVED");
    assert.equal(confirmed.actualOT, 3);
    assert.equal(confirmed.requiresOvertimeApproval, false);
  }
});
test("late grace period is strictly over five minutes", () => {
  const s = { ...shift, requested_ot_hrs: 0 };
  assert.equal(
    reconcile(s, punches("2026-09-14 08:05:00", "2026-09-14 17:00:00")).late,
    false,
  );
  assert.equal(
    reconcile(s, punches("2026-09-14 08:06:00", "2026-09-14 17:00:00")).status,
    "LATE",
  );
});
test("missing punch never generates payable hours", () => {
  const r = reconcile(shift, punches("2026-09-14 08:00:00"));
  assert.equal(r.status, "MISSING");
  assert.equal(r.normal, 0);
  assert.equal(r.actualOT, 0);
});
test("night shifts match next-day exit", () => {
  const r = reconcile(
    { ...shift, shift_start: "20:00", shift_end: "05:00" },
    punches("2026-09-14 19:55:00", "2026-09-15 07:30:00"),
  );
  assert.equal(r.normal, 8);
  assert.equal(r.actualOT, 2.5);
  assert.equal(r.rawOT["1.5"], 2.5);
  assert.equal(r.missing, false);
});
test("regular nine-hour shift has eight paid hours and no overtime at 17:00", () => {
  const r = reconcile(
    shift,
    punches("2026-09-14 08:00:00", "2026-09-14 17:00:00"),
  );
  assert.equal(r.normal, 8);
  assert.deepEqual(r.rawOT, emptyOT());
  assert.equal(
    reconcile(shift, punches("2026-09-14 08:00:00", "2026-09-14 17:01:00"))
      .rawOT["1.5"],
    0,
  );
});

test("OT floors to completed half hours before confirmation", () => {
  for (const [time, expected] of [
    ["17:29:59", 0],
    ["17:30:00", 0],
    ["17:59:59", 0],
    ["18:00:00", 1],
    ["18:29:59", 1],
    ["18:30:00", 1.5],
    ["18:54:00", 1.5],
    ["20:06:00", 3],
  ] as const) {
    const r = reconcile(
      { ...shift, requested_ot_hrs: expected },
      punches("2026-09-14 08:00:00", `2026-09-14 ${time}`),
    );
    assert.equal(r.punchedOT, expected);
    assert.equal(r.actualOT, expected);
    assert.equal(r.rawOT["1.5"], expected);
    assert.equal(r.requiresOvertimeApproval, expected > 0);
    assert.equal(r.normal, 8);
    assert.equal(r.targetMet, false);
  }
  const p = punches("2026-09-14 08:00:00", "2026-09-14 18:54:00");
  assert.equal(reconcile(shift, p).shortfallOT, 0);
  assert.equal(reconcile({ ...shift, requested_ot_hrs: 1.2 }, p).actualOT, 1.5);
  assert.equal(
    reconcile(shift, p, { approved: true, overBudget: true, note: "OK" })
      .actualOT,
    1.5,
  );
});

test("holiday rates round separately and overnight scans keep their original times", () => {
  const short = reconcile(
    { ...shift, shift_code: "PH8" },
    punches("2026-09-14 08:00:00", "2026-09-14 17:30:00"),
  );
  assert.equal(short.rawOT["1.0"], 8);
  assert.equal(short.rawOT["3.0"], 0);
  assert.equal(short.actualOT, 8);
  const nightShort = reconcile(
    { ...shift, shift_start: "20:00", shift_end: "05:00" },
    punches("2026-09-14 20:00:00", "2026-09-15 05:30:00"),
  );
  assert.equal(nightShort.actualOT, 0);
  const r = reconcile(
    { ...shift, shift_code: "PH8", requested_ot_hrs: 10 },
    punches("2026-09-14 08:06:00", "2026-09-14 18:54:00"),
  );
  assert.equal(r.rawOT["1.0"], 8);
  assert.equal(r.rawOT["3.0"], 1.5);
  assert.equal(r.actualOT, 9.5);
  const n = reconcile(
    { ...shift, shift_start: "20:00", shift_end: "05:00" },
    punches("2026-09-14 20:00:00", "2026-09-15 06:54:00"),
  );
  assert.equal(n.actualOT, 1.5);
  assert.equal(n.outMs, Date.parse("2026-09-15T06:54:00+07:00"));
});
test("OFF-H splits eight holiday hours at x1 and two post-shift hours at x3", () => {
  const r = reconcile(
    { ...shift, shift_code: "OFF-H", requested_ot_hrs: 10 },
    punches("2026-09-14 08:00:00", "2026-09-14 19:00:00"),
  );
  assert.equal(r.normal, 0);
  assert.equal(r.off, false);
  assert.deepEqual(r.rawOT, { "1.0": 8, "1.5": 0, "2.0": 0, "3.0": 2 });
  assert.deepEqual(r.otByRate, r.rawOT);
  assert.equal(r.actualOT, 10);
});
for (const code of ["OFF-M", "OFF-D"]) {
  test(`${code} earns x2 for eight working hours and x3 afterward`, () => {
    const s = { ...shift, shift_code: code };
    const p = punches("2026-09-14 08:00:00", "2026-09-14 19:00:00");
    const r = reconcile(s, p, {
      approved: true,
      overBudget: false,
      note: "Confirmed",
      otRulesVersion: OT_RULES_VERSION,
    });
    assert.equal(r.normal, 0);
    assert.equal(r.punchedOT, 10);
    assert.equal(r.ratePending, false);
    assert.equal(r.status, "APPROVED");
    assert.deepEqual(r.rawOT, { "1.0": 0, "1.5": 0, "2.0": 8, "3.0": 2 });
    assert.deepEqual(r.otByRate, r.rawOT);
    const atEnd = reconcile(
      s,
      punches("2026-09-14 08:00:00", "2026-09-14 17:00:00"),
    );
    assert.equal(atEnd.normal, 0);
    assert.deepEqual(atEnd.rawOT, { "1.0": 0, "1.5": 0, "2.0": 8, "3.0": 0 });
  });
  test(`${code} applies x2 and x3 across midnight without a request cap`, () => {
    const r = reconcile(
      {
        ...shift,
        shift_code: code,
        shift_start: "20:00",
        shift_end: "05:00",
        requested_ot_hrs: 1,
      },
      punches("2026-09-14 20:00:00", "2026-09-15 07:00:00"),
    );
    assert.equal(r.normal, 0);
    assert.equal(r.rawOT["2.0"], 8);
    assert.equal(r.otByRate["2.0"], 8);
    assert.equal(r.rawOT["3.0"], 2);
  });
}
test("weekly rate changes reopen only affected old approvals and preserve version-3 regular approvals", () => {
  const review = {
    approved: true,
    overBudget: false,
    note: "",
    otRulesVersion: 3,
  };
  const p = punches("2026-09-14 08:00:00", "2026-09-14 19:00:00");
  const weekly = { ...shift, shift_code: "H8" };
  assert.equal(reconcile(weekly, p, review).approvalNeedsReview, true);
  assert.equal(reconcile(weekly, p, review).approved, false);
  assert.equal(
    reconcile(weekly, p, { ...review, otRulesVersion: OT_RULES_VERSION })
      .approved,
    true,
  );
  assert.equal(
    reconcile(
      shift,
      punches("2026-09-14 06:00:00", "2026-09-14 19:00:00"),
      review,
    ).approved,
    true,
  );
  const partial = reconcile(weekly, [], {
    ...review,
    inTime: "2026-09-14T08:00",
    outTime: "2026-09-14T13:54",
  });
  assert.equal(partial.rawOT["2.0"], 4.5);
  assert.equal(partial.rawOT["3.0"], 0);
});
test("holiday OT includes both rates without a request cap", () => {
  const s = { ...shift, shift_code: "OFF-H", requested_ot_hrs: 9 };
  const p = punches("2026-09-14 08:00:00", "2026-09-14 19:00:00");
  assert.deepEqual(reconcile(s, p).otByRate, {
    "1.0": 8,
    "1.5": 0,
    "2.0": 0,
    "3.0": 2,
  });
  assert.equal(
    reconcile(s, p, { approved: true, overBudget: true, note: "Confirmed" })
      .otByRate["3.0"],
    2,
  );
});
test("holidays with no attendance are days off, one punch is missing", () => {
  for (const code of ["OFF-M", "OFF-D", "OFF-H"]) {
    const s = { ...shift, shift_code: code, requested_ot_hrs: 0 };
    assert.equal(reconcile(s, []).status, "OFF");
    assert.equal(
      reconcile(s, punches("2026-09-14 08:00:00")).status,
      "MISSING",
    );
    assert.deepEqual(
      reconcile(s, punches("2026-09-14 08:00:00")).rawOT,
      emptyOT(),
    );
  }
});
test("holiday overnight shift keeps holiday multipliers across midnight", () => {
  const r = reconcile(
    {
      ...shift,
      shift_code: "OFF-H",
      shift_start: "20:00",
      shift_end: "05:00",
      requested_ot_hrs: 10,
    },
    punches("2026-09-14 20:00:00", "2026-09-15 07:00:00"),
  );
  assert.equal(r.rawOT["1.0"], 8);
  assert.equal(r.rawOT["3.0"], 2);
});
test("old approvals are reopened once with original audit and edits preserved", () => {
  const data: Data = {
    shifts: [shift],
    punches: [],
    reviews: {
      old: {
        approved: true,
        overBudget: true,
        note: "Original",
        inTime: "2026-09-14T08:00",
      },
    },
    audit: [],
  };
  const migrated = migrateCalculation(data);
  assert.equal(migrated.reviews.old.approved, false);
  assert.equal(migrated.reviews.old.inTime, data.reviews.old.inTime);
  assert.equal(migrated.audit.length, 1);
  assert.equal(data.reviews.old.approved, true);
  assert.equal(migrateCalculation(migrated), migrated);
});
test("legacy request amounts do not create shortfalls or cap OT", () => {
  for (const requested of [0, 1, 2, 4]) {
    const r = reconcile(
      { ...shift, requested_ot_hrs: requested },
      punches("2026-09-14 08:00:00", "2026-09-14 18:54:00"),
    );
    assert.equal(r.status, "UNAPPROVED");
    assert.equal(r.actualOT, 1.5);
    assert.equal(r.shortfallOT, 0);
    assert.equal(r.excessOT, 0);
    assert.equal(canApprove(r), true);
  }
});
test("confirmation can be revoked without changing calculated hours", () => {
  const p = punches("2026-09-14 08:00:00", "2026-09-14 19:30:00");
  for (const overBudget of [false, true]) {
    const confirmed = reconcile(shift, p, {
      approved: true,
      overBudget,
      note: "Confirmed",
    });
    assert.equal(confirmed.approved, true);
    assert.equal(confirmed.actualOT, 2.5);
    const pending = reconcile(shift, p, {
      approved: false,
      overBudget,
      note: "Draft",
    });
    assert.equal(pending.approved, false);
    assert.equal(pending.status, "UNAPPROVED");
    assert.equal(canApprove(pending), true);
  }
});
test("bulk confirmation accepts actual OT but rejects missing scans", () => {
  const s = { ...shift, requested_ot_known: false };
  const data: Data = {
    calculationVersion: 2,
    shifts: [s],
    punches: punches("2026-09-14 08:00:00", "2026-09-14 20:00:00"),
    reviews: {},
    audit: [],
  };
  const updated = approveShifts(data, [s]);
  assert.equal(updated.reviews["A1|2026-09-14"].approved, true);
  assert.equal(updated.audit.length, 1);
  assert.equal(
    reconcile(s, data.punches, updated.reviews["A1|2026-09-14"]).actualOT,
    3,
  );
  const missing = approveShifts(
    { ...data, punches: data.punches.slice(0, 1) },
    [s],
  );
  assert.deepEqual(missing.reviews, {});
  assert.equal(missing.audit.length, 0);
});
test("high OT begins at exactly five actual x1.5 hours even within the request", () => {
  const s = { ...shift, requested_ot_hrs: 6 };
  const below = reconcile(
    s,
    punches("2026-09-14 08:00:00", "2026-09-14 21:59:00"),
  );
  assert.equal(below.highOT, false);
  assert.equal(canApprove(below), true);
  const at = reconcile(
    s,
    punches("2026-09-14 08:00:00", "2026-09-14 22:00:00"),
  );
  assert.equal(at.highOT, true);
  assert.equal(at.status, "UNAPPROVED");
  assert.equal(at.exceedsTarget, false);
  assert.equal(at.monitoredOT, 5);
  assert.equal(canApprove(at), true);
  const oldApproval = reconcile(
    s,
    punches("2026-09-14 08:00:00", "2026-09-14 22:00:00"),
    { approved: true, overBudget: false, note: "General approval" },
  );
  assert.equal(oldApproval.approved, true);
});
test("holiday x1 hours do not count toward the five-hour high-OT threshold", () => {
  const s = { ...shift, shift_code: "OFF-H", requested_ot_hrs: 12 };
  const below = reconcile(
    s,
    punches("2026-09-14 08:00:00", "2026-09-14 19:59:00"),
  );
  assert.equal(below.rawOT["1.0"], 8);
  assert.equal(below.highOT, false);
  assert.equal(canApprove(below), true);
  const at = reconcile(
    s,
    punches("2026-09-14 08:00:00", "2026-09-14 22:00:00"),
  );
  assert.equal(at.monitoredOT, 5);
  assert.equal(at.rawOT["3.0"], 5);
  assert.equal(at.highOT, true);
  assert.equal(at.status, "UNAPPROVED");
  assert.equal(at.punchedOT, 13);
  assert.equal(canApprove(at), true);
});
test("outside matching window and other employee punches are excluded", () => {
  assert.equal(
    reconcile(shift, punches("2026-09-14 00:29:00", "2026-09-14 17:00:00"))
      .missing,
    true,
  );
  assert.equal(
    reconcile(
      shift,
      punches("2026-09-14 08:00:00", "2026-09-14 19:30:00").map((p) => ({
        ...p,
        device_emp_id: "002",
      })),
    ).missing,
    true,
  );
});
test("unknown punch cannot act as both entry and exit", () => {
  const r = reconcile(shift, [
    {
      device_emp_id: "001",
      punch_timestamp: "2026-09-14 08:00:00",
      punch_type: "UNKNOWN",
    },
  ]);
  assert.equal(r.missing, true);
});
test("new holiday codes keep company OT rates and worked holidays require scans", () => {
  const p = punches("2026-09-14 08:00:00", "2026-09-14 20:00:00");
  for (const code of ["PH", "PH 8", "PH8"]) {
    const r = reconcile(
      { ...shift, shift_code: code, requested_ot_hrs: 11 },
      p,
    );
    assert.equal(r.rawOT["1.0"], 8);
    assert.equal(r.rawOT["3.0"], 3);
  }
  for (const code of ["H", "H8"]) {
    const r = reconcile({ ...shift, shift_code: code }, p);
    assert.equal(r.normal, 0);
    assert.equal(r.rawOT["2.0"], 8);
    assert.equal(r.rawOT["3.0"], 3);
  }
  for (const code of ["H8", "PH8"])
    assert.equal(
      reconcile({ ...shift, shift_code: code, requested_ot_hrs: 0 }, []).status,
      "MISSING",
    );
  for (const code of ["H", "PH"])
    assert.equal(
      reconcile({ ...shift, shift_code: code, requested_ot_hrs: 0 }, []).status,
      "OFF",
    );
});
test("leave, absence and resign are not missing scans or payable attendance", () => {
  for (const [code, status] of [
    ["WOP", "LEAVE"],
    ["PL", "LEAVE"],
    ["SL", "LEAVE"],
    ["AB", "ABSENT"],
    ["R", "RESIGNED"],
  ]) {
    const s = { ...shift, shift_code: code, requested_ot_hrs: 0 };
    const r = reconcile(s, []);
    assert.equal(r.status, status);
    assert.equal(r.missing, false);
    assert.equal(canApprove(r), false);
    const conflict = reconcile(
      s,
      punches("2026-09-14 08:00:00", "2026-09-14 20:00:00"),
    );
    assert.equal(conflict.status, "SCHEDULE_CONFLICT");
    assert.equal(conflict.normal, 0);
    assert.equal(conflict.actualOT, 0);
    assert.equal(canApprove(conflict), false);
  }
});
test("missing daily OT request does not block confirmation", () => {
  const r = reconcile(
    { ...shift, requested_ot_known: false },
    punches("2026-09-14 08:00:00", "2026-09-14 20:00:00"),
    { approved: true, overBudget: true, note: "Confirmed" },
  );
  assert.equal(r.status, "APPROVED");
  assert.equal(r.punchedOT, 3);
  assert.equal(r.actualOT, 3);
  assert.equal(r.approved, true);
  assert.equal(r.exceedsTarget, false);
});

test("overtime stays pending, with high-OT flag starting at five hours", () => {
  for (const [hours, high] of [[3, false], [4, false], [5, true]] as const) {
    const r = reconcile(
      { ...shift, requested_ot_hrs: hours },
      punches("2026-09-14 08:00:00", `2026-09-14 ${17 + hours}:00:00`),
    );
    assert.equal(r.status, "UNAPPROVED");
    assert.equal(r.highOT, high);
    assert.equal(r.requiresOvertimeApproval, true);
    assert.equal(canApprove(r), true);
    assert.equal(r.approved, false);
  }
  const holiday = reconcile(
    { ...shift, shift_code: "OFF-H", requested_ot_hrs: 11 },
    punches("2026-09-14 08:00:00", "2026-09-14 20:00:00"),
  );
  assert.equal(holiday.status, "UNAPPROVED");
  assert.equal(holiday.requiresOvertimeApproval, true);
});
test("zero OT is normal while missing scans still block confirmation", () => {
  const complete = reconcile(
    shift,
    punches("2026-09-14 08:00:00", "2026-09-14 17:00:00"),
  );
  assert.equal(complete.status, "NORMAL");
  assert.equal(complete.shortfallOT, 0);
  const missing = reconcile(shift, punches("2026-09-14 08:00:00"));
  assert.equal(missing.status, "MISSING");
  assert.equal(missing.underTarget, false);
});

test("detailed filters find overlapping late and overtime approval conditions", () => {
  const lateSuccess = reconcile(
    shift,
    punches("2026-09-14 08:10:00", "2026-09-14 19:00:00"),
  );
  assert.equal(lateSuccess.status, "UNAPPROVED");
  assert.equal(matchesStatus(lateSuccess, "LATE"), true);
  assert.equal(matchesStatus(lateSuccess, "issues"), true);
  assert.equal(matchesStatus(lateSuccess, "MISSING"), false);
  const highPending = reconcile(
    shift,
    punches("2026-09-14 08:00:00", "2026-09-14 22:00:00"),
  );
  assert.equal(highPending.status, "UNAPPROVED");
  assert.equal(matchesStatus(highPending, "UNAPPROVED"), true);
  assert.equal(matchesStatus(highPending, "OVER"), true);
  const exact = reconcile(
    shift,
    punches("2026-09-14 08:00:00", "2026-09-14 19:00:00"),
  );
  assert.equal(matchesStatus(exact, "issues"), true);
  assert.equal(matchesStatus(exact, "UNAPPROVED"), true);
  assert.equal(matchesStatus(exact, "pending"), true);
});
