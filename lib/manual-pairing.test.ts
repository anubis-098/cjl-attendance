import { test } from "node:test";
import assert from "node:assert/strict";
import { applyManualPairs } from "./manual-pairing";
import { type Data, type Shift, stamp, reconcile, keyOf } from "./engine";
import { buildActualTimeline } from "./actual-timeline";
const shift: Shift = { emp_id: "E", device_emp_id: "DEVICE", date: "2026-10-05", emp_name: "Test", department: "Dry", agency: "Test", shift_code: "N", shift_start: "20:00", shift_end: "05:00", requested_ot_hrs: 0, ot_task_target: "" };
const start = stamp("2026-10-05", "16:46"), end = stamp("2026-10-06", "08:59");
const data = (): Data => ({ shifts: [shift, {...shift, date: "2026-10-06"}],
  punches: [start, end, end + 60000, stamp("2026-10-06", "16:50"), stamp("2026-10-07", "06:00")]
    .map(ms => ({device_emp_id: "DEVICE", punch_timestamp: new Date(ms).toISOString(), punch_type: "UNKNOWN"})), reviews: {}, audit: [] });
test("manual pairing persists exact scans, clears approval, audits actor and overrides inferred extensions", () => {
  const source = data();
  source.reviews[keyOf(shift)] = { approved: true, overBudget: true, note: "keep", deductOTBreak: true };
  const original = JSON.stringify(source);
  const next = applyManualPairs(source, "E", "DEVICE", [{inMs:start,outMs:end}], "Supervisor A");
  assert.equal(JSON.stringify(source), original);
  const review = next.reviews[keyOf(shift)];
  assert.equal(review.manualPair, true); assert.equal(review.approved, false); assert.equal(review.note, "keep");
  assert.equal(next.audit[0].actor, "Supervisor A"); assert.equal(next.audit[0].key, keyOf(shift));
  const result = reconcile(shift, next.punches, review);
  assert.equal(result.inMs, start); assert.equal(result.outMs, end); assert.equal(result.approved, false);
  const timeline = buildActualTimeline(next.shifts, new Map([["DEVICE", next.punches]]), next.reviews);
  const interval = timeline.get(keyOf(shift))![0];
  assert.equal(interval.outMs, end); assert.equal(interval.reviewed, true); assert.equal(interval.uncertain, false);
});
test("manual pairing rejects foreign, fabricated, backwards, duplicate and overlapping scans atomically", () => {
  const source = data(), original = JSON.stringify(source);
  for (const pairs of [[], [{inMs:start,outMs:start}], [{inMs:end,outMs:start}], [{inMs:start+1,outMs:end}],
    [{inMs:start,outMs:end},{inMs:start,outMs:end+60000}], [{inMs:start,outMs:end},{inMs:end,outMs:stamp("2026-10-06","16:50")}]] )
    assert.throws(() => applyManualPairs(source, "E", "DEVICE", pairs, "Sup"));
  assert.throws(() => applyManualPairs(source,"E","OTHER",[{inMs:start,outMs:end}],"Sup"));
  assert.equal(JSON.stringify(source), original);
  source.reviews["E|2026-10-04"] = {inTime:"2026-10-04T20:00",outTime:"2026-10-05T18:00", approved:true,overBudget:false,note:""};
  assert.throws(() => applyManualPairs(source,"E","DEVICE",[{inMs:start,outMs:end}],"Sup"), /ทับ/);
});
test("manual matching preserves seconds and accepts multiple days across a month boundary", () => {
  const source = data();
  const a = stamp("2026-10-31","20:00") + 12000, b = stamp("2026-11-01","05:00") + 34000;
  source.punches.push(...[a,b].map(ms => ({device_emp_id:"DEVICE",punch_timestamp:new Date(ms).toISOString(),punch_type:"UNKNOWN" as const})));
  const next = applyManualPairs(source,"E","DEVICE",[{inMs:start,outMs:end},{inMs:a,outMs:b}],"Sup");
  const result = reconcile({...shift,date:"2026-10-31"},next.punches,next.reviews["E|2026-10-31"]);
  assert.equal(result.inMs,a); assert.equal(result.outMs,b); assert.equal(next.audit.length,2);
});
