import { test, expect, seedData } from "./sql-fixture";
import type { Shift } from "../lib/engine";
import { buildPayrollExport } from "../lib/payroll-export";
import * as XLSX from "xlsx";
import { MASTER_HEADERS } from "../lib/source-headers";

test("company holidays survive master imports and apply to new employees without orphan reviews on removal", async ({
  request,
}) => {
  let state = await (await request.get("/api/workspace")).json();
  let response = await request.put("/api/company-holidays", {
    data: { month: "2026-09", dates: ["2026-09-25"], revision: state.revision },
  });
  expect(response.ok()).toBe(true);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([
      MASTER_HEADERS,
      [
        1,
        "NEW",
        "New employee",
        "Dry",
        "",
        "M",
        "08:00-17:00",
        "08:00",
        "17:00",
      ],
    ]),
    "Master Name",
  );
  response = await request.post("/api/import", {
    multipart: {
      mode: "employees",
      employeeMode: "merge",
      master: {
        name: "new-master.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: XLSX.write(book, { type: "buffer", bookType: "xlsx" }),
      },
    },
  });
  expect(response.ok()).toBe(true);
  state = await (await request.get("/api/workspace")).json();
  expect(state.data.companyHolidays).toEqual(["2026-09-25"]);
  expect(state.data.shifts[0].shift_code).toBe("PH");
  response = await request.put("/api/workspace", {
    data: {
      revision: state.revision,
      reviews: {
        "NEW|2026-09-25": {
          approved: true,
          otRulesVersion: 3,
          overBudget: false,
          note: "Manual holiday work",
          inTime: "2026-09-25T08:00",
          outTime: "2026-09-25T19:00",
        },
      },
      audit: state.data.audit,
    },
  });
  expect(response.ok()).toBe(true);
  state = await response.json();
  response = await request.put("/api/company-holidays", {
    data: { month: "2026-09", dates: [], revision: state.revision },
  });
  expect(response.ok()).toBe(true);
  state = await response.json();
  expect(state.data.shifts).toEqual([]);
  expect(state.data.reviews["NEW|2026-09-25"]).toBeUndefined();
  expect(
    state.data.audit.some((a: { before: string }) =>
      a.before.includes("Manual holiday work"),
    ),
  ).toBe(true);
  expect(
    (
      await request.put("/api/workspace", {
        data: {
          revision: state.revision,
          reviews: state.data.reviews,
          audit: state.data.audit,
        },
      })
    ).ok(),
  ).toBe(true);
});

