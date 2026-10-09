import { test, expect, seedData, TEST_PASSWORD } from "./sql-fixture";
import { request as api } from "@playwright/test";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1kAAAAASUVORK5CYII=",
  "base64",
);
test("optional evidence persists and downloads without confirming attendance, and unsaved time edits survive upload", async ({
  page,
  request,
}) => {
  await seedData({
    shifts: [
      {
        emp_id: "PROOF",
        device_emp_id: "PROOF",
        emp_name: "Evidence employee",
        agency: "Test",
        department: "Dry",
        date: "2026-09-14",
        shift_code: "M",
        shift_start: "08:00",
        shift_end: "17:00",
        requested_ot_hrs: 0,
        ot_task_target: "",
      },
    ],
    punches: [
      {
        device_emp_id: "PROOF",
        punch_timestamp: "2026-09-14T08:00:00",
        punch_type: "IN",
      },
    ],
    reviews: {},
    audit: [],
  });
  await page.goto("/employees/PROOF/calendar?month=2026-09");
  await page
    .getByRole("button", { name: "รายละเอียด 2026-09-14 M", exact: true })
    .click();
  await page.getByLabel("เวลาออก", { exact: true }).fill("2026-09-14T19:00");
  await page
    .getByPlaceholder("จำเป็นเมื่อเปลี่ยนเวลาหรือหักพัก OT")
    .fill("Verified from evidence");
  await page.locator(".attendance-evidence > details > summary").click();
  await page
    .getByLabel("หลักฐานจาก", { exact: true })
    .selectOption("supervisor");
  await page
    .getByLabel("ชื่อผู้ให้หลักฐาน (ไม่บังคับ)", { exact: true })
    .fill("Supervisor One");
  await page
    .getByLabel("คำอธิบายหลักฐาน (ไม่บังคับ)", { exact: true })
    .fill("Confirmed shift attendance");
  await page
    .getByLabel("ไฟล์หลักฐาน", { exact: true })
    .setInputFiles({
      name: "attendance.png",
      mimeType: "image/png",
      buffer: png,
    });
  await page.getByRole("button", { name: "แนบหลักฐาน", exact: true }).click();
  await expect(page.locator(".evidence-list")).toContainText("Supervisor One");
  await expect(
    page.getByRole("button", { name: "บันทึกผลตรวจสอบ" }),
  ).toBeEnabled();
  let state = await (await request.get("/api/workspace")).json();
  expect(state.data.reviews).toEqual({});
  expect(state.data.punches).toHaveLength(1);
  expect(state.data.audit[0].reason).toBe("แนบหลักฐานการมาทำงาน");
  const { evidence } = await (
    await request.get(
      "/api/attendance-evidence?employeeId=PROOF&date=2026-09-14",
    )
  ).json();
  expect(evidence).toHaveLength(1);
  expect(evidence[0].source).toBe("supervisor");
  const download = await request.get(
    `/api/attendance-evidence/${evidence[0].id}`,
  );
  expect(await download.body()).toEqual(png);
  expect(download.headers()["content-type"]).toBe("image/png");
  expect(download.headers()["content-disposition"]).toContain("attachment");
  expect(download.headers()["cache-control"]).toContain("no-store");
  await expect(page.getByLabel("เวลาออก", { exact: true })).toHaveValue(
    "2026-09-14T19:00",
  );
  await page.getByRole("button", { name: "บันทึกผลตรวจสอบ" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.reload();
  await page
    .getByRole("button", { name: "รายละเอียด 2026-09-14 M", exact: true })
    .click();
  await expect(page.locator(".evidence-list")).toContainText("attendance.png");
  await expect(page.locator(".evidence-preview")).toBeVisible();
  state = await (await request.get("/api/workspace")).json();
  expect(state.data.reviews["PROOF|2026-09-14"].approved).toBe(false);
  expect(state.data.reviews["PROOF|2026-09-14"].outTime).toBe(
    "2026-09-14T19:00",
  );
  const invalid = await request.post("/api/attendance-evidence", {
    multipart: {
      employeeId: "PROOF",
      date: "2026-09-14",
      source: "employee",
      file: {
        name: "fake.png",
        mimeType: "image/png",
        buffer: Buffer.from("<html>not a picture</html>"),
      },
    },
  });
  expect(invalid.status()).toBe(400);
  expect(
    (await request.get("/api/attendance-evidence/not-an-id")).status(),
  ).toBe(404);
  expect(
    (
      await (
        await request.get(
          "/api/attendance-evidence?employeeId=OTHER&date=2026-09-14",
        )
      ).json()
    ).evidence,
  ).toEqual([]);
  const supervisor = await api.newContext({ baseURL: "http://localhost:3001" });
  try {
    expect((await supervisor.post("/api/auth/login", { data: { username: "testsupervisor", password: TEST_PASSWORD } })).ok()).toBeTruthy();
    expect((await supervisor.delete(`/api/attendance-evidence/${evidence[0].id}`)).status()).toBe(403);
    expect((await request.get(`/api/attendance-evidence/${evidence[0].id}`)).status()).toBe(200);
  } finally { await supervisor.dispose(); }
  await page.getByRole("button", { name: "ลบหลักฐาน", exact: true }).click();
  await page.getByRole("button", { name: "ยืนยันลบ", exact: true }).click();
  await expect(page.locator(".evidence-list li")).toHaveCount(0);
  expect((await request.get(`/api/attendance-evidence/${evidence[0].id}`)).status()).toBe(404);
  state = await (await request.get("/api/workspace")).json();
  expect(state.data.audit[0].reason).toBe("ลบหลักฐานการมาทำงาน");
  expect(state.data.reviews["PROOF|2026-09-14"].outTime).toBe("2026-09-14T19:00");
});
