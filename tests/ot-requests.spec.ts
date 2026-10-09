import { test, expect, seedData, TEST_PASSWORD } from "./sql-fixture";

test("both roles request and edit multi-day night OT without changing payroll or approvals", async ({ page, request }) => {
  await seedData({ calculationVersion: 2, reviews: {}, audit: [], punches: [], shifts: [
    { emp_id: "OT1", device_emp_id: "OT1", emp_name: "OT employee", department: "Dry", agency: "Test", date: "2026-09-03", shift_code: "N", shift_start: "20:00", shift_end: "05:00", requested_ot_hrs: 0, ot_task_target: "" },
    { emp_id: "OT1", device_emp_id: "OT1", emp_name: "OT employee", department: "Dry", agency: "Test", date: "2026-09-05", shift_code: "SL", shift_start: "20:00", shift_end: "05:00", requested_ot_hrs: 0, ot_task_target: "" },
    { emp_id: "OT1", device_emp_id: "OT1", emp_name: "OT employee", department: "Dry", agency: "Test", date: "2026-09-04", shift_code: "N", shift_start: "20:00", shift_end: "05:00", requested_ot_hrs: 0, ot_task_target: "" },
  ] });
  const baseline = await (await request.get("/api/payroll?month=2026-09&cycle=26-25")).json();
  const login = await page.request.post("/api/auth/login", { data: { username: "testsupervisor", password: TEST_PASSWORD } });
  expect(login.ok()).toBeTruthy();
  await page.goto("/employees/OT1/calendar?month=2026-09");
  await page.getByRole("button", { name: "ขอ OT", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveCount(0);
  await page.getByLabel("เลือกวันขอ OT 2026-09-05", { exact: true }).click();
  await expect(dialog.getByLabel("OT ก่อนกะ (ชม.)", { exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.getByLabel("เลือกวันขอ OT 2026-09-03", { exact: true }).click();
  await dialog.getByLabel("OT ก่อนกะ (ชม.)", { exact: true }).fill("3");
  await dialog.getByLabel("OT หลังกะ (ชม.)", { exact: true }).fill("1.5");
  await dialog.getByLabel("เหตุผล / งานที่ให้ทำ", { exact: true }).fill("Prepare shipment");
  await expect(dialog).toContainText("2026-09-03 17:00 → 2026-09-03 20:00");
  await expect(dialog).toContainText("2026-09-04 05:00 → 2026-09-04 06:30");
  const timeline = dialog.getByRole("group", { name: "กราฟิกเวลาขอ OT" });
  await expect(timeline).toBeVisible();
  await expect(timeline.locator(".preview-ot[title]")).toHaveCount(2);
  await expect(timeline).toContainText("06:30 (2026-09-04)");
  const preBar = timeline.locator(".preview-ot[title]").first();
  expect(await preBar.evaluate((element) => parseFloat((element as HTMLElement).style.width))).toBeCloseTo(3 / 13.5 * 100, 3);
  await dialog.getByRole("button", { name: "ส่งคำขอ OT", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByLabel("เลือกวันขอ OT 2026-09-04", { exact: true }).click();
  await dialog.getByLabel("เหตุผล / งานที่ให้ทำ", { exact: true }).fill("Next night");
  await dialog.getByRole("button", { name: "ส่งคำขอ OT", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const saved = await (await request.get("/api/ot-requests?employeeId=OT1&month=2026-09")).json();
  expect(saved.requests[0].status).toBe("pending");
  expect(saved.requests[0].requested_by).toContain("testsupervisor");
  const invalid = await request.post("/api/ot-requests", { data: { employeeId: "OT1", month: "2026-09", revision: saved.revision, dates: ["2026-09-03"], beforeHours: 0.5, afterHours: 1, reason: "Invalid" } });
  expect(invalid.status()).toBe(400);
  const stale = await request.post("/api/ot-requests", { data: { employeeId: "OT1", month: "2026-09", revision: saved.revision - 1, dates: ["2026-09-03"], beforeHours: 1, afterHours: 1, reason: "Stale" } });
  expect(stale.status()).toBe(409);
  await page.request.post("/api/auth/login", { data: { username: "testadmin", password: TEST_PASSWORD } });
  await page.reload();
  await page.getByRole("button", { name: "ขอ OT", exact: true }).click();
  await page.getByLabel("เลือกวันขอ OT 2026-09-03", { exact: true }).click();
  await expect(dialog.getByLabel("OT ก่อนกะ (ชม.)", { exact: true })).toHaveValue("3.0");
  await dialog.getByLabel("OT หลังกะ (ชม.)", { exact: true }).fill("2");
  await dialog.getByRole("button", { name: "ส่งคำขอ OT", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("เลือกวันขอ OT 2026-09-03", { exact: true }).click();
  await expect(dialog.getByLabel("OT หลังกะ (ชม.)", { exact: true })).toHaveValue("2.0");
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  const final = await (await request.get("/api/ot-requests?employeeId=OT1&month=2026-09")).json();
  expect(final.requests).toHaveLength(2);
  expect(Number(final.requests[0].after_hours)).toBe(2);
  const workspace = await (await request.get("/api/workspace")).json();
  expect(workspace.data.reviews).toEqual({});
  expect(workspace.data.audit).toHaveLength(3);
  const payroll = await (await request.get("/api/payroll?month=2026-09&cycle=26-25")).json();
  expect(payroll.rows).toEqual(baseline.rows);
  await page.context().clearCookies();
  expect((await page.request.get("/api/ot-requests?employeeId=OT1&month=2026-09")).status()).toBe(401);
});
