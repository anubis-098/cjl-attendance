import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { importCJFiles, parseCJTime, parseFingerLog } from "./import-cj";
import { reconcile } from "./engine";
import { canApprove } from "./workspace";
import { nonWorkingCodes } from "./day-codes";

test("fingerprint TXT validates compact dates/times, retains IDs and deduplicates", () => {
  const result = parseFingerLog(
    "\uFEFF001\t20260826\t0301\r\n001\t20260826\t0301\r\nAB01\t20260825\t2359\r\n",
  );
  assert.equal(result.duplicateScans, 1);
  assert.equal(result.punches.length, 2);
  assert.equal(result.punches[1].device_emp_id, "001");
  assert.equal(result.punches[1].punch_timestamp, "2026-08-26T03:01:00");
  assert.equal(result.punches[1].punch_type, "UNKNOWN");
  for (const line of [
    "001 20260230 1200",
    "001 20260101 2460",
    "001 20260101 12",
    "001 20260101 1200 extra",
  ])
    assert.throws(() => parseFingerLog(line));
});
test("CJ clock fields accept Excel times and dotted or colon notation", () => {
  assert.equal(parseCJTime("7.00"), "07:00");
  assert.equal(parseCJTime("17:00"), "17:00");
  assert.equal(parseCJTime("24.00"), "00:00");
  assert.equal(parseCJTime(0.25), "06:00");
  assert.equal(parseCJTime("25.00"), null);
});
test("real example workbooks reconcile without inventing daily OT requests", async () => {
  const file = (name: string) =>
    new File([readFileSync(`examples/${name}`)], name);
  const report = await importCJFiles(
    file("Master Name list.xlsx"),
    file("All-attlogd2026-09-180959.txt"),
    file(readdirSync("examples").find((n) => n.startsWith("1_CDC"))!),
  );
  assert.equal(report.summary.rawScans, 8349);
  assert.equal(report.summary.duplicateScans, 42);
  assert.equal(report.summary.from, "2026-08-26");
  assert.equal(report.summary.to, "2026-09-18");
  assert.ok(report.data.shifts.length > 1000);
  assert.equal(report.data.punches.length, 8307);
  assert.ok(report.issues.some((i) => i.reason.includes("รอยืนยันโค้ด H")));
  assert.ok(report.issues.some((i) => i.reason.includes("First/Last Time")));
  for (const s of report.data.shifts) {
    assert.equal(s.requested_ot_known, nonWorkingCodes.has(s.shift_code));
    const r = reconcile(s, report.data.punches);
    assert.equal(
      canApprove(r),
      !r.off && !r.nonWorking && !r.missing && !r.ratePending,
    );
    assert.equal(r.underTarget, false);
    assert.equal(r.targetMet, false);
  }
  console.log(
    "CJ import summary:",
    JSON.stringify({
      ...report.summary,
      shifts: report.data.shifts.length,
      issues: report.issues.length,
    }),
  );
});
