import { test, expect, seedData } from "./sql-fixture";
import { demoData } from "../lib/engine";
test("SQL starts empty and ignores legacy localStorage", async ({
  page,
  request,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "shiftly-v1",
      JSON.stringify({
        shifts: [{ emp_id: "OLD-MOCK" }],
        punches: [],
        reviews: {},
        audit: [],
      }),
    ),
  );
  await page.goto("/attendance");
  await expect(page.locator(".calendar tbody tr")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "ภาพรวมเวลาทำงาน" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "ข้อมูลพนักงาน", exact: true }).click();
  await expect(page.locator(".panel > .report-scroll > .report-table th")).toHaveCount(21);
  await expect(
    page.getByRole("columnheader", { name: "Satatus", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "เวลาสแกนนิ้ว", exact: true }).click();
  await expect(page.locator(".panel > .report-scroll > .report-table th")).toHaveText([
    "รหัสพนักงาน",
    "ปี/เดือน/วัน",
    "เวลาสแกนนิ้ว",
  ]);
  const data = await (await request.get("/api/workspace")).json();
  expect(data.data.shifts).toEqual([]);
  expect(data.data.punches).toEqual([]);
  expect(data.employeeCount).toBe(0);
});
test("SQL employee directory paginates and attendance filters persist", async ({
  page,
}) => {
  const data = demoData(),
    base = data.shifts[0];
  data.shifts = Array.from({ length: 80 }, (_, i) => ({
    ...base,
    emp_id: `E-${i}`,
    emp_name: `Employee ${i}`,
    date: "2026-09-14",
  }));
  data.punches = [];
  data.reviews = {};
  data.audit = [];
  await seedData(data);
  await page.goto("/employees");
  await expect(page.locator(".panel > .report-scroll > .report-table tbody tr")).toHaveCount(25);
  await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
  await expect(page.locator(".panel > .report-scroll > .report-table tbody tr").first()).toContainText(
    "E-25",
  );
  await page.locator('a.nav[href="/attendance"]').click();
  await page.getByLabel("เลือกวันที่", { exact: true }).fill("2026-09-14");
  await expect(page.locator(".calendar tbody tr")).toHaveCount(25);
  await page.getByLabel("จำนวนรายการต่อหน้า").selectOption("50");
  await expect(page.locator(".calendar tbody tr")).toHaveCount(50);
  await expect(page.locator(".pagination")).toContainText("1–50 จาก 80");
  await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
  await expect(page.locator(".calendar tbody tr")).toHaveCount(30);
  await page.getByLabel("จำนวนรายการต่อหน้า").selectOption("100");
  await expect(page.locator(".calendar tbody tr")).toHaveCount(80);
  await expect(page.locator(".pagination")).toContainText("หน้า 1 / 1");
  await page.getByPlaceholder("ค้นหาชื่อ หรือรหัสพนักงาน...").fill("E-25");
  await expect(page.locator(".calendar tbody tr")).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByPlaceholder("ค้นหาชื่อ หรือรหัสพนักงาน..."),
  ).toHaveValue("E-25");
});
