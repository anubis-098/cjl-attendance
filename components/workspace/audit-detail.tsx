"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Audit } from "@/lib/engine";
import type { AttendanceEvidence } from "@/lib/attendance-evidence";
import { auditChanges } from "@/lib/audit-changes";
import { useTranslation } from "@/lib/i18n";

const fieldNames: Record<string, [string, string]> = {
  inTime: ["เวลาเข้า", "Clock in"], outTime: ["เวลาออก", "Clock out"],
  approved: ["ยืนยัน OT", "OT confirmed"], overBudget: ["หัวหน้างานลงนาม", "Supervisor sign-off"],
  note: ["หมายเหตุ", "Note"], deductOTBreak: ["หักพัก OT 30 นาที", "Deduct 30-minute OT break"],
  shift: ["กะ", "Shift"], shift_code: ["รหัสกะ", "Shift code"],
  shift_start: ["เริ่มกะ", "Shift start"], shift_end: ["สิ้นสุดกะ", "Shift end"],
  filename: ["ชื่อไฟล์", "Filename"], providerName: ["ผู้ให้หลักฐาน", "Evidence provider"],
  source: ["แหล่งหลักฐาน", "Evidence source"], evidenceId: ["รหัสหลักฐาน", "Evidence ID"],
  value: ["ข้อมูล", "Value"], reviews: ["การตรวจสอบ", "Reviews"],
};

export default function AuditDetail({ entry, employeeName }: { entry: Audit; employeeName?: string }) {
  const { getLocale } = useTranslation();
  const en = getLocale().startsWith("en");
  const text = (th: string, english: string) => en ? english : th;
  const match = /^(.+)\|(\d{4}-\d{2}-\d{2})$/.exec(entry.key);
  const employeeId = match?.[1], date = match?.[2];
  const [items, setItems] = useState<AttendanceEvidence[]>([]);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    if (!employeeId || !date || !employeeName) return;
    const abort = new AbortController();
    setStatus("loading");
    fetch(`/api/attendance-evidence?${new URLSearchParams({ employeeId, date })}`, { cache: "no-store", signal: abort.signal })
      .then(async response => {
        if (!response.ok) throw Error();
        const body = await response.json();
        if (!abort.signal.aborted) { setItems(body.evidence); setStatus("ready"); }
      }).catch(() => { if (!abort.signal.aborted) setStatus("error"); });
    return () => abort.abort();
  }, [employeeId, date, employeeName]);
  const display = (value: unknown) => value == null || value === "" ? "—"
    : typeof value === "boolean" ? (value ? text("ใช่", "Yes") : text("ไม่ใช่", "No"))
    : typeof value === "object" ? JSON.stringify(value) : String(value);
  const changes = auditChanges(entry.before, entry.after);
  return <div className="audit-detail">
    {employeeId && date && employeeName && <Link className="button" href={`/employees/${encodeURIComponent(employeeId)}/calendar?month=${date.slice(0, 7)}`}>
      {text("ดูปฏิทิน", "View calendar")} · {employeeName} · {date}
    </Link>}
    {changes.length ? <div className="audit-diff-scroll"><table className="audit-diff">
      <thead><tr><th>{text("รายการที่แก้ไข", "Changed field")}</th><th>{text("ก่อนแก้ไข", "Before")}</th><th>{text("หลังแก้ไข", "After")}</th></tr></thead>
      <tbody>{changes.map(change => <tr key={change.field}>
        <th>{change.field.split(".").map(part => fieldNames[part]?.[en ? 1 : 0] || part).join(" / ")}</th>
        <td>{display(change.before)}</td><td>{display(change.after)}</td>
      </tr>)}</tbody>
    </table></div> : <p>{text("ไม่มีข้อมูลเปลี่ยนแปลงก่อน–หลังในรายการนี้", "No before/after changes recorded for this entry")}</p>}
    {employeeId && date && employeeName && <section>
      <h4>{text("หลักฐานของพนักงานในวันทำงานนี้", "Employee evidence for this work date")}</h4>
      {status === "loading" ? <p role="status">{text("กำลังโหลดหลักฐาน…", "Loading evidence…")}</p>
        : status === "error" ? <p role="alert">{text("โหลดหลักฐานไม่สำเร็จ กรุณาปิดแล้วเปิดรายละเอียดใหม่", "Could not load evidence. Close and reopen details to retry.")}</p>
        : !items.length ? <p>{text("ไม่มีหลักฐานแนบ", "No attachments")}</p>
        : <div className="audit-evidence-grid">{items.map(item => <article key={item.id}>
          <a href={`/api/attendance-evidence/${encodeURIComponent(item.id)}${item.content_type.startsWith("image/") ? "?preview=1" : ""}`} target="_blank" rel="noopener noreferrer">
            {item.content_type.startsWith("image/") && <img loading="lazy" src={`/api/attendance-evidence/${encodeURIComponent(item.id)}?preview=1`} alt={item.filename} />}
            {item.filename}
          </a>
          <small>{item.source === "employee" ? text("พนักงาน", "Employee") : text("หัวหน้างาน", "Supervisor")} · {item.provider_name} · {new Date(item.created_at).toLocaleString(getLocale(), { timeZone: "Asia/Bangkok" })}</small>
          {item.note && <p>{item.note}</p>}
        </article>)}</div>}
    </section>}
  </div>;
}
