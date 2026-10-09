import { test } from "node:test";
import assert from "node:assert/strict";
import { translateText } from "./i18n";
test("UI translations preserve spacing and localize messages with dynamic counts", () => {
  assert.equal(translateText("  บันทึก ", "en"), "  Save ");
  assert.equal(translateText("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", "en"), "Incorrect username or password.");
  assert.equal(translateText("ชั่วโมงปกติ", "th"), "ชั่วโมงปกติ");
  assert.equal(translateText("Connected", "th"), "เชื่อมต่อแล้ว");
  assert.equal(translateText("3 ชม.", "en"), "3 hrs");
  assert.equal(translateText("หมายเหตุวันที่ 2026-09-03", "en"), "Remarks for 2026-09-03");
  assert.equal(translateText("constructor", "en"), "constructor");
});
