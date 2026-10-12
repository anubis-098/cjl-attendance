import test from "node:test";
import assert from "node:assert/strict";
import { createEmployeeRow, employeeMoneyDefaults } from "./employee-create";
import { DEFAULT_PAYROLL_SETTINGS } from "./payroll-settings";
const fields={"รหัส":"BE123456","ชื่อ-นามสกุล":"Test Employee","แผนก":"Frozen CDC","คลัง":"CDC","กะทำงาน":"N","First Time":"20:00","Last Time":"05:00","Sup":"Agency","เริ่มงาน":"2026-10-12"};
test("creates a valid overnight master record with canonical department and payroll defaults",()=>{
  const row=createEmployeeRow(fields,4,DEFAULT_PAYROLL_SETTINGS);
  assert.equal(row.source_data["ลำดับ"],"4");
  assert.equal(row.source_data["เวลาทำงาน"],"20:00 - 05:00");
  assert.equal(row.shift_data?.department,"Frozen");
  assert.equal(row.shift_data?.device_emp_id,"BE123456");
  assert.equal(row.source_data["Cost per head"],"428.40");
  assert.equal(row.source_data["OT per hrs."],"72.29");
  assert.equal(row.source_data["OT Holiday"],"144.59");
  assert.equal(row.source_data["Shift Allowance"],"72.10");
  assert.equal(row.source_data["FF Allowance"],"51.50");
});
test("uses configured current rates, does not trust money fields submitted by client",()=>{
  const settings={...DEFAULT_PAYROLL_SETTINGS,dailyWage:400,frozen:60};
  const row=createEmployeeRow({...fields,"Cost per head":"1","FF Allowance":"9999"},1,settings);
  assert.equal(row.source_data["Cost per head"],"480.00");assert.equal(row.source_data["FF Allowance"],"60.00");
  assert.equal(employeeMoneyDefaults(settings,"Saefood","D")["Shift Allowance"],"0.00");
  assert.equal(employeeMoneyDefaults(settings,"Dry","M")["FF Allowance"],"0.00");
});
test("rejects missing identity, malformed times and invalid employment dates",()=>{
  for(const patch of [{"รหัส":""},{"รหัส":"A|2026-10-12"},{"ชื่อ-นามสกุล":""},{"First Time":"25:00"},{"Last Time":"20:00"},{"เริ่มงาน":"2026-02-30"},{"End ":"2026-01-01"}]) assert.throws(()=>createEmployeeRow({...fields,...patch},1,DEFAULT_PAYROLL_SETTINGS));
});
