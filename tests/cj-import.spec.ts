import { test, expect } from "./sql-fixture";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

test("CJ example files preview, import, preserve diagnostics and keep OT requests unknown", async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  await page.goto("/attendance");
  await page.getByRole("button", { name: "นำเข้าข้อมูล", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("รูปแบบไฟล์").selectOption("cj");
  await dialog
    .getByLabel("Master shift data")
    .setInputFiles(resolve("examples/Master Name list.xlsx"));
  await dialog
    .getByLabel("Raw biometric log")
    .setInputFiles(resolve("examples/All-attlogd2026-09-180959.txt"));
  await dialog.getByLabel("Agency attendance").setInputFiles(
    resolve(
      "examples",
      readdirSync("examples").find((n) => n.startsWith("1_CDC"))!,
    ),
  );
  await dialog.getByRole("button", { name: "ตรวจสอบไฟล์และการจับคู่" }).click();
  await expect(dialog.locator(".import-preview")).toContainText("5481 กะ", {
    timeout: 30000,
  });
  await expect(dialog.locator(".import-preview")).toContainText(
    "รวมรายการซ้ำ 42 รายการ",
  );
  await dialog
    .getByRole("button", { name: "ยืนยันนำเข้ารายการที่จับคู่ได้" })
    .click();
  await expect(dialog).toHaveCount(0, { timeout: 30000 });
  await expect(page.getByLabel("กะ").locator('option[value="M"]')).toHaveCount(
    1,
  );
  await page.getByLabel("สถานะ", { exact: true }).selectOption("UNAPPROVED");
  await expect(page.locator(".attendance-card").first()).toContainText(
    "ยังไม่ได้ยืนยันโอที",
  );
  await page.locator(".attendance-card").first().click();
  await expect(page.getByRole("dialog")).toContainText("โค้ดต้นทาง Attendance");
  await expect(page.getByRole("dialog")).toContainText("ยังไม่ได้ยืนยันโอที");
  await page.getByRole("button", { name: "ปิดรายละเอียด" }).click();
  await page.reload();
  await page.getByRole("button", { name: "นำเข้าข้อมูล", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("ผลนำเข้า CJ ล่าสุด");
  const saved = (await (await request.get("/api/workspace")).json()).data;
  // Workspace also infers Master shifts for scans outside the daily workbook.
  expect(saved.shifts.filter((shift: { source_day_code: string }) => shift.source_day_code !== "MASTER")).toHaveLength(5481);
  expect(saved.punches).toHaveLength(8307);
  expect(saved.importReport.issues.length).toBeGreaterThan(0);
});
