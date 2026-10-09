import { test, expect, seedData } from "./sql-fixture";
import { readFileSync } from "node:fs";

test("calendar changes daily shifts, preserves holidays and master, resets and survives imports", async ({
  page,
  request,
}) => {
  const id = "BE000609";
  await seedData({
    calculationVersion: 2,
    shifts: ["2026-09-03", "2026-09-04"].map((date) => ({
      emp_id: id,
      device_emp_id: id,
      emp_name: "Shift change person",
      agency: "Test",
      department: "Frozen",
      date,
      shift_code: date.endsWith("04") ? "H8" : "A",
      base_shift_code: "A",
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
      device_emp_id: id,
      punch_timestamp,
      punch_type: "UNKNOWN" as const,
    })),
    reviews: {
      [id + "|2026-09-03"]: {
        inTime: "2026-09-03T20:00",
        outTime: "2026-09-04T05:00",
        approved: true,
        overBudget: false,
        note: "Old manual correction",
        otRulesVersion: 3,
      },
    },
    audit: [],
  });
  await page.goto(`/employees/${id}/calendar?month=2026-09`);
  const before = await (await request.get("/api/workspace")).json();
  await page.getByRole("button", { name: "เปลี่ยนกะ", exact: true }).click();
  await page.getByLabel("กะใหม่", { exact: true }).selectOption("A");
  await page.getByLabel("เวลาเริ่มกะใหม่").fill("17:00");
  await page.getByLabel("เวลาสิ้นสุดกะใหม่").fill("02:00");
  await page
    .getByLabel("เหตุผลเปลี่ยนกะ")
    .fill("Supervisor confirmed actual shift");
  for (const date of ["2026-09-03", "2026-09-04"])
    await page
      .getByRole("button", { name: `เลือกวันเปลี่ยนกะ ${date}`, exact: true })
      .click();
  await page.getByRole("button", { name: "ยืนยันเปลี่ยนกะ (2)" }).click();
  await expect(
    page.getByRole("button", { name: "เปลี่ยนกะ", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "รายละเอียด 2026-09-03 A", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("17:00 – 02:00");
  await expect(page.getByRole("dialog")).toContainText("OT สุทธิ 3 ชม.");
  await expect(page.getByLabel("เวลาเข้า", { exact: true })).toHaveValue(
    "2026-09-03T16:41",
  );
  await expect(page.getByRole("switch")).not.toBeChecked();
  await page.keyboard.press("Escape");
  let saved = await (await request.get("/api/workspace")).json();
  expect(saved.data.shiftOverrides[id + "|2026-09-03"].start).toBe("17:00");
  expect(saved.data.reviews[id + "|2026-09-03"].inTime).toBeUndefined();
  expect(saved.employees[0].shift_data.shift_start).toBe("20:00");
  expect(
    saved.data.shifts.find((s: { date: string }) => s.date === "2026-09-04")
      .shift_code,
  ).toBe("H8");
  expect(saved.data.audit[0].before).toContain("Old manual correction");
  const stale = await request.post("/api/shifts", {
    data: {
      employeeId: id,
      dates: ["2026-09-03"],
      revision: before.revision,
      change: null,
      reason: "Reset",
    },
  });
  expect(stale.status()).toBe(409);
  const overlap = await request.post("/api/shifts", {
    data: {
      employeeId: id,
      dates: ["2026-09-03"],
      revision: saved.revision,
      change: { code: "M", start: "00:00", end: "09:00" },
      reason: "Overlap",
    },
  });
  expect(overlap.status()).toBe(400);
  await page.getByRole("button", { name: "เปลี่ยนกะ", exact: true }).click();
  await page.getByLabel("กะใหม่", { exact: true }).selectOption("RESET");
  await page.getByLabel("เหตุผลเปลี่ยนกะ").fill("Restore original");
  await page
    .getByRole("button", { name: "เลือกวันเปลี่ยนกะ 2026-09-03", exact: true })
    .click();
  await page.getByRole("button", { name: "ยืนยันเปลี่ยนกะ (1)" }).click();
  await expect(
    page.getByRole("button", { name: "เปลี่ยนกะ", exact: true }),
  ).toBeVisible();
  saved = await (await request.get("/api/workspace")).json();
  expect(saved.data.shiftOverrides[id + "|2026-09-03"]).toBeUndefined();
  expect(
    saved.data.shifts.find((s: { date: string }) => s.date === "2026-09-03")
      .shift_start,
  ).toBe("20:00");
  const imported = await request.post("/api/import", {
    multipart: {
      mode: "employees",
      master: {
        name: "Master.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: readFileSync("examples/Master Name list.xlsx"),
      },
    },
  });
  expect(imported.ok()).toBe(true);
  const reloaded = await imported.json();
  expect(
    reloaded.data.shifts.find(
      (s: { emp_id: string; date: string }) =>
        s.emp_id === id && s.date === "2026-09-04",
    ).shift_start,
  ).toBe("17:00");
  expect(reloaded.data.punches).toHaveLength(4);
});
