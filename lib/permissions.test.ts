import test from "node:test";
import assert from "node:assert/strict";
import { visibleWorkspace, canManageAttendance, canViewMoney } from "./permissions";
import type { Data, Shift } from "./engine";
const data: Data = {
  shifts: [{emp_id:"A",device_emp_id:"DA"}, {emp_id:"B",device_emp_id:"DB"}] as Shift[],
  actualOnlyShifts: [{emp_id:"C",device_emp_id:"DC"}] as Shift[],
  punches: [{device_emp_id:"DA",punch_timestamp:"2026-10-01 08:00",punch_type:"UNKNOWN"}, {device_emp_id:"DB",punch_timestamp:"2026-10-01 08:00",punch_type:"UNKNOWN"}],
  reviews: {"A|2026-10-01":{approved:true,overBudget:false,note:""},"B|2026-10-01":{approved:false,overBudget:false,note:""}},
  audit:[{id:"secret",key:"B",actor:"admin",timestamp:"",reason:"",before:"salary",after:"salary"}],
  payrollSettings:{}, payrollBooks:{}, employeePayrollSettings:{},
  evidenceImageCounts:{"A|2026-10-01":1,"B|2026-10-01":2},
  calendarRemarks:[{employeeId:"",date:"2026-10-01",text:"global"},{employeeId:"B",date:"2026-10-01",text:"private"}],
};
const workspace={data,employeeCount:2,revision:7,employees:[{employee_id:"A",source_data:{salary:357}},{employee_id:"B",source_data:{salary:900}}]};
test("guest sees attendance but receives no financial or raw master payload",()=>{
  const result=visibleWorkspace(workspace,{role:"guest"});
  assert.equal(result.data.shifts.length,2);
  for(const field of ["payrollSettings","payrollBooks","employeePayrollSettings"]) assert.equal(field in result.data,false);
  assert.deepEqual(result.data.audit,[]);
  assert.deepEqual(result.employees,[{employee_id:"A"},{employee_id:"B"}]);
});
test("employee scope comes from account and isolates scans, reviews, remarks and counts",()=>{
  const result=visibleWorkspace(workspace,{role:"employee",employeeId:"A"});
  assert.equal(result.employeeCount,1);
  assert.deepEqual(result.data.shifts.map(s=>s.emp_id),["A"]);
  assert.deepEqual(result.data.punches.map(p=>p.device_emp_id),["DA"]);
  assert.deepEqual(Object.keys(result.data.reviews),["A|2026-10-01"]);
  assert.equal(result.data.calendarRemarks?.length,1);
  assert.deepEqual(result.data.evidenceImageCounts,{"A|2026-10-01":1});
  assert.equal(visibleWorkspace(workspace,{role:"employee"}).employeeCount,0);
  assert.equal(visibleWorkspace(workspace,{role:"employee",employeeId:"unknown"}).data.punches.length,0);
  assert.equal(workspace.data.shifts.length,2);
});
test("employee role can see its own Actual-only scans and no other employee scans",()=>{
  const withScans = { ...workspace, employees: [...workspace.employees, { employee_id: "C" }], data: {
    ...data,
    punches: [...data.punches, { device_emp_id: "DC", punch_timestamp: "2026-10-01 08:00", punch_type: "UNKNOWN" as const }],
  }};
  const own = visibleWorkspace(withScans, { role: "employee", employeeId: "C" });
  assert.deepEqual(own.data.actualOnlyShifts?.map(s => s.emp_id), ["C"]);
  assert.deepEqual(own.data.punches.map(p => p.device_emp_id), ["DC"]);
  assert.deepEqual(visibleWorkspace(withScans, { role: "employee", employeeId: "A" }).data.actualOnlyShifts, []);
});
test("manager permissions preserved; viewers cannot manage or see money",()=>{
  for(const role of ["super_admin","supervisor"] as const) {
    assert.equal(visibleWorkspace(workspace,{role}),workspace);
    assert.ok(canManageAttendance(role)); assert.ok(canViewMoney(role));
  }
  for(const role of ["guest","employee"] as const) { assert.equal(canManageAttendance(role),false);assert.equal(canViewMoney(role),false); }
});
