"use client";
import { useState } from "react";
import { UserPlus, ChevronDown, Banknote, Save, RotateCcw } from "lucide-react";
import { MASTER_HEADERS } from "@/lib/source-headers";
import { EMPLOYEE_CHOICE_HEADERS, EMPLOYEE_MONEY_HEADERS, employeeMoneyDefaults } from "@/lib/employee-create";
import type { PayrollSettings } from "@/lib/payroll-settings";
import { useTranslation } from "@/lib/i18n";
import { useWorkspace } from "./provider";
type Meta = { options:Record<string,string[]>; times:string[]; settings:PayrollSettings; revision:number; month:string };
const initial = () => Object.fromEntries(MASTER_HEADERS.map(h=>[h,""]));
export default function EmployeeCreateForm({onCreated}:{onCreated:()=>void}) {
  const {t}=useTranslation();
  const {refresh,setToast}=useWorkspace();
  const [meta,setMeta]=useState<Meta>();
  const [fields,setFields]=useState(initial);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState("");
  async function load() {
    setLoading(true);setError("");
    try { const res=await fetch("/api/employees",{cache:"no-store"});const body=await res.json();if(!res.ok)throw Error(body.error);setMeta(body); }
    catch(e){setError(e instanceof Error?e.message:"โหลดข้อมูลไม่สำเร็จ");}finally{setLoading(false);}
  }
  function change(header:string,value:string) {setFields(prev=>({...prev,[header]:value}));}
  const money=meta?employeeMoneyDefaults(meta.settings,fields.Section,fields["กะทำงาน"]):{};
  async function save(e:React.FormEvent) {
    e.preventDefault();if(!meta||busy)return;setBusy(true);setError("");
    try {
      const res=await fetch("/api/employees",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields,revision:meta.revision,month:meta.month})});
      const body=await res.json();if(!res.ok)throw Error(body.error);
      setFields(initial());onCreated();setToast("เพิ่มพนักงานเรียบร้อยแล้ว");
      await load();
      await refresh().catch(()=>setToast("เพิ่มพนักงานแล้ว กรุณารีเฟรชหน้าจอ"));
    }catch(e){setError(e instanceof Error?e.message:"บันทึกไม่สำเร็จ");}finally{setBusy(false);}
  }
  const required=["รหัส","ชื่อ-นามสกุล","แผนก","Section","กะทำงาน","Sup","First Time","Last Time"];
  function field(header:string) {
    const label=t(header)+(required.includes(header)?" *":"");
    const props={value:fields[header],disabled:busy,required:required.includes(header),onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>change(header,e.target.value)};
    if(header==="ลำดับ") return <label key={header}>{t(header)}<input value={t("อัตโนมัติ")} disabled/></label>;
    if(header==="เวลาทำงาน") return <label key={header}>{t(header)}<select aria-label={t(header)} value={fields["First Time"]&&fields["Last Time"]?`${fields["First Time"]} - ${fields["Last Time"]}`:""} disabled={busy} onChange={e=>{const [start,end]=e.target.value.split(" - ");setFields(prev=>({...prev,"First Time":start||"","Last Time":end||""}));}}><option value="">{t("เลือกเวลาทำงาน หรือระบุเวลาเอง")}</option>{[...new Set([...(meta?.times||[]),...(fields["First Time"]&&fields["Last Time"]?[`${fields["First Time"]} - ${fields["Last Time"]}`]:[])])].map(v=><option key={v}>{v}</option>)}</select></label>;
    if(EMPLOYEE_CHOICE_HEADERS.includes(header)) {
      const options=meta?.options[header]||[];
      return <label key={header}>{label}{options.length?<select {...props}><option value="">{t("เลือกข้อมูล")}</option>{options.map(v=><option key={v}>{v}</option>)}</select>:<input {...props} maxLength={200} placeholder={t("ยังไม่มีตัวเลือก กรุณากรอกข้อมูล")}/>}</label>;
    }
    return <label key={header}>{label}<input {...props} type={["First Time","Last Time"].includes(header)?"time":["เริ่มงาน","วันที่ออก"].includes(header)?"date":"text"} maxLength={header==="รหัส"?64:200} pattern={header==="รหัส"?"[A-Za-z0-9_-]{1,64}":undefined}/></label>;
  }
  return <details className="panel employee-tools" onToggle={e=>{if(e.currentTarget.open&&!meta&&!loading)void load();}}>
    <summary><span className="employee-tool-icon"><UserPlus size={21}/></span><span>{t("เพิ่มพนักงาน")}</span><ChevronDown size={18} className="employee-tool-chevron"/></summary>
    <div className="employee-tool-body">
      {loading&&<p role="status">{t("กำลังโหลด...")}</p>}
      {meta&&<form onSubmit={save}>
        <fieldset disabled={busy||loading} className="employee-create-grid">{MASTER_HEADERS.filter(h=>!EMPLOYEE_MONEY_HEADERS.includes(h)).map(field)}</fieldset>
        <div className="employee-money-heading"><Banknote size={19}/><b>{t("ค่าเงินและเบี้ยเลี้ยงเริ่มต้น")}</b><span>{meta.month}</span></div>
        <div className="employee-create-grid employee-money-grid">{EMPLOYEE_MONEY_HEADERS.map(h=><label key={h}>{h}<input readOnly value={money[h as keyof typeof money]||""}/></label>)}</div>
        <p className="employee-form-hint">{t("เติมจากอัตราส่วนกลาง · OT per hrs. ×1.5 · OT Holiday ×3.0 · ปรับอัตราเงินได้ใน Monthly OT pay")}</p>
        <div className="employee-form-actions"><button className="button" type="button" disabled={busy||loading} onClick={()=>void load()}><RotateCcw size={16}/>{t("โหลดค่าเริ่มต้นใหม่")}</button><button className="button primary" disabled={busy||loading}><Save size={16}/>{t(busy?"กำลังบันทึก...":"บันทึกพนักงาน")}</button></div>
      </form>}
      {error&&<p className="error" role="alert">{t(error)}</p>}
      {!meta&&!loading&&<button className="button" onClick={()=>void load()}>{t("ลองใหม่")}</button>}
    </div>
  </details>;
}
