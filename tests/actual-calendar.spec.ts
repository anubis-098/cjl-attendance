import { test, expect, seedData } from "./sql-fixture";
import type { Shift } from "../lib/engine";
import { OT_RULES_VERSION } from "../lib/engine";

test("confirmed periods are green, missing endpoints stay blank, and hover never covers its period", async ({ page }) => {
  const s: Shift = { emp_id: "HOVER", device_emp_id: "HOVER", emp_name: "Hover employee", agency: "Test", department: "Dry", date: "2026-09-14", shift_code: "M", shift_start: "08:00", shift_end: "17:00", requested_ot_hrs: 0, ot_task_target: "" };
  await seedData({ calculationVersion: 2, shifts: [s, { ...s, date: "2026-09-15" }, { ...s, date: "2026-09-16" }], punches: [
    { device_emp_id: "HOVER", punch_timestamp: "2026-09-14 08:00:00", punch_type: "IN" },
    { device_emp_id: "HOVER", punch_timestamp: "2026-09-14 19:00:00", punch_type: "OUT" },
    { device_emp_id: "HOVER", punch_timestamp: "2026-09-15 08:02:00", punch_type: "IN" },
    { device_emp_id: "HOVER", punch_timestamp: "2026-09-16 17:00:00", punch_type: "OUT" },
  ], reviews: { "HOVER|2026-09-14": { approved: true, overBudget: false, note: "", otRulesVersion: OT_RULES_VERSION } }, audit: [] });
  await page.setViewportSize({ width: 1280, height: 480 });
  await page.goto("/attendance");
  await page.getByLabel("เลือกวันที่", { exact: true }).fill("2026-09-14");
  const approved = page.locator('[data-shift-key="HOVER|2026-09-14"] .attendance-card');
  await expect(approved).toHaveClass(/status-approved/);
  await expect(approved).toHaveCSS("background-color", "rgb(237, 247, 241)");
  const missing = page.locator('[data-shift-key="HOVER|2026-09-15"] .attendance-card');
  await expect(missing.locator(".actual-card-time")).toHaveText("08:02–--:--");
  await expect(page.locator('[data-shift-key="HOVER|2026-09-16"] .actual-card-time')).toHaveText("--:--–17:00");
  for (const url of [null, "/employees/HOVER/calendar?month=2026-09"]) {
    if (url) {
      await page.goto(url);
      await expect(page.locator(".month-shift.status-approved")).toHaveCSS("background-color", "rgb(237, 247, 241)");
    }
    const card = url ? page.locator(".month-shift.status-missing .month-shift-details").first() : missing;
    await card.evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2));
    await card.hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip.locator(".actual-notice > p").first()).toContainText("--:--");
    await expect(tooltip.locator(".actual-notice > p").first()).not.toContainText("16:02");
    const anchorBox = (await card.boundingBox())!, popupBox = (await tooltip.boundingBox())!;
    expect(popupBox.y + popupBox.height <= anchorBox.y || popupBox.y >= anchorBox.y + anchorBox.height).toBe(true);
    expect(popupBox.y).toBeGreaterThanOrEqual(0);
    expect(popupBox.y + popupBox.height).toBeLessThanOrEqual(480);
    await tooltip.hover();
    await tooltip.evaluate(el => { el.scrollTop = 40; });
    await expect(tooltip).toBeVisible();
    await page.keyboard.press("Escape");
  }
});

