import { test, expect, seedData } from "./sql-fixture";

test("existing SQL departments and saved filters use canonical names without reimport", async ({
  page,
  request,
}) => {
  const departments = [
    "Frozen",
    "FROZEN",
    "Frozen CDC",
    "Inventory Frozen",
    "Dry Food",
    "Saefood",
  ];
  await seedData({
    calculationVersion: 2,
    reviews: {},
    audit: [],
    shifts: departments.map((department, i) => ({
      emp_id: String(i),
      device_emp_id: String(i),
      emp_name: `Person ${i}`,
      department,
      agency: "Test",
      date: "2026-09-14",
      shift_code: "M",
      shift_start: "08:00",
      shift_end: "17:00",
      requested_ot_hrs: 0,
      ot_task_target: "",
    })),
    punches: departments.flatMap((_, i) => [
      {
        device_emp_id: String(i),
        punch_timestamp: "2026-09-14 08:00:00",
        punch_type: "IN" as const,
      },
      {
        device_emp_id: String(i),
        punch_timestamp: "2026-09-14 19:00:00",
        punch_type: "OUT" as const,
      },
    ]),
  });
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "cj-workspace-filters",
      JSON.stringify({
        date: "2026-09-14",
        view: "week",
        department: "FROZEN",
      }),
    ),
  );
  await page.goto("/attendance");
  await expect(page.getByLabel("แผนก", { exact: true })).toHaveValue("Frozen");
  await expect(page.locator(".calendar tbody tr")).toHaveCount(3);
  const options = await page
    .getByLabel("แผนก", { exact: true })
    .locator("option")
    .allTextContents();
  expect(options).toContain("Inventory Frozen");
  expect(options).toContain("Dry");
  expect(options).toContain("Seafood");
  expect(options).not.toContain("FROZEN");
  expect(options).not.toContain("Frozen CDC");
  const workspace = await (await request.get("/api/workspace")).json();
  expect(workspace.data.shifts).toHaveLength(6);
  expect(
    workspace.data.shifts.filter(
      (s: { department: string }) => s.department === "Frozen",
    ),
  ).toHaveLength(3);
  const source = await (
    await request.get("/api/source-data?type=employees")
  ).json();
  expect(
    source.rows.find((r: { employee_id: string }) => r.employee_id === "2")
      .source_data["แผนก"],
  ).toBe("Frozen CDC");
  await page.goto("/employees");
  await expect(
    page.locator('span[title="ข้อมูลต้นฉบับ: Frozen CDC"]'),
  ).toHaveText("Frozen");
  await page.getByLabel("แผนก", { exact: true }).selectOption({ label: "Frozen" });
  await expect(page.locator(".report-table tbody tr")).toHaveCount(3);
  await page.getByLabel("ค้นหาข้อมูล").fill("Person 2");
  await expect(page.locator(".report-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".report-table tbody")).toContainText("Person 2");
  await page.getByLabel("ผลตรวจสอบ", { exact: true }).selectOption("issue");
  await expect(page.getByText("ไม่พบข้อมูลที่ตรงกับตัวกรอง")).toBeVisible();
  await page.getByRole("button", { name: "ล้างตัวกรอง" }).click();
  await expect(page.locator(".report-table tbody tr")).toHaveCount(6);
});
