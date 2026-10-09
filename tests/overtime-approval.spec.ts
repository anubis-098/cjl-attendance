import { test, expect, seedData } from "./sql-fixture";
test("OT without requests can be confirmed individually and in bulk", async ({
  page,
  request,
}) => {
  await seedData({
    calculationVersion: 2,
    shifts: ["A", "B", "C"].map((id) => ({
      emp_id: id,
      device_emp_id: id,
      emp_name: "Employee " + id,
      agency: "Demo",
      department: "Packing",
      date: "2026-09-14",
      shift_code: "S1",
      shift_start: "08:00",
      shift_end: "17:00",
      requested_ot_hrs: 0,
      requested_ot_known: false,
      ot_task_target: "Packing",
    })),
    punches: ["A", "B", "C"].flatMap((id) => [
      {
        device_emp_id: id,
        punch_timestamp: "2026-09-14 08:00:00",
        punch_type: "IN",
      },
      {
        device_emp_id: id,
        punch_timestamp: `2026-09-14 ${id === "C" ? "21" : "20"}:00:00`,
        punch_type: "OUT",
      },
    ]),
    reviews: {},
    audit: [],
  });
  await page.goto("/approvals");
  await page.getByLabel("เลือกวันที่").fill("2026-09-14");
  const rows = page.locator(".report-table tbody tr");
  await expect(rows).toHaveCount(3);
  await page
    .getByRole("combobox", { name: "สถานะ", exact: true })
    .selectOption("UNAPPROVED");
  await expect(rows).toHaveCount(3);
  await rows.first().getByRole("button").click();
  await expect(page.getByRole("dialog")).toContainText("ยังไม่ได้ยืนยันโอที");
  await expect(page.getByRole("dialog")).not.toContainText(
    "ยังไม่มีคำขอ OT รายวัน",
  );
  await expect(
    page.getByPlaceholder("ระบุผลการทำงานตามเป้าหมาย OT"),
  ).toHaveValue("");
  await page.getByLabel("เวลาออก", { exact: true }).fill("2026-09-14T20:30");
  await page.getByRole("switch").check();
  await page.getByRole("button", { name: "บันทึกผลตรวจสอบ" }).click();
  const reason = page.getByPlaceholder("จำเป็นเมื่อเปลี่ยนเวลาหรือหักพัก OT");
  await expect(reason).toBeFocused();
  await expect(reason).toBeEnabled();
  await expect(reason).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByRole("alert").filter({ hasText: "กรุณาระบุเหตุผล" }),
  ).toBeVisible();
  await reason.fill("Verified corrected scan time");
  await expect(reason).toHaveAttribute("aria-invalid", "false");
  await page.getByRole("switch").uncheck();
  const outTime = page.getByLabel("เวลาออก", { exact: true });
  await outTime.fill("2026-09-14T07:00");
  await page.getByRole("switch").check();
  await page.getByRole("button", { name: "บันทึกผลตรวจสอบ" }).click();
  await expect(outTime).toBeFocused();
  await expect(outTime).toBeEnabled();
  await expect(outTime).toHaveAttribute("aria-invalid", "true");
  await outTime.fill("2026-09-14T20:30");
  await page.getByRole("switch").check();
  await page.getByRole("button", { name: "บันทึกผลตรวจสอบ" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(rows).toHaveCount(2);
  await page.getByRole("checkbox", { name: "เลือกรายการในหน้านี้" }).check();
  await page.getByRole("button", { name: "ยืนยันที่เลือก (2)" }).click();
  await expect(rows).toHaveCount(0);
  await page.reload();
  await expect(rows).toHaveCount(0);
  const reviews = (await (await request.get("/api/workspace")).json()).data
    .reviews;
  expect(Object.values(reviews)).toHaveLength(3);
  expect(reviews["A|2026-09-14"].note).toBe("");
  for (const review of Object.values(reviews) as {
    approved: boolean;
    overBudget: boolean;
  }[]) {
    expect(review.approved).toBe(true);
    expect(review.overBudget).toBe(false);
  }
});
