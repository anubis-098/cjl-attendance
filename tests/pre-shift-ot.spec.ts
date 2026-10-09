import { test, expect, seedData } from "./sql-fixture";
import { OT_RULES_VERSION } from "../lib/engine";

test("night early OT pairs by shift date and changed approvals can be reconfirmed", async ({
  page,
  request,
}) => {
  await seedData({
    calculationVersion: 2,
    shifts: ["2026-09-03", "2026-09-04"].map((date) => ({
      emp_id: "BE000609",
      device_emp_id: "BE000609",
      emp_name: "Early OT person",
      agency: "Test",
      department: "Frozen",
      date,
      shift_code: "A",
      shift_start: "20:00",
      shift_end: "05:00",
      requested_ot_hrs: 0,
      ot_task_target: "",
    })),
    punches: [
      "2026-09-03 16:41:00",
      "2026-09-04 05:00:00",
      "2026-09-04 16:47:00",
      "2026-09-05 05:00:00",
    ].map((punch_timestamp) => ({
      device_emp_id: "BE000609",
      punch_timestamp,
      punch_type: "UNKNOWN" as const,
    })),
    reviews: {
      "BE000609|2026-09-03": {
        inTime: "2026-09-03T16:41",
        outTime: "2026-09-04T05:00",
        approved: true,
        overBudget: false,
        note: "Old approval",
      },
    },
    audit: [],
  });
  await page.goto("/approvals");
  await page.getByLabel("เลือกวันที่").fill("2026-09-03");
  const rows = page.locator(".report-table tbody tr");
  await expect(rows).toHaveCount(2);
  // Save another day while the first day's old approval awaits reconfirmation.
  await rows.nth(1).getByRole("button").click();
  await expect(page.getByLabel("เวลาเข้า", { exact: true })).toHaveValue(
    "2026-09-04T16:47",
  );
  await expect(page.getByLabel("เวลาออก", { exact: true })).toHaveValue(
    "2026-09-05T05:00",
  );
  await page
    .getByPlaceholder("ระบุผลการทำงานตามเป้าหมาย OT")
    .fill("Checked early OT");
  await page.getByRole("switch").check();
  await page.getByRole("button", { name: "บันทึกผลตรวจสอบ" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(rows).toHaveCount(1);
  await rows.first().getByRole("button").click();
  await expect(page.getByRole("dialog")).toContainText(
    "ผลจับคู่หรือยอด OT เปลี่ยนจากกฎเดิม",
  );
  await expect(page.getByRole("dialog")).toContainText("เวลาเริ่มคำนวณ: 2026-09-03 17:00");
  await expect(page.getByRole("dialog")).toContainText("OT สุทธิ 3 ชม.");
  await expect(page.locator(".raw-logs > div")).toHaveCount(2);
  await expect(page.getByLabel("หักพัก OT 30 นาที")).toBeDisabled();
  await expect(page.getByLabel("เวลาเข้า", { exact: true })).toHaveValue(
    "2026-09-03T16:41",
  );
  await expect(page.getByLabel("เวลาออก", { exact: true })).toHaveValue(
    "2026-09-04T05:00",
  );
  await page.getByRole("switch").check();
  await page.getByRole("button", { name: "บันทึกผลตรวจสอบ" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(rows).toHaveCount(0);
  const report = await (
    await request.get("/api/payroll?month=2026-09&cycle=calendar")
  ).json();
  expect(report.rows[0].approvedHours["1.5"]).toBe(6);
  expect(report.rows[0].approvedTotal).toBe(433.74);
  const workspace = await (await request.get("/api/workspace")).json();
  expect(workspace.data.reviews["BE000609|2026-09-03"].otRulesVersion).toBe(OT_RULES_VERSION);
  expect(workspace.data.punches).toHaveLength(4);
});
