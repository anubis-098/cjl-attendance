"use client";
import { useMemo, useState } from "react";
import { useAccount } from "../auth-provider";
import { useWorkspace } from "./provider";
import { useTranslation } from "@/lib/i18n";
import EmployeeCalendar from "./employee-calendar";
export default function ReadOnlyWorkspace() {
  const account = useAccount();
  const { data } = useWorkspace();
  const { t } = useTranslation();
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const employees = useMemo(() => [...new Map(data.shifts.map(s => [s.emp_id, s])).values()].sort((a,b) => a.emp_id.localeCompare(b.emp_id)), [data.shifts]);
  const id = account.role === "employee" ? account.employeeId : selected;
  const rows = employees.filter(s => `${s.emp_id} ${s.emp_name} ${s.department}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <div className="panel" style={{padding: 16, marginBottom: 16}}>
      <b>{t("ดูข้อมูลเท่านั้น · ไม่มีสิทธิ์แก้ไขหรือดูข้อมูลการเงิน")}</b>
      {account.role === "guest" && <div className="filters" style={{marginTop:12}}>
        <input aria-label={t("ค้นหาพนักงาน")} placeholder={t("ค้นหาพนักงาน")} value={search} onChange={e => setSearch(e.target.value)} data-filter-active={!!search}/>
        <select aria-label={t("เลือกพนักงาน")} value={selected} onChange={e => setSelected(e.target.value)} data-filter-active={!!selected}>
          <option value="">{t("เลือกพนักงาน")}</option>
          {rows.map(s => <option key={s.emp_id} value={s.emp_id}>{s.emp_id} · {s.emp_name} · {s.department}</option>)}
        </select>
      </div>}
    </div>
    {id ? <EmployeeCalendar key={id} employeeId={id}/> : <p>{t("เลือกพนักงานเพื่อดูเวลาทำงานและสถานะ OT")}</p>}
  </>;
}
