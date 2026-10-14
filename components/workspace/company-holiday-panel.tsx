"use client";
import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { isoLocal } from "@/lib/engine";
import { useTranslation } from "@/lib/i18n";
import { useWorkspace } from "./provider";

export default function CompanyHolidayPanel() {
  const { getLocale } = useTranslation();
  const label = (th: string, en: string) => getLocale().startsWith("th") ? th : en;
  const { data, saveCompanyHolidays } = useWorkspace();
  const [month, setMonth] = useState(isoLocal(Date.now()).slice(0, 7));
  const [view, setView] = useState("month");
  const [changes, setChanges] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const saved = new Set(data.companyHolidays || []);
  const selectedYear = Number(month.slice(0, 4));
  const years = [...new Set([
    ...Array.from({ length: 11 }, (_, i) => selectedYear - 5 + i),
    new Date().getFullYear(),
    ...[...saved].map(date => Number(date.slice(0, 4))),
  ])].filter(year => year >= 1000 && year <= 9999).sort((a, b) => a - b);
  const pending = Object.keys(changes).filter(date => changes[date] !== saved.has(date));
  const months = view === "year" ? Array.from({ length: 12 }, (_, i) => `${month.slice(0, 4)}-${String(i + 1).padStart(2, "0")}`) : [month];
  function navigate(direction: number) {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + direction * (view === "year" ? 12 : 1));
    setMonth(date.toISOString().slice(0, 7));
  }
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      for (const target of [...new Set(pending.map(date => date.slice(0, 7)))].sort()) {
        const dates = new Set([...saved].filter(date => date.startsWith(target)));
        for (const date of pending.filter(date => date.startsWith(target))) {
          if (changes[date]) dates.add(date); else dates.delete(date);
        }
        if (!await saveCompanyHolidays(target, [...dates].sort())) {
          setMessage(label("บันทึกไม่สำเร็จ รายการที่เหลือยังคงรอบันทึก กรุณาโหลดข้อมูลใหม่ก่อนลองอีกครั้ง", "Save failed. Remaining changes are pending. Refresh data before retrying."));
          return;
        }
        setChanges(previous => Object.fromEntries(Object.entries(previous).filter(([date]) => !date.startsWith(target))));
      }
      setMessage(label("บันทึกวันหยุดองค์กรแล้ว", "Company holidays saved."));
    } finally { setBusy(false); }
  }
  return <details className="panel employee-tools">
    <summary><span className="employee-tool-icon"><CalendarDays size={21} /></span><span>{label("กำหนดวันหยุดองค์กร (PH)", "Company holidays (PH)")}</span><ChevronDown size={18} className="employee-tool-chevron" /></summary>
    <div className="employee-tool-body">
      <fieldset className="company-calendar-editor" disabled={busy}>
        <div className="company-calendar-toolbar">
          <div className="segmented">{["month", "year"].map(mode => <button type="button" key={mode} className={view === mode ? "selected" : ""} aria-pressed={view === mode} onClick={() => setView(mode)}>{mode === "month" ? label("รายเดือน", "Month") : label("รายปี", "Year")}</button>)}</div>
          <button type="button" className="icon-button" aria-label={label("ช่วงก่อนหน้า", "Previous period")} onClick={() => navigate(-1)}><ChevronLeft size={18} /></button>
          {view === "month" && <label className="company-calendar-period-field">
            <span>{label("เดือน", "Month")}</span>
            <select aria-label={label("เลือกเดือน", "Choose month")} value={month.slice(5, 7)} onChange={e => setMonth(`${month.slice(0, 4)}-${e.target.value}`)}>
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={String(i + 1).padStart(2, "0")}>{new Date(Date.UTC(selectedYear, i, 1)).toLocaleDateString(getLocale(), { month: "long", timeZone: "UTC" })}</option>)}
            </select>
          </label>}
          <label className="company-calendar-period-field">
            <span>{label("ปี", "Year")}</span>
            <select aria-label={label("เลือกปี", "Choose year")} value={selectedYear} onChange={e => setMonth(`${e.target.value}-${month.slice(5, 7)}`)}>
              {years.map(year => <option key={year} value={year}>{new Date(Date.UTC(year, 0, 1)).toLocaleDateString(getLocale(), { year: "numeric", timeZone: "UTC" })}</option>)}
            </select>
          </label>
          <button type="button" className="icon-button" aria-label={label("ช่วงถัดไป", "Next period")} onClick={() => navigate(1)}><ChevronRight size={18} /></button>
        </div>
        <p>{label("เลือกวันเพื่อใช้ PH กับทุกคน รวมพนักงานใหม่ วันหยุดองค์กรจะแทนวันหยุดหรือวันลารายบุคคลในวันที่เลือก", "Select dates to apply PH to everyone, including new employees. Company holidays override personal holidays and leave on these dates.")}</p>
        <div className={`company-calendar-months ${view === "year" ? "year-view" : ""}`}>
          {months.map(period => {
            const first = new Date(`${period}-01T12:00:00Z`);
            const offset = (first.getUTCDay() + 6) % 7;
            const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
            return <section key={period} className="company-calendar-month">
              <h3>{first.toLocaleDateString(getLocale(), { month: "long", timeZone: "UTC" })}</h3>
              <div className="company-holiday-grid">
                {(getLocale().startsWith("th") ? ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"] : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]).map(day => <b key={day}>{day}</b>)}
                {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} />)}
                {Array.from({ length: days }, (_, i) => {
                  const date = `${period}-${String(i + 1).padStart(2, "0")}`;
                  const selected = changes[date] ?? saved.has(date);
                  return <button type="button" key={date} className="company-holiday-cell" aria-label={`${date} PH`} aria-pressed={selected} data-pending={pending.includes(date)} onClick={() => { setChanges(previous => ({ ...previous, [date]: !selected })); setMessage(""); }}><span>{i + 1}</span><small>{selected ? "PH" : "\u00a0"}</small></button>;
                })}
              </div>
            </section>;
          })}
        </div>
        <div className="company-calendar-toolbar">
          <span>{label("รายการที่เปลี่ยน", "Changed dates")}: {pending.length}</span>
          <button type="button" className="button calendar-cancel" disabled={!pending.length} onClick={() => { setChanges({}); setMessage(""); }}>{label("ยกเลิก", "Cancel")}</button>
          <button type="button" className="button calendar-confirm" disabled={!pending.length} onClick={() => void save()}>{busy ? label("กำลังบันทึก...", "Saving...") : label("ยืนยันใช้กับทุกคน", "Apply to everyone")}</button>
        </div>
      </fieldset>
      {message && <p role="status">{message}</p>}
    </div>
  </details>;
}
