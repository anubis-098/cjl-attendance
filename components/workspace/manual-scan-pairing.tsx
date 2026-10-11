"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { Link2, Check, X } from "lucide-react";
import { useWorkspace } from "./provider";
import { useTranslation } from "@/lib/i18n";
import { clock, isoLocal } from "@/lib/engine";
import { punchTime } from "@/lib/shift-window";
import { applyManualPairs, type ScanPair } from "@/lib/manual-pairing";

export default function ManualScanPairing({ employeeId, deviceId, days, month, onClose, onBusy }: {
  employeeId: string; deviceId: string; days: string[]; month: string; onClose: () => void; onBusy: (busy: boolean) => void;
}) {
  const { t } = useTranslation();
  const { data, punchesByEmployee, saveScanPairs, setToast } = useWorkspace();
  const [pairs, setPairs] = useState<ScanPair[]>([]);
  const [start, setStart] = useState<number>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<number, HTMLButtonElement>());
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);
  const scans = [...new Set((punchesByEmployee.get(deviceId) || []).map(p => punchTime(p.punch_timestamp)))]
    .filter(ms => Number.isFinite(ms) && days.includes(isoLocal(ms).slice(0, 10))).sort((a, b) => a - b);
  useLayoutEffect(() => {
    const update = () => {
      const bounds = root.current?.getBoundingClientRect();
      if (!bounds) return;
      setLines(pairs.flatMap(pair => {
        const a = nodes.current.get(pair.inMs)?.getBoundingClientRect();
        const b = nodes.current.get(pair.outMs)?.getBoundingClientRect();
        return a && b ? [{ x1: a.left + a.width / 2 - bounds.left, y1: a.top + a.height / 2 - bounds.top,
          x2: b.left + b.width / 2 - bounds.left, y2: b.top + b.height / 2 - bounds.top }] : [];
      }));
    };
    update();
    const observer = new ResizeObserver(update);
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, [pairs, days.join(",")]);
  function connect(from: number, to: number) {
    if (busy.current) return;
    try {
      const next = [...pairs, { inMs: from, outMs: to }];
      applyManualPairs(data, employeeId, deviceId, next, "preview");
      setPairs(next); setStart(undefined); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ"); }
  }
  async function confirm() {
    if (busy.current || !pairs.length) return;
    busy.current = true; setSaving(true); onBusy(true);
    try {
      if (await saveScanPairs(employeeId, pairs)) {
        setToast("บันทึกการจับคู่แล้ว · ยังไม่ได้ยืนยัน OT");
        onClose();
      }
    } finally { busy.current = false; setSaving(false); onBusy(false); }
  }
  return <div className="manual-pairing">
    <div className="month-bulk-toolbar">
      <Link2 size={18} /><strong>{t("จับคู่สแกนเอง")}</strong>
      <span>{t("ลากจากสแกนเข้าไปยังสแกนออก หรือคลิกสองเวลาเรียงกัน")}</span>
      <button className="button calendar-cancel" disabled={saving} onClick={onClose}>{t("ยกเลิก")}</button>
      <button className="button calendar-confirm" disabled={saving || !pairs.length} onClick={confirm}>
        <Check size={16} />{t(saving ? "กำลังบันทึก..." : "ยืนยันจับคู่")} ({pairs.length})
      </button>
    </div>
    <p className="month-summary" role="status">{start !== undefined
      ? `${t("เลือกสแกนออก")} · ${isoLocal(start).replace("T", " ")}`
      : t("เวลาทั้งหมดเป็นสแกนจริง · จับคู่ข้ามวันได้ · การจับคู่ไม่ใช่การยืนยัน OT")}</p>
    {error && <p className="manual-pair-error" role="alert">{t(error)}</p>}
    {!!pairs.length && <div className="manual-pair-list">{pairs.map((pair, i) => <div key={pair.inMs}>
      <b>{i + 1}</b><span>{isoLocal(pair.inMs).replace("T", " ")} → {isoLocal(pair.outMs).replace("T", " ")}</span>
      <button className="button calendar-cancel" aria-label={t("ยกเลิกคู่นี้")} disabled={saving}
        onClick={() => {setPairs(pairs.filter((_, n) => i !== n)); setError("");}}><X size={14} /></button>
    </div>)}</div>}
    <div className="employee-month-scroll"><div className="manual-pair-calendar" ref={root}>
      <svg className="manual-pair-lines" aria-hidden="true">{lines.map((line, i) =>
        <line key={i} {...line} stroke="currentColor" strokeWidth="3" strokeDasharray="6 4" />)}</svg>
      {["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"].map(day => <b className="manual-weekday" key={day}>{t(day)}</b>)}
      {days.map(day => <div key={day} className={`manual-pair-day ${day.startsWith(month) ? "" : "outside-month"}`}>
        <b>{day.slice(8)} / {day.slice(5, 7)}</b>
        {scans.filter(ms => isoLocal(ms).startsWith(day)).map(ms => {
          const index = pairs.findIndex(pair => pair.inMs === ms || pair.outMs === ms);
          return <button key={ms} type="button" data-scan-ms={ms}
            ref={node => {if (node) nodes.current.set(ms, node); else nodes.current.delete(ms);}}
            className={`scan-node ${start === ms ? "scan-node-selected" : ""} ${index >= 0 ? "scan-node-linked" : ""}`}
            disabled={saving || index >= 0} draggable={!saving && index < 0}
            aria-label={`${t("สแกน")} ${isoLocal(ms).replace("T", " ")}`}
            aria-pressed={start === ms}
            onDragStart={event => {setStart(ms); event.dataTransfer.setData("text/plain", String(ms)); event.dataTransfer.effectAllowed = "link";}}
            onDragOver={event => {event.preventDefault(); event.dataTransfer.dropEffect = "link";}}
            onDrop={event => {event.preventDefault(); const from = Number(event.dataTransfer.getData("text/plain")); if (scans.includes(from)) connect(from, ms);}}
            onClick={() => {if (start === undefined) {setStart(ms); setError("");} else if (start === ms) setStart(undefined); else connect(start, ms);}}
          ><i />{clock(ms)}{index >= 0 && <small>#{index + 1} {t(pairs[index].inMs === ms ? "เข้า" : "ออก")}</small>}</button>;
        })}
      </div>)}
    </div></div>
  </div>;
}
