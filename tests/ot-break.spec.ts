import { test, expect, seedData } from "./sql-fixture";

test("worker filters and optional OT break persist through SQL", async ({ page, request }) => {
  await seedData({
    calculationVersion: 2, reviews: {}, audit: [],
    shifts: ["Thai", "AEC", undefined].map((worker_type, i) => ({
      emp_id: String(i), device_emp_id: String(i), emp_name: `Employee ${i}`,
      agency: "Test", department: "Packing", worker_type,
      date: "2026-09-14", shift_code: "M", shift_start: "08:00", shift_end: "17:00",
      requested_ot_hrs: 0, ot_task_target: "",
    })),
    punches: [0, 1, 2].flatMap((i) => [
      { device_emp_id: String(i), punch_timestamp: "2026-09-14 08:00:00", punch_type: "IN" as const },
      { device_emp_id: String(i), punch_timestamp: `2026-09-14 ${i === 0 ? "20:30" : "20:00"}:00`, punch_type: "OUT" as const },
    ]),
  });
  await page.goto("/approvals");
  await page.getByLabel("เลือกวันที่").fill("2026-09-14");
  const rows = page.locator(".report-table tbody tr");
  await expect(rows).toHaveCount(3);
  for (const [type, id] of [["Thai", "0"], ["AEC", "1"], ["unknown", "2"]]) {
    await page.getByLabel("ประเภทพนักงาน").selectOption(type);
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText(`Employee ${id}`);
  }
  await page.getByLabel("ประเภทพนักงาน").selectOption("AEC");
  await rows.first().getByRole("button").click();
  await expect(page.getByLabel("หักพัก OT 30 นาที")).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.getByLabel("ประเภทพนักงาน").selectOption("Thai");
  await rows.first().getByRole("button").click();
  await page.getByLabel("หักพัก OT 30 นาที").check();
  await page.getByPlaceholder("จำเป็นเมื่อเปลี่ยนเวลาหรือหักพัก OT").fill("Recorded overtime break");
  await page.getByRole("button", { name: "บันทึกผลตรวจสอบ" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("ประเภทพนักงาน")).toHaveValue("Thai");
  await rows.first().getByRole("button").click();
  await expect(page.getByLabel("หักพัก OT 30 นาที")).toBeChecked();
  const data = (await (await request.get("/api/workspace")).json()).data;
  expect(data.reviews["0|2026-09-14"].deductOTBreak).toBe(true);
  expect(data.audit[0].after).toContain('"deductOTBreak":true');
});
