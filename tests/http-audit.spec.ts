import { test, expect, seedData } from "./sql-fixture";

test("attendance detail save works when HTTP browser has no randomUUID", async ({page, request}) => {
  await seedData({
    shifts: [{emp_id:"HTTP",device_emp_id:"HTTP",emp_name:"HTTP employee",agency:"Test",department:"Dry",date:"2026-09-30",shift_code:"M",shift_start:"08:00",shift_end:"17:00",requested_ot_hrs:0,ot_task_target:""}],
    punches: ["08:00","17:00"].map(time=>({device_emp_id:"HTTP",punch_timestamp:`2026-09-30T${time}:00`,punch_type:"UNKNOWN" as const})),
    reviews:{}, audit:[],
  });
  await page.addInitScript(() => Object.defineProperty(window.crypto,"randomUUID",{value:undefined,configurable:true}));
  await page.goto("/employees/HTTP/calendar?month=2026-09");
  await page.getByRole("button",{name:"รายละเอียด 2026-09-30 M",exact:true}).first().click();
  await page.getByLabel("ผลการทำงาน / หมายเหตุ (ไม่บังคับ)").fill("Saved over HTTP without randomUUID");
  await page.getByRole("button",{name:"บันทึกผลตรวจสอบ"}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const saved=await (await request.get("/api/workspace")).json();
  expect(saved.data.reviews["HTTP|2026-09-30"].note).toBe("Saved over HTTP without randomUUID");
  expect(saved.data.audit[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
