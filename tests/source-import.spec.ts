import { test, expect } from "./sql-fixture";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
test("independent employee and fingerprint imports use SQL and retain full headers", async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  await page.goto("/employees");
  await page
    .getByLabel("นำเข้าไฟล์พนักงาน")
    .setInputFiles(resolve("examples/Master Name list.xlsx"));
  await page.getByRole("button", { name: "นำเข้าไฟล์", exact: true }).click();
  await expect(page.locator(".panel > .report-scroll > .report-table tbody tr")).toHaveCount(25, {
    timeout: 30000,
  });
  const before = await (await request.get("/api/workspace")).json();
  expect(before.employeeCount).toBe(350);
  expect(before.data.punches).toHaveLength(0);
  await page.getByRole("link", { name: "เวลาสแกนนิ้ว", exact: true }).click();
  await page
    .getByLabel("นำเข้าไฟล์สแกนนิ้ว")
    .setInputFiles(resolve("examples/All-attlogd2026-09-180959.txt"));
  await page.getByRole("button", { name: "นำเข้าไฟล์", exact: true }).click();
  await expect(page.locator(".panel > .report-scroll > .report-table tbody tr")).toHaveCount(25, {
    timeout: 30000,
  });
  const after = await (await request.get("/api/workspace")).json();
  expect(after.employeeCount).toBe(350);
  expect(after.data.punches).toHaveLength(8307);
  expect(after.data.shifts.length).toBeGreaterThan(1000);
  expect(
    after.data.shifts.every(
      (s: { requested_ot_known: boolean }) => s.requested_ot_known === false,
    ),
  ).toBe(true);
  const invalid = await request.post("/api/import", {
    multipart: {
      mode: "fingerprints",
      raw: {
        name: "invalid.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("001\t20260230\t1200"),
      },
    },
  });
  expect(invalid.status()).toBe(400);
  const unchanged = await (await request.get("/api/workspace")).json();
  expect(unchanged.revision).toBe(after.revision);
  expect(unchanged.data.punches).toHaveLength(8307);
  const again = await request.post("/api/import", {
    multipart: {
      mode: "fingerprints",
      raw: {
        name: "logs.txt",
        mimeType: "text/plain",
        buffer: readFileSync("examples/All-attlogd2026-09-180959.txt"),
      },
    },
  });
  expect(again.ok()).toBe(true);
  expect((await again.json()).data.punches).toHaveLength(8307);
});
