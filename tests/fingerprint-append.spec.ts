import { test, expect, seedData } from "./sql-fixture";
import { readFileSync } from "node:fs";
import type { Shift } from "../lib/engine";

test("TXT appends, skips duplicates, preserves old scans and reopens only affected approvals", async ({
  request,
}) => {
  const s: Shift = {
    emp_id: "SCAN",
    device_emp_id: "SCAN",
    emp_name: "Scan person",
    agency: "Test",
    department: "Dry",
    date: "2026-09-14",
    shift_code: "M",
    shift_start: "08:00",
    shift_end: "17:00",
    requested_ot_hrs: 0,
    ot_task_target: "",
  };
  await seedData({
    shifts: [s, { ...s, date: "2026-09-15" }],
    punches: [14, 15].flatMap((d) =>
      ["08:00", "19:00"].map((t) => ({
        device_emp_id: "SCAN",
        punch_timestamp: `2026-09-${d}T${t}:00`,
        punch_type: "UNKNOWN" as const,
      })),
    ),
    reviews: Object.fromEntries(
      [14, 15].map((d) => [
        `SCAN|2026-09-${d}`,
        {
          approved: true,
          otRulesVersion: 3,
          overBudget: false,
          note: "Keep original",
        },
      ]),
    ),
    audit: [],
  });
  const upload = (body: string) =>
    request.post("/api/import", {
      multipart: {
        mode: "fingerprints",
        raw: {
          name: "increment.txt",
          mimeType: "text/plain",
          buffer: Buffer.from(body),
        },
      },
    });
  const raw =
    "SCAN\t20260914\t1900\nSCAN\t20260914\t1930\nSCAN\t20260914\t1930\nSCAN\t20260916\t0800";
  let response = await upload(raw);
  expect(response.ok()).toBe(true);
  let result = await response.json();
  expect(result.fingerprintImport).toMatchObject({
    added: 2,
    duplicates: 2,
    total: 6,
  });
  expect(result.data.punches).toHaveLength(6);
  expect(result.data.reviews["SCAN|2026-09-14"].approved).toBe(false);
  expect(result.data.reviews["SCAN|2026-09-15"].approved).toBe(true);
  response = await upload(raw);
  result = await response.json();
  expect(result.fingerprintImport).toMatchObject({
    added: 0,
    duplicates: 4,
    total: 6,
  });
  expect(result.data.reviews["SCAN|2026-09-15"].approved).toBe(true);
  expect((await upload("SCAN\t20260931\t0800")).status()).toBe(400);
  const concurrent = await Promise.all([
    upload("SCAN\t20260916\t1900"),
    upload("SCAN\t20260916\t1900"),
  ]);
  const counts = await Promise.all(
    concurrent.map(async (r) => {
      expect(r.ok()).toBe(true);
      return (await r.json()).fingerprintImport.added;
    }),
  );
  expect(counts.sort()).toEqual([0, 1]);
  const source = await (
    await request.get("/api/source-data?type=fingerprints")
  ).json();
  expect(source.total).toBe(7);
  expect(
    (await (await request.get("/api/workspace")).json()).data.punches,
  ).toHaveLength(7);
});

test("real September files accumulate to 9662 scans and display import summary", async ({
  page,
  request,
}) => {
  const old = await request.post("/api/import", {
    multipart: {
      mode: "fingerprints",
      raw: {
        name: "All-attlogd2026-09-180959.txt",
        mimeType: "text/plain",
        buffer: readFileSync("examples/All-attlogd2026-09-180959.txt"),
      },
    },
  });
  expect(old.ok()).toBe(true);
  expect((await old.json()).fingerprintImport).toMatchObject({
    added: 8307,
    duplicates: 42,
    total: 8307,
  });
  await page.goto("/fingerprints");
  await page
    .getByLabel("นำเข้าไฟล์สแกนนิ้ว")
    .setInputFiles("examples/All-attlogd2026-09-251625.txt");
  await page.getByRole("button", { name: "นำเข้าไฟล์", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "ผลนำเข้า" }),
  ).toContainText("เพิ่มใหม่ 1,355 รายการ");
  await expect(
    page.getByRole("status").filter({ hasText: "ผลนำเข้า" }),
  ).toContainText("รวมสะสม 9,662 รายการ");
  const result = await (await request.get("/api/workspace")).json();
  expect(result.data.punches).toHaveLength(9662);
  expect(result.data.punches[0].punch_timestamp).toBe("2026-08-26T03:01:00");
  await page.getByRole("button", { name: "นำเข้าไฟล์", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "ผลนำเข้า" }),
  ).toContainText("เพิ่มใหม่ 0 รายการ");
  await expect(
    page.getByRole("status").filter({ hasText: "ผลนำเข้า" }),
  ).toContainText("ข้ามรายการซ้ำ 1,356 รายการ");
  expect(
    (await (await request.get("/api/source-data?type=fingerprints")).json())
      .total,
  ).toBe(9662);
});
