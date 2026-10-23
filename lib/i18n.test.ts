import { test } from "node:test";
import assert from "node:assert/strict";
import { translateText } from "./i18n";
test("employee import and export copy follows the selected language", () => {
  const labels = [
    ["Import & Export files", "นำเข้าและนำออกไฟล์"],
    ["Import Master data", "นำเข้าข้อมูล Master"],
    ["Import method", "วิธีนำเข้าข้อมูล"],
    ["Export employee data", "ส่งออกข้อมูลพนักงาน"],
    ["Export scope", "ขอบเขตข้อมูลส่งออก"],
    ["Choose employee file", "เลือกไฟล์พนักงาน"],
    ["Confirm employee import", "ยืนยันนำเข้าพนักงาน"],
  ];
  for (const [en, th] of labels) {
    assert.equal(translateText(en, "th"), th);
    assert.equal(translateText(en, "en"), en);
    assert.equal(translateText(th, "en"), en);
    assert.equal(translateText(th, "th"), th);
  }
});
test("UI translations preserve spacing and localize messages with dynamic counts", () => {
  assert.equal(translateText("  บันทึก ", "en"), "  Save ");
  assert.equal(translateText("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", "en"), "Incorrect username or password.");
  assert.equal(translateText("ชั่วโมงปกติ", "th"), "ชั่วโมงปกติ");
  assert.equal(translateText("Connected", "th"), "เชื่อมต่อแล้ว");
  assert.equal(translateText("3 ชม.", "en"), "3 hrs");
  assert.equal(translateText("หมายเหตุวันที่ 2026-09-03", "en"), "Remarks for 2026-09-03");
  assert.equal(translateText("constructor", "en"), "constructor");
});
