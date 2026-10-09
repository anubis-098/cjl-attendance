import { test, expect, seedData } from "./sql-fixture";
test("language switches across pages, persists, and preserves user data and unsaved fields", async ({ page }) => {
  await seedData({ calculationVersion: 2, shifts: [{ emp_id: "LANG", device_emp_id: "LANG", emp_name: "พนักงาน", agency: "Agency", department: "ระบบ", date: "2026-09-03", shift_code: "M", shift_start: "08:00", shift_end: "17:00", requested_ot_hrs: 0, ot_task_target: "" }], punches: [], reviews: {}, audit: [] });
  await page.addInitScript(() => sessionStorage.setItem("cj-workspace-filters", JSON.stringify({ date: "2026-09-03", view: "week" })));
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/attendance");
  await page.getByRole("combobox", { name: "Language / ภาษา" }).selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Attendance overview", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "พนักงาน", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Department", exact: true }).selectOption("ระบบ");
  await expect(page.getByRole("link", { name: "พนักงาน", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Attendance overview", exact: true })).toBeVisible();
  for (const [url, title] of [["/fingerprints", "Fingerprint logs"], ["/employees", "Employees"], ["/payroll", "Monthly OT pay"], ["/accounts", "Accounts & Permissions"], ["/approvals", "Pending approvals"], ["/audit-log", "Audit log"]]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  await page.goto("/employees/LANG/calendar?month=2026-09");
  await expect(page.getByRole("heading", { name: "พนักงาน", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "September 2026" })).toBeVisible();
  await page.goto("/accounts");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByLabel("Display name", { exact: true }).fill("ข้อมูลที่กำลังกรอก");
  await page.getByRole("combobox", { name: "Language / ภาษา" }).selectOption("th");
  await expect(page.getByLabel("ชื่อแสดง", { exact: true })).toHaveValue("ข้อมูลที่กำลังกรอก");
  await expect(page.getByRole("heading", { name: "จัดการบัญชีและสิทธิ์" })).toBeVisible();
  expect(errors).toEqual([]);
});
test("login language translates validation and survives a new page load", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByRole("combobox", { name: "Language / ภาษา" }).selectOption("en");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("#login-error")).toHaveText("Enter your username and password.");
  await page.getByLabel("Username", { exact: true }).fill("nonexistent-user");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("#login-error")).toHaveText("Incorrect username or password.");
  await page.reload();
  await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Language / ภาษา" }).selectOption("th");
  await expect(page.getByLabel("ชื่อผู้ใช้", { exact: true })).toBeVisible();
});
