"use client";
import { useEffect, useState } from "react";
import { useAccount } from "../auth-provider";
import { useTranslation } from "@/lib/i18n";
import { useWorkspace } from "./provider";
import type { PayrollSettings } from "@/lib/payroll-settings";
import { payableDailyWage, wageServicePercent } from "@/lib/payroll-settings";

export default function EmployeePayrollSettings({ employeeId, month }: { employeeId: string; month: string }) {
  const [open, setOpen] = useState(false);
  const { getLocale } = useTranslation();
  const title = getLocale().startsWith("en") ? "Employee pay rate" : "ตั้งค่าเรทเงินรายบุคคล";
  return <section className="employee-payroll-settings panel">
    <button type="button" className="button" aria-expanded={open} onClick={() => setOpen(!open)}>{title}</button>
    {open && <RateForm key={`${employeeId}|${month}`} employeeId={employeeId} month={month} />}
  </section>;
}
function RateForm({ employeeId, month }: { employeeId: string; month: string }) {
  const canEdit = useAccount().role === "super_admin";
  const { refresh, setToast } = useWorkspace();
  const { getLocale } = useTranslation();
  const label = (th: string, en: string) => getLocale().startsWith("en") ? en : th;
  const [payMonth, setPayMonth] = useState(month);
  const [data, setData] = useState<{ global: PayrollSettings; revision: number; local: { dailyWage: number } | null } | null>(null);
  const [inherit, setInherit] = useState(true), [wage, setWage] = useState("");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setMessage("");
    fetch(`/api/employee-payroll?${new URLSearchParams({ month: payMonth, employeeId })}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { if (!response.ok) throw Error(); return response.json(); })
      .then(body => { if (controller.signal.aborted) return; setData(body); setInherit(!body.local); setWage(String(body.local?.dailyWage ?? body.global.dailyWage)); })
      .catch(() => { if (!controller.signal.aborted) setMessage(label("โหลดข้อมูลไม่สำเร็จ", "Could not load rates")); });
    return () => controller.abort();
  }, [employeeId, payMonth, version]);
  return <form onSubmit={async event => {
    event.preventDefault();
    if (!canEdit || busy || !data) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/employee-payroll", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month: payMonth, employeeId, revision: data.revision, dailyWage: inherit ? null : Number(wage) }) });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      await refresh(); setVersion(v => v + 1); setToast(label("บันทึกเรทเงินแล้ว", "Pay rate saved"));
    } catch (e) { setMessage(e instanceof Error ? e.message : label("บันทึกไม่สำเร็จ", "Could not save")); }
    finally { setBusy(false); }
  }}>
    <label>{label("เดือนจ่าย", "Pay month")}<input type="month" value={payMonth} disabled={busy} onChange={event => { if (event.target.value) setPayMonth(event.target.value); }} /></label>
    <fieldset disabled={!canEdit || busy || !data} className={!canEdit ? "money-settings-readonly" : undefined}>
      <label><input type="checkbox" checked={inherit} onChange={event => setInherit(event.target.checked)} />{label("ใช้เรท Global", "Use global rate")}</label>
      <label>{label("ค่าจ้างฐาน / วัน (บาท)", "Base daily wage (THB)")}<input type="number" min="0.01" max="100000" step="0.01" required disabled={inherit} value={inherit ? data?.global.dailyWage ?? "" : wage} onChange={event => setWage(event.target.value)} /></label>
      <button className="button primary" type="submit">{label("บันทึกเรทเฉพาะคนนี้", "Save employee rate")}</button>
    </fieldset>
    {data && <p>{label("ค่าจ้างรวม Service", "Daily wage incl. Service")} {wageServicePercent(data.global)}%: {payableDailyWage({ ...data.global, dailyWage: inherit ? data.global.dailyWage : Number(wage) }).toLocaleString(getLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {label("บาท/วัน", "THB/day")}</p>}
    <small>{label("ใช้กับเดือนจ่ายที่เลือก รวมรอบ 26–25 · เรท Local ใช้แทนค่าจ้าง Global", "Applies to the selected pay month, including the 26–25 cycle. Local wage overrides global wage.")}</small>
    {!canEdit && <small>{label("แก้ไขได้เฉพาะ Super Admin", "Only Super Admin can edit rates")}</small>}
    {message && <p role="alert" className="error">{message}</p>}
  </form>;
}
