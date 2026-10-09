"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/lib/i18n";
import { isoLocal, type Shift } from "@/lib/engine";
import { nonWorkingCodes, normalizeDayCode } from "@/lib/day-codes";
import { shiftWindow } from "@/lib/shift-window";
import { useWorkspace } from "./provider";
import OTRequestTimeline from "./ot-request-timeline";
type Entry = { date: string; before_hours: string; after_hours: string; reason: string; status: string; requested_by: string };
type Payload = { revision: number; plans: Shift[]; requests: Entry[] };
export default function OTRequestPopover({ employeeId, name, month, date, anchor, onBusy, onClose }: { employeeId: string; name: string; month: string; date: string; anchor: HTMLElement; onBusy: (busy: boolean) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const { refresh, setToast } = useWorkspace();
  const [data, setData] = useState<Payload | null>(null);
  const [before, setBefore] = useState("0"), [after, setAfter] = useState("1"), [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const panel = useRef<HTMLElement>(null), firstInput = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState({ top: 8, left: 8 });
  useLayoutEffect(() => {
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const width = panel.current?.offsetWidth || 340, height = panel.current?.offsetHeight || 440;
      const left = rect.right + width + 8 <= innerWidth ? rect.right + 8 : rect.left - width - 8;
      setPosition({ left: Math.max(8, Math.min(left, innerWidth - width - 8)), top: Math.max(8, Math.min(rect.top, innerHeight - height - 8)) });
    };
    place();
    const observer = new ResizeObserver(place);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener("resize", place); window.addEventListener("scroll", place, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [anchor]);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!busy && !panel.current?.contains(event.target as Node) && !anchor.contains(event.target as Node)) onClose(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) { event.stopPropagation(); onClose(); anchor.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [anchor, busy, onClose]);
  useEffect(() => {
    const controller = new AbortController(); setData(null);
    fetch(`/api/ot-requests?${new URLSearchParams({ employeeId, month })}`, { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      const result = await response.json(); if (!response.ok) throw Error(result.error);
      if (controller.signal.aborted) return;
      setData(result);
      if (!version) { const row = result.requests.find((r: Entry) => r.date === date); if (row) { setBefore(row.before_hours); setAfter(row.after_hours); setReason(row.reason); } }
    }).catch((e) => { if (e.name !== "AbortError") setError(e.message); });
    return () => controller.abort();
  }, [employeeId, month, date, version]);
  useEffect(() => { if (data) firstInput.current?.focus(); }, [data]);
  const plan = data?.plans.find((s) => s.date === date), existing = data?.requests.find((r) => r.date === date);
  const editable = !!plan && !nonWorkingCodes.has(normalizeDayCode(plan.shift_code)) && (!existing || existing.status === "pending");
  const valid = (value: string) => value !== "" && Number.isFinite(Number(value)) && (Number(value) === 0 || (Number(value) >= 1 && Number(value) <= 24 && Number.isInteger(Number(value) * 2)));
  const beforeHours = Number(before), afterHours = Number(after), times = plan ? shiftWindow(plan, date) : null;
  const range = (start: number, end: number) => `${isoLocal(start).replace("T", " ")} → ${isoLocal(end).replace("T", " ")}`;
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!data || busy || !editable) return;
    if (!valid(before) || !valid(after) || beforeHours + afterHours < 1 || !reason.trim()) { setError("เลือกวัน ระบุเหตุผล และขอ OT อย่างน้อย 1 ชั่วโมง เพิ่มครั้งละ 0.5 ชั่วโมง"); return; }
    setBusy(true); onBusy(true); setError("");
    try {
      const response = await fetch("/api/ot-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeId, month, dates: [date], beforeHours, afterHours, reason, revision: data.revision }) });
      const result = await response.json();
      if (!response.ok) { if (response.status === 409) setVersion((v) => v + 1); throw Error(result.error); }
      setToast("บันทึกคำขอ OT รออนุมัติแล้ว"); await refresh(); onClose(); anchor.focus();
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกคำขอ OT ไม่สำเร็จ"); } finally { setBusy(false); onBusy(false); }
  }
  return createPortal(<section ref={panel} className="ot-request-popover" role="dialog" aria-labelledby="ot-request-title" style={position}>
    <header><div><h3 id="ot-request-title">{t("ขอ OT")} · {date}</h3><small>{name}</small></div><button type="button" className="button" disabled={busy} aria-label={t("ปิด")} onClick={() => { onClose(); anchor.focus(); }}>×</button></header>
    {!data && !error && <p role="status">{t("กำลังโหลด...")}</p>}
    {data && !editable && <p className="error">{t(!plan || nonWorkingCodes.has(normalizeDayCode(plan.shift_code)) ? "วันที่เลือกไม่มีกะ เป็นวันลา หรือช่วงกะรวม OT เกิน 24 ชั่วโมง" : "คำขอนี้ผ่านการตรวจสอบแล้ว ไม่สามารถแก้ไขได้")}</p>}
    {existing && <p>{t(existing.status === "pending" ? "รออนุมัติ" : existing.status === "approved" ? "อนุมัติแล้ว" : "ไม่อนุมัติ")} · {existing.requested_by}</p>}
    {times && <p>{t("กะ")}: {range(times.start, times.end)}</p>}
    <form onSubmit={submit}><fieldset disabled={busy || !data || !editable}>
      <div className="time-fields">
        <label className="field">{t("OT ก่อนกะ (ชม.)")}<input ref={firstInput} type="number" min="0" max="24" step="0.5" required value={before} onChange={(e) => setBefore(e.target.value)} /></label>
        <label className="field">{t("OT หลังกะ (ชม.)")}<input type="number" min="0" max="24" step="0.5" required value={after} onChange={(e) => setAfter(e.target.value)} /></label>
      </div>
      {times && plan && !nonWorkingCodes.has(normalizeDayCode(plan.shift_code)) && valid(before) && valid(after) && <OTRequestTimeline start={times.start} end={times.end} before={beforeHours} after={afterHours} date={date} />}
      {times && <div className="ot-request-preview">
        {valid(before) && beforeHours > 0 && <p>{t("OT ก่อนกะ")}: {range(times.start - beforeHours * 3600000, times.start)}</p>}
        {valid(after) && afterHours > 0 && <p>{t("OT หลังกะ")}: {range(times.end, times.end + afterHours * 3600000)}</p>}
      </div>}
      <label className="field">{t("เหตุผล / งานที่ให้ทำ")}<textarea required maxLength={1000} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      {beforeHours + afterHours >= 3 && <small className="error">{t("OT ตั้งแต่ 3 ชั่วโมงขึ้นไป กรุณาตรวจสอบภาระงานก่อนส่งคำขอ")}</small>}
      <small>{t("คำขอไม่ยืนยัน OT จริงและไม่เปลี่ยนยอดเงินเดือน")}</small>
      <button type="submit" className="button ot-request-toggle">{t(busy ? "กำลังบันทึก..." : "ส่งคำขอ OT")}</button>
    </fieldset></form>
    {error && <p className="error" role="alert">{t(error)}</p>}
  </section>, document.body);
}
