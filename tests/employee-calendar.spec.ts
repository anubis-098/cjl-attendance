import { test, expect, seedData } from "./sql-fixture";
import type { Shift } from "../lib/engine";

test("monthly bulk confirmation saves only selected eligible shifts for this employee and month", async ({
  page,
  request,
}) => {
  const shifts: Shift[] = [
    "2026-08-31",
    "2026-09-01",
    "2026-09-02",
    "2026-09-03",
    "2026-09-04",
    "2026-09-05",
  ].map((date) => ({
    emp_id: "BULK",
    device_emp_id: "BULK",
    emp_name: "Bulk employee",
    agency: "Test",
    department: "Packing",
    date,
    shift_code: date.endsWith("05") ? "H" : "M",
    shift_start: "08:00",
    shift_end: "17:00",
    requested_ot_hrs: 0,
    requested_ot_known: false,
    ot_task_target: "",
  }));
  shifts.push({
    ...shifts[1],
    emp_id: "OTHER",
    device_emp_id: "OTHER",
    emp_name: "Other employee",
  });
  await seedData({
    calculationVersion: 2,
    shifts,
    punches: shifts
      .filter((s) => !s.date.endsWith("05"))
      .flatMap((s) => [
        {
          device_emp_id: s.device_emp_id,
          punch_timestamp: `${s.date} 08:00:00`,
          punch_type: "IN" as const,
        },
        ...(!s.date.endsWith("03")
          ? [
              {
                device_emp_id: s.device_emp_id,
                punch_timestamp: `${s.date} 19:00:00`,
                punch_type: "OUT" as const,
              },
            ]
          : []),
      ]),
    reviews: {
      "BULK|2026-09-04": {
        approved: true,
        overBudget: false,
        note: "Already confirmed",
      },
    },
    audit: [],
  });
  await page.goto("/employees/BULK/calendar?month=2026-09");
  await page.getByRole("button", { name: "เลือกยืนยันเป็นกลุ่ม" }).click();
  const first = page.getByRole("checkbox", {
    name: "เลือกกะ 2026-09-01 M",
    exact: true,
  });
  await first.check();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "ยืนยันที่เลือก (1)" }),
  ).toBeEnabled();
  for (const [date, code] of [
    ["2026-08-31", "M"],
    ["2026-09-03", "M"],
    ["2026-09-04", "M"],
    ["2026-09-05", "H"],
  ]) {
    await expect(
      page.getByRole("checkbox", {
        name: `เลือกกะ ${date} ${code}`,
        exact: true,
      }),
    ).toBeDisabled();
  }
  await page.getByRole("button", { name: "เดือนถัดไป", exact: true }).click();
  await page
    .getByRole("button", { name: "เดือนก่อนหน้า", exact: true })
    .click();
  await page.getByRole("button", { name: "เลือกยืนยันเป็นกลุ่ม" }).click();
  await expect(first).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "ยืนยันที่เลือก (0)" }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: "เลือกกะที่ยืนยันได้ทั้งหมดในเดือนนี้" })
    .check();
  await expect(
    page.getByRole("button", { name: "ยืนยันที่เลือก (2)" }),
  ).toBeEnabled();
  await page.screenshot({
    path: "test-results/month-bulk-selection.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "ยืนยันที่เลือก (2)" }).click();
  await expect(
    page.getByRole("button", { name: "เลือกยืนยันเป็นกลุ่ม" }),
  ).toBeVisible();
  await page.reload();
  const saved = (await (await request.get("/api/workspace")).json()).data;
  expect(Object.keys(saved.reviews).sort()).toEqual([
    "BULK|2026-09-01",
    "BULK|2026-09-02",
    "BULK|2026-09-04",
  ]);
  expect(saved.reviews["BULK|2026-09-01"].approved).toBe(true);
  expect(saved.reviews["BULK|2026-09-02"].approved).toBe(true);
  expect(saved.audit).toHaveLength(2);
  await expect(page.locator(".confirmed-check")).toHaveCount(3);
});

test("employee names open monthly calendars with coded striped holidays and overnight continuity", async ({
  page,
}) => {
  const shifts: Shift[] = [
    ["2026-09-14", "H"],
    ["2026-09-15", "PH8"],
    ["2026-09-16", "N"],
    ["2026-09-30", "N"],
  ].map(([date, code]) => ({
    emp_id: "EMP-01",
    device_emp_id: "001",
    emp_name: "Calendar employee",
    agency: "Test",
    department: "Packing",
    date,
    shift_code: code,
    shift_start: code === "N" ? "20:00" : "08:00",
    shift_end: code === "N" ? "05:00" : "17:00",
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
  await page
    .getByRole("link", { name: "Calendar employee", exact: true })
    .click();
  await expect(page).toHaveURL(/employees\/EMP-01\/calendar/);
  await expect(
    page.getByRole("heading", { name: "Calendar employee" }),
  ).toBeVisible();
  await expect(page.getByLabel("เลือกเดือน")).toHaveValue("2026-09");
  const holiday = page.locator('[data-calendar-date="2026-09-14"]');
  await expect(holiday.locator(".holiday-day-code")).toHaveText("H");
  await expect(holiday).toHaveCSS("background-color", "rgb(238, 241, 244)");
  await expect(holiday).toHaveCSS(
    "background-image",
    /repeating-linear-gradient/,
  );
  await expect(
    page.locator('[data-calendar-date="2026-09-15"] .holiday-day-code'),
  ).toHaveText("PH8");
  await expect(
    page.locator('[data-calendar-date="2026-09-20"]'),
  ).not.toHaveClass(/holiday-striped/);
  const night = page.getByRole("button", { name: "รายละเอียด 2026-09-16 N" });
  const day = await page
    .locator('[data-calendar-date="2026-09-16"]')
    .boundingBox();
  const rect = await night.locator("..").boundingBox();
  expect(rect!.width).toBeCloseTo((day!.width * 9) / 24, 0);
  await night.click();
  await expect(page.getByRole("dialog")).toContainText("16 กันยายน");
  await page.getByRole("button", { name: "ปิดรายละเอียด" }).click();
  await page.screenshot({
    path: "test-results/employee-month-calendar.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "เดือนถัดไป", exact: true }).click();
  await expect(page.getByLabel("เลือกเดือน")).toHaveValue("2026-10");
  await expect(
    page.getByRole("button", { name: "รายละเอียด 2026-09-30 N" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/employees");
  await page
    .getByRole("link", { name: "Calendar employee", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Calendar employee" }),
  ).toBeVisible();
});