test("calendars use actual overnight scans and red eight-hour estimates while keeping Master and payroll unchanged", async ({ page, request }) => {
  const s: Shift = { emp_id: "ACTUAL", device_emp_id: "ACTUAL", emp_name: "Actual employee", agency: "Test", department: "Dry", date: "2026-09-14", shift_code: "M", shift_start: "08:00", shift_end: "17:00", requested_ot_hrs: 0, ot_task_target: "" };
  await seedData({ calculationVersion: 2, shifts: [s, { ...s, date: "2026-09-16" }], punches: [
    { device_emp_id: "ACTUAL", punch_timestamp: "2026-09-14 20:00:00", punch_type: "UNKNOWN" },
    { device_emp_id: "ACTUAL", punch_timestamp: "2026-09-15 05:00:00", punch_type: "UNKNOWN" },
    { device_emp_id: "ACTUAL", punch_timestamp: "2026-09-16 08:00:00", punch_type: "IN" },
  ], reviews: {}, audit: [] });
  const before = await (await request.get("/api/payroll?month=2026-09&cycle=calendar")).json();
  await page.goto("/attendance");
  await page.getByLabel("เลือกวันที่", { exact: true }).fill("2026-09-14");
  const overnight = page.locator('[data-shift-key="ACTUAL|2026-09-14"]');
  await expect(overnight.locator(".actual-card-time")).toHaveText("20:00–05:00");
  await expect(overnight.locator(".actual-master-time")).toContainText("08:00–17:00");
  const missing = page.locator('[data-shift-key="ACTUAL|2026-09-16"] .attendance-card');
  await expect(missing).toHaveClass(/status-missing/);
  await expect(missing.locator(".actual-card-time")).toHaveText("08:00–--:--");
  await missing.click();
  const dialog = page.getByRole("dialog", { name: "รายละเอียดเวลาทำงาน" });
  await expect(dialog.locator(".actual-notice")).toContainText("คาดเวลาออกอีก 8 ชม.");
  await dialog.getByRole("button", { name: "นำเฉพาะเวลาสแกนจริงมาให้ตรวจสอบ" }).click();
  await expect(dialog.locator('input[type="datetime-local"]').nth(0)).toHaveValue("2026-09-16T08:00");
  await expect(dialog.locator('input[type="datetime-local"]').nth(1)).toHaveValue("");
  await dialog.getByLabel("ปิดรายละเอียด").click();
  await page.goto("/employees/ACTUAL/calendar?month=2026-09");
  await expect(page.locator(".month-shift.status-missing .actual-card-time")).toHaveText("08:00–--:--");
  await expect(page.locator(".month-shift.status-actual .actual-card-time")).toHaveText("20:00–05:00");
  await page.screenshot({ path: "test-results/actual-calendar.png", fullPage: true });
  await page.getByLabel("Language / ภาษา").selectOption("en");
  await expect(page.locator(".actual-calendar-legend")).toContainText("Actual calendar");
  const after = await (await request.get("/api/payroll?month=2026-09&cycle=calendar")).json();
  expect(after.rows).toEqual(before.rows);
});

test("rounded entry drives blue/yellow/red bars and payroll while the calendar keeps recorded times", async ({ page, request }) => {
  const shifts: Shift[] = ["14", "15", "16", "17"].map((day) => ({
    emp_id: "ROUND", device_emp_id: "ROUND", emp_name: "Rounded employee", agency: "Test", department: "Dry",
    date: `2026-09-${day}`, shift_code: "M", shift_start: "08:00", shift_end: "17:00", requested_ot_hrs: 0, ot_task_target: "",
  }));
  const times = [["07:45", "17:00"], ["08:20", "18:00"], ["08:21", "18:00"], ["08:00"]];
  await seedData({ calculationVersion: 2, shifts, punches: shifts.flatMap((s, i) => times[i].map((time, j) => ({
    device_emp_id: "ROUND", punch_timestamp: `${s.date} ${time}:00`, punch_type: j === 0 ? "IN" as const : "OUT" as const,
  }))), reviews: {}, audit: [] });
  await page.goto("/attendance");
  await page.getByLabel("เลือกวันที่", { exact: true }).fill("2026-09-14");
  for (const [day, status, value] of [["14", "actual", "07:45–17:00"], ["15", "actual-ot", "08:20–18:00"], ["16", "actual", "08:21–18:00"], ["17", "missing", "08:00–--:--"]]) {
    const card = page.locator(`[data-shift-key="ROUND|2026-09-${day}"] .attendance-card`);
    await expect(card).toHaveClass(new RegExp(`status-${status}(?:\\s|$)`));
    await expect(card.locator(".actual-card-time")).toHaveText(value);
  }
  await page.locator('[data-shift-key="ROUND|2026-09-16"] .attendance-card').click();
  await expect(page.locator(".actual-calculation-times")).toContainText("09:00");
  await expect(page.locator(".actual-calculation-times")).toContainText("2026-09-16 18:00");
  await page.getByLabel("ปิดรายละเอียด").click();
  await page.goto("/employees/ROUND/calendar?month=2026-09");
  await expect(page.locator(".month-shift.status-actual")).toHaveCount(2);
  await expect(page.locator(".month-shift.status-actual-ot")).toHaveCount(1);
  await expect(page.locator(".month-shift.status-missing")).toHaveCount(1);
  await page.screenshot({ path: "test-results/rounded-actual-calendar.png", fullPage: true });
  const payroll = await (await request.get("/api/payroll?month=2026-09&cycle=calendar")).json();
  expect(payroll.rows[0].pendingHours["1.5"]).toBe(1);
  await page.getByRole("button", { name: "เลือกยืนยันเป็นกลุ่ม" }).click();
  await page.getByRole("checkbox", { name: "เลือกกะ 2026-09-15 M", exact: true }).check();
  await page.getByRole("button", { name: "ยืนยันที่เลือก (1)" }).click();
  await expect(page.locator(".month-shift.status-approved .confirmed-check")).toHaveCount(1);
  const confirmed = await (await request.get("/api/payroll?month=2026-09&cycle=calendar")).json();
  expect(confirmed.rows[0].approvedHours["1.5"]).toBe(1);
  expect(confirmed.rows[0].pendingHours["1.5"]).toBe(0);
});