test("company calendar overrides personal leave for all employees, persists and restores on removal", async ({
  page,
  request,
}) => {
  const s: Shift = {
    emp_id: "ORG1",
    device_emp_id: "ORG1",
    emp_name: "First employee",
    agency: "One",
    department: "Dry",
    date: "2026-09-14",
    shift_code: "M",
    shift_start: "08:00",
    shift_end: "17:00",
    requested_ot_hrs: 0,
    ot_task_target: "",
  };
  await seedData({
    calculationVersion: 2,
    shifts: [
      s,
      {
        ...s,
        emp_id: "ORG2",
        device_emp_id: "ORG2",
        emp_name: "Second employee",
        agency: "Two",
        shift_code: "SL",
      },
    ],
    punches: [
      {
        device_emp_id: "ORG1",
        punch_timestamp: "2026-09-14 08:00:00",
        punch_type: "IN",
      },
      {
        device_emp_id: "ORG1",
        punch_timestamp: "2026-09-14 19:00:00",
        punch_type: "OUT",
      },
    ],
    reviews: {
      "ORG1|2026-09-14": {
        approved: true,
        overBudget: false,
        note: "Previously approved",
      },
    },
    audit: [],
  });
  let state = await (await request.get("/api/workspace")).json();
  const personal = await request.post("/api/holidays", {
    data: {
      employeeId: "ORG2",
      dates: ["2026-09-14"],
      code: "AB",
      revision: state.revision,
    },
  });
  expect(personal.ok()).toBe(true);
  const before = await personal.json();
  await page.goto("/employees/ORG1/calendar?month=2026-09");
  await page.getByRole("button", { name: "กำหนดวันหยุด", exact: true }).click();
  await expect(page.locator(".thai-holiday-picker")).toHaveCount(0);
  await page
    .getByLabel("รหัสวันหยุด", { exact: true })
    .selectOption("COMPANY_PH");
  const dialog = page.getByRole("dialog", {
    name: "กำหนดวันหยุดประเพณีองค์กร",
  });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "วันหยุดองค์กร 2026-09-14", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "วันหยุดองค์กร 2026-09-25", exact: true })
    .click();
  expect(
    (await (await request.get("/api/workspace")).json()).data.companyHolidays,
  ).toEqual([]);
  await dialog.getByRole("button", { name: "ยืนยันใช้กับทุกพนักงาน" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.locator('[data-calendar-date="2026-09-14"] .holiday-day-code'),
  ).toHaveText("PH");
  state = await (await request.get("/api/workspace")).json();
  expect(state.data.companyHolidays).toEqual(["2026-09-14", "2026-09-25"]);
  expect(
    state.data.shifts.filter((r: Shift) => r.shift_code === "PH"),
  ).toHaveLength(4);
  expect(state.data.reviews["ORG1|2026-09-14"].approved).toBe(false);
  expect(
    (
      await request.put("/api/company-holidays", {
        data: { month: "2026-09", dates: [], revision: before.revision },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post("/api/holidays", {
        data: {
          employeeId: "ORG2",
          dates: ["2026-09-14"],
          code: "SL",
          revision: state.revision,
        },
      })
    ).status(),
  ).toBe(400);
  const report = await (
    await request.get("/api/payroll?month=2026-09&cycle=calendar")
  ).json();
  expect(
    report.rows.every((r: { holidays: { PH: number } }) => r.holidays.PH === 2),
  ).toBe(true);
  expect(
    buildPayrollExport(report, ["publicHolidays"], true).at(-1)?.slice(-3),
  ).toEqual(["4.00", "0.00", "4.00"]);
  await page.goto("/employees/ORG2/calendar?month=2026-09");
  await expect(
    page.locator('[data-calendar-date="2026-09-14"] .holiday-day-code'),
  ).toHaveText("PH");
  await page.getByRole("button", { name: "กำหนดวันหยุด", exact: true }).click();
  await page
    .getByLabel("รหัสวันหยุด", { exact: true })
    .selectOption("COMPANY_PH");
  await expect(
    dialog.getByRole("button", {
      name: "วันหยุดองค์กร 2026-09-14",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await dialog
    .getByRole("button", { name: "วันหยุดองค์กร 2026-09-14", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "วันหยุดองค์กร 2026-09-25", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await dialog.evaluate(
      (el) => el.getBoundingClientRect().right <= innerWidth,
    ),
  ).toBe(true);
  await dialog.getByRole("button", { name: "ยืนยันใช้กับทุกพนักงาน" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.locator('[data-calendar-date="2026-09-14"] .holiday-day-code'),
  ).toHaveText("AB");
  state = await (await request.get("/api/workspace")).json();
  expect(state.data.companyHolidays).toEqual([]);
  expect(
    state.data.shifts.find((s: Shift) => s.emp_id === "ORG1").shift_code,
  ).toBe("M");
  expect(state.data.shifts).toHaveLength(2);
  expect(
    state.data.audit.some(
      (a: { key: string }) => a.key === "COMPANY_HOLIDAYS|2026-09",
    ),
  ).toBe(true);
});

test("leave codes persist from calendar and exclude scanned days from pay while exporting counts", async ({
  page,
  request,
}) => {
  const s: Shift = {
    emp_id: "LEAVE",
    device_emp_id: "LEAVE",
    emp_name: "Leave employee",
    agency: "Test",
    department: "Seafood",
    date: "2026-09-14",
    shift_code: "M",
    shift_start: "08:00",
    shift_end: "17:00",
    requested_ot_hrs: 0,
    ot_task_target: "",
  };
  await seedData({
    calculationVersion: 2,
    shifts: [s],
    punches: [
      {
        device_emp_id: "LEAVE",
        punch_timestamp: "2026-09-14 08:00:00",
        punch_type: "IN",
      },
      {
        device_emp_id: "LEAVE",
        punch_timestamp: "2026-09-14 20:00:00",
        punch_type: "OUT",
      },
    ],
    reviews: {
      "LEAVE|2026-09-14": {
        approved: true,
        overBudget: false,
        note: "Previous approval",
      },
    },
    audit: [],
  });
  await page.goto("/employees/LEAVE/calendar?month=2026-09");
  await page.getByRole("button", { name: "กำหนดวันหยุด", exact: true }).click();
  await page.getByLabel("รหัสวันหยุด", { exact: true }).selectOption("SL");
  await page
    .getByRole("button", { name: "เลือกวันหยุด 2026-09-14", exact: true })
    .click();
  await page.getByRole("button", { name: "ยืนยันวันหยุด (1)" }).click();
  await expect(
    page.locator('[data-calendar-date="2026-09-14"] .holiday-day-code'),
  ).toHaveText("SL");
  await page.reload();
  await expect(
    page.locator('[data-calendar-date="2026-09-14"] .holiday-day-code'),
  ).toHaveText("SL");
  let state = await (await request.get("/api/workspace")).json();
  expect(state.data.reviews["LEAVE|2026-09-14"].approved).toBe(false);
  for (const [i, code] of ["WOP", "PL", "AB"].entries()) {
    const response = await request.post("/api/holidays", {
      data: {
        employeeId: "LEAVE",
        dates: [`2026-09-${15 + i}`],
        code,
        revision: state.revision,
      },
    });
    expect(response.ok()).toBe(true);
    state = await response.json();
  }
  const report = await (
    await request.get("/api/payroll?month=2026-09&cycle=26-25")
  ).json();
  const r = report.rows[0];
  expect(r.holidays).toEqual({ SL: 1, WOP: 1, PL: 1, AB: 1 });
  expect([
    r.approvedTotal,
    r.pendingTotal,
    r.approvedAllowanceTotal,
    r.pendingAllowanceTotal,
  ]).toEqual([0, 0, 0, 0]);
  expect(r.missing).toBe(0);
  const csv = buildPayrollExport(report, ["leave"], true);
  expect(csv[1].slice(-5)).toEqual(["1.00", "1.00", "1.00", "1.00", "4.00"]);
  expect(csv[2].slice(-5)).toEqual(csv[1].slice(-5));
});

test("restoring a manually created date removes orphan reviews and preserves their audit history", async ({
  request,
}) => {
  const s: Shift = {
    emp_id: "RESET",
    device_emp_id: "RESET",
    emp_name: "Reset employee",
    agency: "Test",
    department: "Packing",
    date: "2026-09-14",
    shift_code: "M",
    shift_start: "08:00",
    shift_end: "17:00",
    requested_ot_hrs: 0,
    ot_task_target: "",
  };
  await seedData({
    calculationVersion: 2,
    shifts: [s],
    punches: [],
    reviews: {},
    audit: [],
  });
  let current = await (await request.get("/api/workspace")).json();
  let response = await request.post("/api/holidays", {
    data: {
      employeeId: "RESET",
      dates: ["2026-09-25"],
      code: "H8",
      revision: current.revision,
    },
  });
  expect(response.ok()).toBe(true);
  current = await response.json();
  response = await request.put("/api/workspace", {
    data: {
      revision: current.revision,
      reviews: {
        "RESET|2026-09-25": {
          approved: true,
          overBudget: false,
          note: "Verified manual times",
          inTime: "2026-09-25T08:00",
          outTime: "2026-09-25T19:00",
        },
      },
      audit: current.data.audit,
    },
  });
  expect(response.ok()).toBe(true);
  current = await response.json();
  response = await request.post("/api/holidays", {
    data: {
      employeeId: "RESET",
      dates: ["2026-09-25"],
      code: null,
      revision: current.revision,
    },
  });
  expect(response.ok()).toBe(true);
  current = await response.json();
  expect(current.data.reviews["RESET|2026-09-25"]).toBeUndefined();
  expect(
    current.data.shifts.find((x: Shift) => x.date === "2026-09-25"),
  ).toBeUndefined();
  expect(current.data.audit[0].before).toContain("Verified manual times");
  expect(
    (
      await request.put("/api/workspace", {
        data: {
          revision: current.revision,
          reviews: current.data.reviews,
          audit: current.data.audit,
        },
      })
    ).ok(),
  ).toBe(true);
});

test("calendar holiday selection persists, reopens approval and restores original schedule", async ({
  page,
  request,
}) => {
  const s: Shift = {
    emp_id: "HOL",
    device_emp_id: "HOL",
    emp_name: "Holiday employee",
    agency: "Test",
    department: "Packing",
    date: "2026-09-14",
    shift_code: "M",
    shift_start: "08:00",
    shift_end: "17:00",
    requested_ot_hrs: 0,
    ot_task_target: "",
  };
  await seedData({
    calculationVersion: 2,
    shifts: [s, { ...s, emp_id: "OTHER", device_emp_id: "OTHER" }],
    punches: [
      {
        device_emp_id: "HOL",
        punch_timestamp: "2026-09-14 08:00:00",
        punch_type: "IN",
      },
      {
        device_emp_id: "HOL",
        punch_timestamp: "2026-09-14 19:00:00",
        punch_type: "OUT",
      },
    ],
    reviews: {
      "HOL|2026-09-14": {
        approved: true,
        overBudget: false,
        note: "Confirmed",
      },
    },
    audit: [],
  });
  await page.goto("/employees/HOL/calendar?month=2026-09");
  await page.getByRole("button", { name: "กำหนดวันหยุด", exact: true }).click();
  await page.getByLabel("เลือกวันหยุดประจำสัปดาห์").selectOption("0");
  await expect(
    page.getByRole("button", { name: "ยืนยันวันหยุด (4)" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "เลือกวันหยุด 2026-08-31", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "ยืนยันวันหยุด (4)" }).click();
  await expect(
    page.locator('[data-calendar-date="2026-09-06"] .holiday-day-code'),
  ).toHaveText("H");
  await page.reload();
  await expect(
    page.locator('[data-calendar-date="2026-09-27"] .holiday-day-code'),
  ).toHaveText("H");
  const old = await (await request.get("/api/workspace")).json();
  await page.getByRole("button", { name: "กำหนดวันหยุด", exact: true }).click();
  await page.getByLabel("รหัสวันหยุด", { exact: true }).selectOption("PH8");
  // Click over an existing shift to verify the day selection layer receives it.
  await page
    .getByRole("button", { name: "เลือกวันหยุด 2026-09-14", exact: true })
    .click({ position: { x: 30, y: 100 } });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "ยืนยันวันหยุด (1)" }).click();
  await expect(
    page.locator('[data-calendar-date="2026-09-14"] .holiday-day-code'),
  ).toHaveText("PH8");
  let saved = await (await request.get("/api/workspace")).json();
  expect(saved.data.reviews["HOL|2026-09-14"].approved).toBe(false);
  expect(
    saved.data.shifts.find((x: Shift) => x.emp_id === "OTHER").shift_code,
  ).toBe("M");
  expect(saved.data.audit).toHaveLength(5);
  expect(
    (
      await request.post("/api/holidays", {
        data: {
          employeeId: "HOL",
          dates: ["2026-09-14"],
          code: "H",
          revision: old.revision,
        },
      })
    ).status(),
  ).toBe(409);
  for (const bad of [
    { code: "BAD", dates: ["2026-09-14"] },
    { code: "H", dates: ["2026-02-30"] },
    { code: "H", dates: ["2026-09-14", "2026-10-01"] },
  ]) {
    expect(
      (
        await request.post("/api/holidays", {
          data: { employeeId: "HOL", revision: saved.revision, ...bad },
        })
      ).status(),
    ).toBe(400);
  }
  await page.getByRole("button", { name: "รายละเอียด 2026-09-14 PH8" }).click();
  await expect(page.locator(".rate-table tbody tr").first()).toHaveText(
    "x1.088",
  );
  await page.getByRole("button", { name: "ปิดรายละเอียด" }).click();
  await page.getByRole("button", { name: "กำหนดวันหยุด", exact: true }).click();
  await page.getByLabel("รหัสวันหยุด", { exact: true }).selectOption("RESET");
  await page
    .getByRole("button", { name: "เลือกวันหยุด 2026-09-14", exact: true })
    .click();
  await page.getByRole("button", { name: "ยืนยันวันหยุด (1)" }).click();
  await expect(
    page.getByRole("button", { name: "รายละเอียด 2026-09-14 M" }),
  ).toBeVisible();
  // Reimport fingerprints must preserve manually assigned holidays.
  const form = {
    mode: "fingerprints",
    raw: {
      name: "scans.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("HOL\t20260914\t0800\nHOL\t20260914\t1900\n"),
    },
  };
  expect((await request.post("/api/import", { multipart: form })).ok()).toBe(
    true,
  );
  saved = await (await request.get("/api/workspace")).json();
  expect(
    saved.data.shifts.filter(
      (x: Shift) => x.emp_id === "HOL" && x.shift_code === "H",
    ),
  ).toHaveLength(4);
});
