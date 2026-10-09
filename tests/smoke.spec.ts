import { test, expect, seedData, TEST_PASSWORD } from "./sql-fixture";
import type { Data } from "../lib/engine";
test("holiday review persists in SQL and is visible in a second browser", async ({
  page,
  browser,
  request,
}) => {
  const data: Data = {
    calculationVersion: 2,
    shifts: [
      {
        emp_id: "H1",
        device_emp_id: "001",
        emp_name: "Holiday test",
        agency: "Test",
        department: "Packing",
        date: "2026-09-14",
        shift_code: "PH8",
        shift_start: "08:00",
        shift_end: "17:00",
        requested_ot_hrs: 10,
        ot_task_target: "Holiday work",
      },
    ],
    punches: [
      {
        device_emp_id: "001",
        punch_timestamp: "2026-09-14T08:00:00",
        punch_type: "IN",
      },
      {
        device_emp_id: "001",
        punch_timestamp: "2026-09-14T19:00:00",
        punch_type: "OUT",
      },
    ],
    reviews: {},
    audit: [],
  };
  await seedData(data);
  await page.goto("/attendance");
  await page.getByLabel("เลือกวันที่", { exact: true }).fill("2026-09-14");
  await page.locator(".attendance-card").click();
  await expect(page.locator(".rate-table tbody tr").nth(0)).toHaveText(
    "x1.088",
  );
  await page
    .getByPlaceholder("ระบุผลการทำงานตามเป้าหมาย OT")
    .fill("ครบตามเป้าหมาย");
  await page.getByRole("switch").check();
  await page.getByRole("button", { name: "บันทึกผลตรวจสอบ" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const fresh = await browser.newPage();
  const login = await fresh.request.post("http://localhost:3001/api/auth/login", {
    data: { username: "testadmin", password: TEST_PASSWORD },
  });
  expect(login.ok()).toBeTruthy();
  await fresh.goto("http://localhost:3001/audit-log");
  await expect(fresh.locator(".audit-entry")).toHaveCount(1);
  await fresh.close();
  const saved = await (await request.get("/api/workspace")).json();
  expect(saved.data.reviews["H1|2026-09-14"].approved).toBe(true);
  const stale = await request.put("/api/workspace", {
    data: { revision: saved.revision - 1, reviews: {}, audit: [] },
  });
  expect(stale.status()).toBe(409);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
