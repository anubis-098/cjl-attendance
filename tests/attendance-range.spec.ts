import { test, expect, seedData } from "./sql-fixture";
import { readFile } from "node:fs/promises";
import type { Shift } from "../lib/engine";

test("custom inclusive range controls calendar and CSV, while date checkboxes count distinct scanned employees", async ({ page }) => {
  const s: Shift = { emp_id: "A", device_emp_id: "A", emp_name: "Attendance A", agency: "Beyond", department: "Dry", date: "2026-09-23", shift_code: "M", shift_start: "08:00", shift_end: "17:00", requested_ot_hrs: 0, ot_task_target: "" };
  const shifts = [s, { ...s, date: "2026-09-24" }, { ...s, date: "2026-09-25" }, { ...s, emp_id: "B", device_emp_id: "B", emp_name: "Attendance B", date: "2026-09-24" }];
  await seedData({ shifts, punches: shifts.flatMap(row => [
    { device_emp_id: row.device_emp_id, punch_timestamp: `${row.date} 08:00:00`, punch_type: "IN" as const },
    { device_emp_id: row.device_emp_id, punch_timestamp: `${row.date} 17:00:00`, punch_type: "OUT" as const },
  ]), reviews: {}, audit: [], calculationVersion: 2 });
  await page.clock.setFixedTime(new Date("2026-09-23T10:00:00+07:00"));
  await page.goto("/attendance");
  const presence = page.getByTestId("attendance-presence");
  await expect(page.getByTestId("scheduled-today").locator(".stat-value")).toHaveText("1คน");
  await expect(page.getByTestId("scheduled-today")).toContainText("พนักงานตามกะในวันนี้");
  await expect(presence.locator(".stat-value")).toHaveText("1คน");
  await expect(presence).toContainText("วันนี้: 2026-09-23");
  await page.getByRole("button", { name: "กำหนดช่วงวันที่", exact: true }).click();
  await page.getByLabel("จากวันที่", { exact: true }).fill("2026-09-23");
  await page.getByLabel("ถึงวันที่", { exact: true }).fill("2026-09-24");
  await expect(page.locator(".calendar thead th")).toHaveCount(3);
  await page.getByLabel("เลือกวันที่ 2026-09-24", { exact: true }).check();
  await expect(presence.locator(".stat-value")).toHaveText("2คน");
  await expect(page.getByTestId("scheduled-today").locator(".stat-value")).toHaveText("1คน");
  await page.getByLabel("เลือกวันที่ 2026-09-23", { exact: true }).check();
  await expect(presence.locator(".stat-value")).toHaveText("2คน");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ส่งออกรายงาน", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("attendance-2026-09-23-to-2026-09-24.csv");
  const csv = await readFile((await download.path())!, "utf8");
  expect(csv).toContain('"08:00","17:00"');
  expect(csv).not.toContain("2026-09-25");
  expect(csv).not.toContain("T08:00");
  expect(csv.trim().split(/\r?\n/)).toHaveLength(4);
  await page.reload();
  await expect(page.getByLabel("จากวันที่", { exact: true })).toHaveValue("2026-09-23");
  await expect(page.getByLabel("ถึงวันที่", { exact: true })).toHaveValue("2026-09-24");
  await expect(presence.locator(".stat-value")).toHaveText("1คน");
  await page.screenshot({ path: "test-results/attendance-range.png", fullPage: true });
  await page.getByTestId("scheduled-today").click();
  await expect(page.getByLabel("จากวันที่", { exact: true })).toHaveValue("2026-09-23");
  await expect(page.getByLabel("ถึงวันที่", { exact: true })).toHaveValue("2026-09-23");
});

test("saved early exit does not split the real overnight period into a phantom shift", async ({ page, request }) => {
  const s: Shift = { emp_id: "BE000044", device_emp_id: "BE000044", emp_name: "Repeated exit", agency: "Beyond", department: "Fresh Equipment Cleaning", date: "2026-09-22", shift_code: "N", shift_start: "19:00", shift_end: "04:00", requested_ot_hrs: 0, ot_task_target: "" };
  const reviews = { "BE000044|2026-09-22": { inTime: "2026-09-22T18:36", outTime: "2026-09-23T04:00", approved: true, overBudget: false, note: "Saved correction", otRulesVersion: 4 } };
  await seedData({ shifts: [s, { ...s, date: "2026-09-23" }], punches: ["2026-09-22 18:36:00", "2026-09-23 06:02:00", "2026-09-23 18:45:00", "2026-09-24 06:02:00"].map(punch_timestamp => ({ device_emp_id: "BE000044", punch_timestamp, punch_type: "UNKNOWN" as const })), reviews, audit: [], calculationVersion: 2 });
  await page.goto("/employees/BE000044/calendar?month=2026-09");
  await expect(page.locator(".month-shift .actual-card-time")).toHaveCount(2);
  await expect(page.locator(".month-shift.status-missing .actual-card-time")).toHaveText("18:36–06:02");
  await page.locator(".month-shift.status-missing .month-shift-details").click();
  await expect(page.locator(".actual-notice")).toContainText("พบสแกนหลังเวลาออกที่แก้ไขไว้");
  const saved = (await (await request.get("/api/workspace")).json()).data;
  expect(saved.reviews).toEqual(reviews);
});
