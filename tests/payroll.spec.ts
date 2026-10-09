import { test, expect, seedData } from "./sql-fixture";
import type { Shift } from "../lib/engine";
import { OT_RULES_VERSION } from "../lib/engine";
import { readFile } from "node:fs/promises";
import * as XLSX from "xlsx";

test("weekly worked holiday dashboard includes x2/x3 only once", async ({ page }) => {
  const shift: Shift = { emp_id: "WEEKLY", device_emp_id: "WEEKLY", emp_name: "Weekly worker", agency: "Test", department: "Seafood", date: "2026-09-14", shift_code: "H8", shift_start: "08:00", shift_end: "17:00", requested_ot_hrs: 0, ot_task_target: "" };
  await seedData({ calculationVersion: 2, shifts: [shift, { ...shift, date: "2026-09-15", shift_code: "H" }], punches: [
    { device_emp_id: "WEEKLY", punch_timestamp: "2026-09-14 08:00:00", punch_type: "IN" },
    { device_emp_id: "WEEKLY", punch_timestamp: "2026-09-14 19:00:00", punch_type: "OUT" },
  ], reviews: { "WEEKLY|2026-09-14": { approved: true, overBudget: false, note: "", otRulesVersion: OT_RULES_VERSION } }, audit: [] });
  await page.goto("/payroll");
  await page.getByLabel("เดือนจ่าย").fill("2026-09");
  const row = page.getByRole("row").filter({ hasText: "Weekly worker" });
  await row.getByRole("checkbox").check();
  const cards = page.locator(".payroll-dashboard-card");
  await expect(cards.nth(2)).toContainText("771.12");
  await expect(cards.nth(3)).toContainText("289.18");
  await expect(cards.nth(13).locator(".payroll-dashboard-count")).toHaveText("1 วัน");
  await expect(cards.nth(13)).toContainText("1,060.30");
  await expect(cards.nth(15)).toContainText("1,060.30");
  await expect(page.locator(".payroll-report-table thead")).toContainText("OT x2.0");
});

