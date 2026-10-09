import { test, expect, seedData } from "./sql-fixture";
import type { Shift } from "../lib/engine";
test("overnight bars connect dates, clip at week boundaries and open the original shift", async ({
  page,
}) => {
  const shifts: Shift[] = [
    "2026-09-13",
    "2026-09-14",
    "2026-09-15",
    "2026-09-20",
  ].map((date) => ({
    emp_id: "N",
    device_emp_id: "N",
    emp_name: "Night shift",
    agency: "Test",
    department: "Packing",
    date,
    shift_code: "N",
    shift_start: "20:00",
    shift_end: "05:00",
    requested_ot_hrs: 0,
    ot_task_target: "",
  }));
  await seedData({
    calculationVersion: 2,
    shifts,
    punches: [],
    reviews: {},
    audit: [],
  });
  await page.goto("/attendance");
  await page.getByLabel("เลือกวันที่", { exact: true }).fill("2026-09-14");
  const bar = page.locator('[data-shift-key="N|2026-09-14"]');
  await expect(bar).toHaveCSS("grid-column-start", "1");
  await expect(bar).toHaveCSS("grid-column-end", "3");
  await expect(bar).toContainText("14/09 20:00 → 15/09 05:00");
  await expect(page.locator('[data-shift-key="N|2026-09-13"]')).toContainText(
    "ต่อจากช่วงก่อนหน้า",
  );
  await expect(page.locator('[data-shift-key="N|2026-09-20"]')).toContainText(
    "ต่อไปช่วงถัดไป",
  );
  const next = page.locator('[data-shift-key="N|2026-09-15"]');
  const firstRect = await bar.boundingBox(),
    nextRect = await next.boundingBox();
  expect(firstRect!.y).toBe(nextRect!.y);
  const dayRect = await page
    .locator(".schedule-day-background")
    .first()
    .boundingBox();
  expect(firstRect!.x - dayRect!.x).toBeCloseTo((dayRect!.width * 20) / 24, 0);
  expect(firstRect!.width).toBeCloseTo((dayRect!.width * 9) / 24, 0);
  const carryRect = await page
    .locator('[data-shift-key="N|2026-09-13"]')
    .boundingBox();
  expect(carryRect!.width).toBeCloseTo((dayRect!.width * 5) / 24, 0);
  await bar.getByRole("button").click();
  await expect(page.getByRole("dialog")).toContainText("14 กันยายน");
  await page.getByRole("button", { name: "ปิดรายละเอียด" }).click();
  await page.screenshot({
    path: "test-results/overnight-calendar.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "ช่วงถัดไป", exact: true }).click();
  await expect(page.locator('[data-shift-key="N|2026-09-20"]')).toContainText(
    "ต่อจากช่วงก่อนหน้า",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
