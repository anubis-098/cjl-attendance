import { randomUUID } from "node:crypto";
import { guard } from "@/lib/auth";
import { employeeDB, updateEmployeeStore } from "@/lib/database";
import { EMPLOYEE_CHOICE_HEADERS, createEmployeeRow } from "@/lib/employee-create";
import { normalizeDepartment } from "@/lib/departments";
import { resolvePayrollSettings } from "@/lib/payroll-settings";
import { isoLocal } from "@/lib/engine";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const denied = await guard(); if (denied) return denied;
  const month = isoLocal(Date.now()).slice(0,7);
  const { rows } = await employeeDB.query("SELECT source_data,shift_data FROM employee_master");
  const options: Record<string,string[]> = {};
  for (const header of EMPLOYEE_CHOICE_HEADERS) options[header] = [...new Set(rows.map(r => String(r.source_data[header] || (header === "กะทำงาน" ? r.shift_data?.shift_code : "") || "").trim()).filter(Boolean).map(value => header === "แผนก" ? normalizeDepartment(value) : value))].sort((a,b)=>a.localeCompare(b,"th"));
  const times = [...new Set(rows.flatMap(r => r.shift_data ? [`${r.shift_data.shift_start} - ${r.shift_data.shift_end}`] : []))].sort();
  const { rows:[state] } = await employeeDB.query("SELECT data,revision FROM workspace WHERE id=1");
  return Response.json({options,times,month,revision:Number(state.revision),settings:resolvePayrollSettings(state.data.payrollSettings?.[month])}, {headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request: Request) {
  const denied = await guard(false,true); if (denied) return denied;
  try {
    const body = await request.json();
    if (!Number.isSafeInteger(body.revision)) throw Error("ข้อมูลฟอร์มไม่ถูกต้อง กรุณาเปิดฟอร์มใหม่");
    let employeeId = "";
    await updateEmployeeStore(async(c,state)=>{
      if (Number(state.revision) !== body.revision) throw Error("CONFLICT");
      const month = isoLocal(Date.now()).slice(0,7);
      if (body.month !== month) throw Error("CONFLICT");
      const {rows:[position]} = await c.query("SELECT COALESCE(max(source_row),0)+1 AS next FROM employee_master");
      const row = createEmployeeRow(body.fields,Number(position.next),resolvePayrollSettings(state.data.payrollSettings?.[month]));
      employeeId=row.employee_id;
      // INSERT only: duplicate IDs never overwrite an existing employee.
      await c.query("INSERT INTO employee_master(employee_id,source_row,source_data,shift_data,issue) VALUES($1,$2,$3,$4,$5)",[row.employee_id,row.source_row,JSON.stringify(row.source_data),JSON.stringify(row.shift_data),row.issue]);
      const entry = {id:randomUUID(),key:`EMPLOYEE|${row.employee_id}`,actor:"",timestamp:new Date().toISOString(),reason:"เพิ่มพนักงาน",before:"",after:JSON.stringify(row.source_data)};
      await c.query("UPDATE workspace SET data=$1 WHERE id=1",[JSON.stringify({...state.data,audit:[entry,...state.data.audit]})]);
    });
    return Response.json({employeeId},{status:201});
  } catch(e) {
    const conflict=e instanceof Error && e.message==="CONFLICT";
    const duplicate=(e as {code?:string}).code==="23505";
    return Response.json({error:conflict?"ข้อมูลหรืออัตราเงินเปลี่ยนแล้ว กรุณาโหลดค่าเริ่มต้นใหม่":duplicate?"รหัสพนักงานนี้มีอยู่แล้ว":e instanceof Error?e.message:"บันทึกไม่สำเร็จ"},{status:conflict||duplicate?409:400});
  }
}