test("standalone payroll saves monthly rates and allowances without Excel", async ({
  page,
  request,
}) => {
  const s: Shift = {
    emp_id: "PAY",
    device_emp_id: "PAY",
    emp_name: "Payroll person",
    agency: "Test",
    department: "Seafood",
    date: "2026-09-14",
    shift_code: "M",
    shift_start: "08:00",
    shift_end: "17:00",
    requested_ot_hrs: 0,
    ot_task_target: "",
  };
  await seedData({
    calculationVersion: 2,
    shifts: [s, { ...s, date: "2026-09-15", shift_code: "PH8" }],
    punches: [14, 15].flatMap((d) => [
      {
        device_emp_id: "PAY",
        punch_timestamp: `2026-09-${d} 08:00:00`,
        punch_type: "IN" as const,
      },
      {
        device_emp_id: "PAY",
        punch_timestamp: `2026-09-${d} ${d === 14 ? "19:00" : "18:30"}:00`,
        punch_type: "OUT" as const,
      },
    ]),
    reviews: {
      "PAY|2026-09-14": { approved: true, overBudget: false, note: "OK" },
    },
    audit: [],
  });
  await page.goto("/payroll");
  await page.getByLabel("เดือนจ่าย").fill("2026-09");
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  const row = page.getByRole("row").filter({ hasText: "Payroll person" });
  await expect(row).toContainText("144.58");
  await expect(row).toContainText("602.49");
  await expect(row).toContainText("32.96");
  const cards = page.locator(".payroll-dashboard-card");
  await expect(cards.nth(1).locator(".payroll-dashboard-count")).toContainText("—");
  await row.getByRole("checkbox").check();
  await expect(cards).toHaveCount(16);
  await expect(cards.nth(2)).toContainText("OT x2.0");
  await expect(cards.nth(5)).toContainText("20.60");
  await expect(cards.nth(9)).toContainText("12.36");
  const overtimeGroup = page.locator(".payroll-dashboard-grid").first();
  await expect(overtimeGroup.locator(".payroll-dashboard-card")).toHaveCount(5);
  await expect(overtimeGroup.locator(".payroll-dashboard-card").last()).toContainText("รวมค่าโอที");
  const before = await (
    await request.get("/api/payroll?month=2026-09&cycle=26-25")
  ).json();
  expect(before.settingsSaved).toBe(false);
  expect(before.rows[0].pendingAllowanceTotal).toBe(0);
  expect(before.rows[0].workedDays).toBe(1);
  expect(before.rows[0].dailyWageTotal).toBe(385.56);
  expect(before.rows[0].publicHolidayWage).toBe(385.56);
  expect(before.rows[0].salaryWithApprovedOT).toBe(948.66);
  expect(before.rows[0].projectedSalary).toBe(1551.15);
  await expect(page.getByLabel("ค่าจ้าง Agency / วัน (บาท)")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "แสดงสรุปค่าจ้างรายเดือน", exact: true })).toHaveCount(0);
  await expect(row).toContainText("948.66");
  await expect(cards.nth(12)).toContainText("385.56");
  await expect(cards.nth(15)).toContainText("948.66");
  await page.locator(".payroll-dashboard").screenshot({ path: "test-results/payroll-dashboard.png" });
  await row.getByRole("checkbox").uncheck();
  await page.getByRole("button", { name: "ส่งออก CSV", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "เลือกข้อมูลส่งออก CSV" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByLabel("ชั่วโมง OT ยืนยันแล้ว", { exact: true }),
  ).toBeChecked();
  await expect(
    dialog.getByLabel("ชั่วโมง OT รอยืนยัน", { exact: true }),
  ).not.toBeChecked();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("ot-pay-2026-09-26-25.csv");
  const content = await readFile((await download.path())!);
  expect(content.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))).toBe(
    true,
  );
  const book = XLSX.read(content, { type: "buffer", raw: true });
  const csv = XLSX.utils.sheet_to_json<string[]>(
    book.Sheets[book.SheetNames[0]],
    { header: 1 },
  );
  expect(csv).toHaveLength(3);
  expect(csv[0].some((h) => h.includes("รอยืนยัน"))).toBe(false);
  expect(csv[1].at(-1)).toBe("177.54");
  expect(csv[2].at(-1)).toBe("177.54");
  await page.getByRole("button", { name: "ส่งออก CSV", exact: true }).click();
  await dialog
    .getByRole("button", { name: "รอยืนยันเท่านั้น", exact: true })
    .click();
  await expect(
    dialog.getByLabel("ชั่วโมง OT รอยืนยัน", { exact: true }),
  ).toBeChecked();
  await expect(
    dialog.getByLabel("ชั่วโมง OT ยืนยันแล้ว", { exact: true }),
  ).not.toBeChecked();
  await dialog.getByRole("button", { name: "ล้างตัวเลือก" }).click();
  await expect(
    dialog.getByRole("button", { name: "ดาวน์โหลด CSV" }),
  ).toBeDisabled();
  await dialog
    .getByLabel("เงินรวมยืนยันแล้ว (OT + เบี้ยเลี้ยง + ค่ากะ)", { exact: true })
    .check();
  await expect(
    dialog.getByRole("button", { name: "ดาวน์โหลด CSV" }),
  ).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await dialog.evaluate(
      (el) => el.getBoundingClientRect().right <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/payroll-export-mobile.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator(".payroll-settings-toggle").click();
  await page.getByLabel("ค่าจ้าง Agency / วัน (บาท)").fill("400");
  await expect(page.locator(".payroll-rate-preview")).toContainText("75.00");
  await page.locator(".payroll-departments summary").click();
  await page
    .getByLabel("เบี้ยเลี้ยงแผนก Seafood", { exact: true })
    .selectOption("frozen");
  await page.getByRole("button", { name: "บันทึกอัตราเดือน 2026-09" }).click();
  await expect(page.locator(".payroll-settings")).toContainText(
    "ใช้อัตราที่บันทึกแล้ว",
  );
  await expect(row).toContainText("150.00");
  await expect(row).toContainText("625.00");
  await expect(row).toContainText("72.10");
  await row.getByRole("button", { name: "ดูรายวัน" }).click();
  const holiday = page
    .locator(".payroll-detail tbody tr")
    .filter({ hasText: "PH8" });
  await expect(holiday).toContainText("ไม่จ่ายเบี้ยเลี้ยงในวันหยุด");
  await page.screenshot({
    path: "test-results/payroll-standalone.png",
    fullPage: true,
  });
  await page.reload();
  await page.getByLabel("เดือนจ่าย").fill("2026-09");
  await expect(
    page.getByRole("button", { name: "แสดงสรุปค่าจ้างรายเดือน", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("ค่าจ้าง Agency / วัน (บาท)")).not.toBeVisible();
  await expect(page.getByLabel("ค่าจ้าง Agency / วัน (บาท)")).toHaveValue(
    "400",
  );
  const saved = await (
    await request.get("/api/payroll?month=2026-09&cycle=26-25")
  ).json();
  expect(saved.rows[0].approvedTotal).toBe(150);
  expect(saved.rows[0].dailyWageTotal).toBe(400);
  expect(saved.rows[0].salaryWithApprovedOT).toBe(1022.1);
  await page.getByRole("button", { name: "ส่งออก CSV", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "สรุปเงินเดือน", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByLabel("สรุปค่าจ้างรายเดือนและวันทำงานจริง", { exact: true }),
  ).toBeChecked();
  const salaryDownload = page.waitForEvent("download");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ดาวน์โหลด CSV" })
    .click();
  const salaryBook = XLSX.read(
    await readFile((await (await salaryDownload).path())!),
    { type: "buffer", raw: true },
  );
  const salaryCSV = XLSX.utils.sheet_to_json<string[]>(
    salaryBook.Sheets[salaryBook.SheetNames[0]],
    { header: 1 },
  );
  expect(
    salaryCSV[1][salaryCSV[0].indexOf("ค่าจ้างตามวันทำงานจริง (บาท)")],
  ).toBe("400.00");
  expect(
    salaryCSV[1][
      salaryCSV[0].indexOf("รวมค่าจ้าง + OT และเบี้ยเลี้ยงยืนยันแล้ว (บาท)")
    ],
  ).toBe("1022.10");
  expect(saved.rows[0].approvedAllowanceTotal).toBe(72.1);
  const workspace = await (await request.get("/api/workspace")).json();
  expect(workspace.data.payrollSettings["2026-09"].dailyWage).toBe(400);
  expect(workspace.data.audit[0].key).toBe("PAYROLL_SETTINGS|2026-09");
  const stale = await request.put("/api/payroll", {
    data: {
      month: "2026-09",
      revision: before.revision,
      settings: before.settings,
    },
  });
  expect(stale.status()).toBe(409);
  const invalid = await request.put("/api/payroll", {
    data: {
      month: "2026-09",
      revision: saved.revision,
      settings: { ...saved.settings, dailyWage: -1 },
    },
  });
  expect(invalid.status()).toBe(400);
  await page.getByLabel("เดือนจ่าย").fill("2026-10");
  await expect(page.getByLabel("ค่าจ้าง Agency / วัน (บาท)")).toHaveValue(
    "385.56",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Language / ภาษา").selectOption("en");
  await expect(cards.nth(0)).toContainText("Confirmed OT x1.0");
  await expect(cards.nth(12)).toContainText("Public holiday pay");
  await page.locator(".payroll-dashboard").screenshot({ path: "test-results/payroll-dashboard-mobile-en.png" });
});

test("payroll export uses every filtered employee across pages", async ({
  page,
}) => {
  await seedData({
    calculationVersion: 2,
    shifts: Array.from({ length: 27 }, (_, i) => ({
      emp_id: `EXPORT${i}`,
      device_emp_id: `EXPORT${i}`,
      emp_name: `Export person ${i}`,
      agency: i === 26 ? "Other" : "Test",
      department: "Dry",
      date: "2026-09-14",
      shift_code: "M",
      shift_start: "08:00",
      shift_end: "17:00",
      requested_ot_hrs: 0,
      ot_task_target: "",
    })),
    punches: [],
    reviews: {},
    audit: [],
  });
  await page.goto("/payroll");
  await page.getByLabel("เดือนจ่าย").fill("2026-09");
  await expect(page.locator(".report-table tbody tr")).toHaveCount(25);
  await page.getByLabel("Agency รายงานเงิน OT").selectOption("Test");
  await page.getByRole("button", { name: "ส่งออก CSV", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("26 คน ตามตัวกรองปัจจุบัน");
  await dialog.getByLabel("เพิ่มแถวรวมท้ายไฟล์").uncheck();
  const pending = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const file = await pending;
  const book = XLSX.read(await readFile((await file.path())!), {
    type: "buffer",
    raw: true,
  });
  const csv = XLSX.utils.sheet_to_json<string[]>(
    book.Sheets[book.SheetNames[0]],
    { header: 1 },
  );
  expect(csv).toHaveLength(27);
  expect(csv.slice(1).every((r) => r[4] === "Test")).toBe(true);
  if (await dialog.isVisible()) await dialog.getByLabel("ปิดหน้าต่างส่งออก").click();
  const first = page.locator('.payroll-selection input').nth(1);
  await first.check();
  await expect(page.locator(".payroll-dashboard-card").nth(15).locator(".payroll-dashboard-count")).toHaveText("1 คน");
  const selectedId = (await first.getAttribute("aria-label"))!.match(/\(([^)]+)\)$/)![1];
  await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
  const last = page.locator('.payroll-selection input').nth(1);
  await last.check();
  await expect(page.locator(".payroll-dashboard-card").nth(15).locator(".payroll-dashboard-count")).toHaveText("2 คน");
  const lastId = (await last.getAttribute("aria-label"))!.match(/\(([^)]+)\)$/)![1];
  await page.getByRole("button", { name: "ส่งออก CSV เฉพาะที่เลือก (2)", exact: true }).click();
  await expect(dialog).toContainText("2 คน เฉพาะพนักงานที่เลือก");
  await dialog.getByLabel("เพิ่มแถวรวมท้ายไฟล์").uncheck();
  const selectedDownload = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const selectedFile = await selectedDownload;
  const selectedBook = XLSX.read(await readFile((await selectedFile.path())!), { type: "buffer", raw: true });
  const selectedCsv = XLSX.utils.sheet_to_json<string[]>(selectedBook.Sheets[selectedBook.SheetNames[0]], { header: 1 });
  expect(selectedCsv).toHaveLength(3);
  expect(selectedCsv.slice(1).flat()).toContain(selectedId);
  expect(selectedCsv.slice(1).flat()).toContain(lastId);
  if (await dialog.isVisible()) await dialog.getByLabel("ปิดหน้าต่างส่งออก").click();
  await page.getByLabel("เลือกพนักงานทั้งหมดตามตัวกรอง", { exact: true }).check();
  await expect(page.getByRole("button", { name: "ส่งออก CSV เฉพาะที่เลือก (26)", exact: true })).toBeVisible();
  await expect(page.locator(".payroll-dashboard-card").nth(15).locator(".payroll-dashboard-count")).toHaveText("26 คน");
  await page.getByLabel("เลือกพนักงานทั้งหมดตามตัวกรอง", { exact: true }).uncheck();
  await expect(page.locator(".payroll-dashboard-card").nth(15).locator(".payroll-dashboard-count")).toHaveText("— คน");
  await page.getByLabel("Agency รายงานเงิน OT").selectOption("Other");
  await expect(page.getByRole("button", { name: "ส่งออก CSV", exact: true })).toBeVisible();
});
