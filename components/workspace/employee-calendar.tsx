"use client";
import { useTranslation } from "@/lib/i18n";
import { editableDayCodes, leaveCodes, dayCodeLabels } from "@/lib/day-codes";
import { Check } from "lucide-react";
import EmployeePayrollSettings from "./employee-payroll-settings";
import { useAccount } from "../auth-provider";
import { canManageAttendance } from "@/lib/permissions";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWorkspace } from "./provider";
import OTInvestigate from "./ot-investigate";
import { useShiftPreview } from "./shift-preview";
import {
  clock,
  holidayLabels as baseHolidayLabels,
  isoLocal,
  keyOf,
  reconcile,
  type Shift,
} from "@/lib/engine";
import { normalizeDayCode } from "@/lib/day-codes";
import {
  addDays,
  approveShifts,
  canApprove,
  labels,
  number,
  toggle,
} from "@/lib/workspace";
import { useCalendarClock } from "./use-calendar-clock";
import { layoutShifts } from "@/lib/calendar-layout";
import {
  buildActualTimeline,
  actualMatchesResult,
  actualCardStatus,
  type ActualInterval,
} from "@/lib/actual-timeline";
import ActualCard, { ActualCalendarLegend } from "./actual-card";
import EvidenceMarker from "./evidence-marker";
const ReviewDrawer = dynamic(() => import("./review-drawer"));
const ShiftEditor = dynamic(() => import("./shift-editor"));
const ManualScanPairing = dynamic(() => import("./manual-scan-pairing"), { ssr: false });
const CompanyHolidayModal = dynamic(() => import("./company-holiday-modal"));
const OTRequestModal = dynamic(() => import("./ot-request-popover"), {
  ssr: false,
});
import type { ShiftOverride } from "@/lib/shift-overrides";

const holidayLabels = {
  ...baseHolidayLabels,
  ...Object.fromEntries(leaveCodes.map((code) => [code, dayCodeLabels[code]])),
};
export default function EmployeeCalendar({
  employeeId,
  initialMonth,
  name,
}: {
  employeeId: string;
  initialMonth?: string;
  name?: string;
}) {
  const { t, getLocale } = useTranslation();
  const now = useCalendarClock();
  const canEdit = canManageAttendance(useAccount().role);
  const preview = useShiftPreview();
  const {
    data,
    filters,
    punchesByEmployee,
    setData,
    setToast,
    saveHolidays,
    saveShifts,
  } = useWorkspace();
  const [month, setMonth] = useState(
    /^\d{4}-(0[1-9]|1[0-2])$/.test(initialMonth || "")
      ? initialMonth!
      : filters.date.slice(0, 7),
  );
  const [active, setActive] = useState<Shift | null>(null);
  const [activeActual, setActiveActual] = useState<ActualInterval>();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [holidayMode, setHolidayMode] = useState(false);
  const [shiftMode, setShiftMode] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [holidayDates, setHolidayDates] = useState<string[]>([]);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestDay, setRequestDay] = useState<{
    date: string;
    anchor: HTMLElement;
  } | null>(null);
  const closeRequest = useCallback(() => setRequestDay(null), []);
  const closeCompany = useCallback(() => setCompanyOpen(false), []);
  const [holidayCode, setHolidayCode] = useState("H");
  const savingRef = useRef(false);
  useEffect(() => {
    if (selecting || holidayMode || shiftMode || requestOpen) setManualMode(false);
  }, [selecting, holidayMode, shiftMode, requestOpen]);
  useEffect(() => {
    setCompanyOpen(false);
    setRequestOpen(false);
    setRequestDay(null);
    setSelected([]);
    setSelecting(false);
    setHolidayMode(false);
    setShiftMode(false);
    setHolidayDates([]);
    setManualMode(false);
  }, [month, employeeId]);
  const close = useCallback(() => setActive(null), []);
  const first = `${month}-01`;
  const dayCount = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5)),
    0,
  ).getDate();
  const gridStart = addDays(first, -((new Date(first).getUTCDay() + 6) % 7));
  const cellCount =
    Math.ceil((dayCount + ((new Date(first).getUTCDay() + 6) % 7)) / 7) * 7;
  const days = Array.from({ length: cellCount }, (_, i) =>
    addDays(gridStart, i),
  );
  const employeeShifts = useMemo(
    () => data.shifts.filter((s) => s.emp_id === employeeId),
    [data.shifts, employeeId],
  );
  const employee = employeeShifts[0];
  const actualTimeline = useMemo(
    () => buildActualTimeline(employeeShifts, punchesByEmployee, data.reviews),
    [employeeShifts, punchesByEmployee, data.reviews],
  );
  const candidates = useMemo(
    () =>
      employeeShifts.filter(
        (s) =>
          s.date >= addDays(gridStart, -2) &&
          s.date <= addDays(gridStart, cellCount),
      ),
    [employeeShifts, gridStart, cellCount],
  );
  const results = useMemo(
    () =>
      new Map(
        candidates.map((s) => [
          keyOf(s),
          reconcile(
            s,
            punchesByEmployee.get(s.device_emp_id) || [],
            data.reviews[keyOf(s)],
          ),
        ]),
      ),
    [candidates, punchesByEmployee, data.reviews],
  );
  const shiftsByDate = new Map(candidates.map((s) => [s.date, s]));
  const monthly = candidates
    .filter((s) => s.date.startsWith(month))
    .map((s) => results.get(keyOf(s))!);
  const eligible = candidates.filter(
    (s) =>
      s.date.startsWith(month) &&
      canApprove(results.get(keyOf(s))!) &&
      actualMatchesResult(actualTimeline.get(keyOf(s)), results.get(keyOf(s))!),
  );
  const eligibleKeys = new Set(eligible.map(keyOf));
  const chosen = eligible.filter((s) => selected.includes(keyOf(s)));
  async function confirmSelected() {
    if (savingRef.current || !chosen.length) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (!(await setData((prev) => approveShifts(prev, chosen)))) return;
      setToast(`ยืนยัน ${chosen.length} รายการแล้ว`);
      setSelected([]);
      setSelecting(false);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  function moveMonth(delta: number) {
    const d = new Date(`${first}T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + delta);
    setMonth(d.toISOString().slice(0, 7));
  }
  async function confirmHolidays() {
    if (savingRef.current || !holidayDates.length) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (
        !(await saveHolidays(
          employeeId,
          holidayDates,
          holidayCode === "RESET" ? null : holidayCode,
        ))
      )
        return;
      setToast(`บันทึกวันหยุด ${holidayDates.length} วันแล้ว`);
      setHolidayDates([]);
      setHolidayMode(false);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  async function confirmShifts(
    change: Omit<ShiftOverride, "reason"> | null,
    reason: string,
  ) {
    if (savingRef.current || !holidayDates.length) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (!(await saveShifts(employeeId, holidayDates, change, reason))) return;
      setToast(`บันทึกกะ ${holidayDates.length} วันแล้ว`);
      setHolidayDates([]);
      setShiftMode(false);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  return (
    <>
      {companyOpen && (
        <CompanyHolidayModal month={month} onClose={closeCompany} />
      )}
      {t(preview.popup)}
      <div className="page-heading">
        <div>
          <Link href="/attendance" className="employee-calendar-link">
            {t("← กลับตารางเวลาพนักงาน")}
          </Link>
          <h1>{employee?.emp_name || name || employeeId}</h1>
          <p>
            {employeeId}
            {employee ? ` · ${employee.department} · ${employee.agency}` : ""}
            {t(" · ปฏิทินรายเดือน")}
          </p>
        </div>
      </div>
      <section
        className={`panel employee-month-panel ${requestOpen ? "request-mode" : ""}`}
      >
        {requestOpen && requestDay && (
          <OTRequestModal
            key={requestDay.date}
            employeeId={employeeId}
            name={employee?.emp_name || name || employeeId}
            month={month}
            date={requestDay.date}
            anchor={requestDay.anchor}
            onBusy={setSaving}
            onClose={closeRequest}
          />
        )}
        {canEdit && <EmployeePayrollSettings employeeId={employeeId} month={month} />}
        <div className="month-controls">
          <button
            className="button"
            aria-label={t("เดือนก่อนหน้า")}
            disabled={saving}
            onClick={() => moveMonth(-1)}
          >
            {t("←")}
          </button>
          <h2>
            {t(
              new Date(`${first}T12:00:00Z`).toLocaleDateString(getLocale(), {
                month: "long",
                year: "numeric",
                timeZone: "Asia/Bangkok",
              }),
            )}
          </h2>
          <button
            className="button"
            aria-label={t("เดือนถัดไป")}
            disabled={saving}
            onClick={() => moveMonth(1)}
          >
            {t("→")}
          </button>
          <input
            aria-label={t("เลือกเดือน")}
            type="month"
            disabled={saving}
            data-filter-active={Boolean(month)}
            value={month}
            onChange={(e) => {
              if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value))
                setMonth(e.target.value);
            }}
          />
          <button
            className="button"
            onClick={() => setMonth(isoLocal(Date.now()).slice(0, 7))}
            disabled={saving}
          >
            {t("เดือนนี้")}
          </button>
          {canEdit && <><button
            className={`button ${selecting ? "calendar-cancel" : ""}`}
            aria-pressed={selecting}
            disabled={saving}
            onClick={() => {
              setSelecting(!selecting);
              setRequestOpen(false);
              setRequestDay(null);
              setShiftMode(false);
              setSelected([]);
              setHolidayMode(false);
              setHolidayDates([]);
            }}
          >
            {t(selecting ? "ยกเลิกการเลือก" : "เลือกยืนยันเป็นกลุ่ม")}
          </button>
          <button
            className={`button ${holidayMode ? "calendar-cancel" : ""}`}
            disabled={saving}
            aria-pressed={holidayMode}
            onClick={() => {
              setHolidayMode(!holidayMode);
              setRequestOpen(false);
              setRequestDay(null);
              setShiftMode(false);
              setHolidayDates([]);
              setSelecting(false);
              setSelected([]);
            }}
          >
            {t(holidayMode ? "ยกเลิกกำหนดวันหยุด" : "กำหนดวันหยุด")}
          </button>
          <button
            className={`button ${shiftMode ? "calendar-cancel" : ""}`}
            disabled={saving}
            aria-pressed={shiftMode}
            onClick={() => {
              setShiftMode(!shiftMode);
              setRequestOpen(false);
              setRequestDay(null);
              setHolidayMode(false);
              setSelecting(false);
              setSelected([]);
              setHolidayDates([]);
            }}
          >
            {t(shiftMode ? "ยกเลิกเปลี่ยนกะ" : "เปลี่ยนกะ")}
          </button>
          <button className={`button ${manualMode ? "calendar-cancel" : ""}`} disabled={saving || !employee}
            aria-pressed={manualMode} onClick={() => {
              setManualMode(!manualMode); setSelecting(false); setSelected([]); setHolidayMode(false);
              setShiftMode(false); setRequestOpen(false); setRequestDay(null); setHolidayDates([]); preview.close();
            }}>{t(manualMode ? "ยกเลิกจับคู่สแกน" : "จับคู่สแกนเอง")}</button>
          <button
            className="button ot-request-toggle"
            disabled={saving}
            aria-pressed={requestOpen}
            onClick={() => {
              setRequestOpen(!requestOpen);
              setRequestDay(null);
              setSelecting(false);
              setSelected([]);
              setHolidayMode(false);
              setShiftMode(false);
              setHolidayDates([]);
              preview.close();
            }}
          >
            {t(requestOpen ? "เสร็จสิ้นการขอ OT" : "ขอ OT")}
          </button></>}
        </div>
        {requestOpen && (
          <p className="ot-request-instruction">
            {t("คลิกวันที่ในปฏิทินเพื่อกรอกหรือแก้ไขคำขอ OT")}
          </p>
        )}
        {shiftMode && (
          <ShiftEditor
            shifts={data.shifts}
            employee={employee}
            count={holidayDates.length}
            saving={saving}
            onConfirm={confirmShifts}
            onSelectAll={() =>
              setHolidayDates(days.filter((d) => d.startsWith(month)))
            }
            onClear={() => setHolidayDates([])}
          />
        )}
        {holidayMode && (
          <div className="month-bulk-toolbar">
            <p>
              {t(
                "เลือกวันหยุด วันลา หรือขาดงาน · WOP / PL / SL / AB ไม่คิด OT ค่ากะ และเบี้ยเลี้ยง",
              )}
            </p>
            <label>
              {t("รหัสวันหยุด")}
              {t(" ")}
              <select
                aria-label={t("รหัสวันหยุด")}
                disabled={saving}
                value={holidayCode}
                onChange={(e) => {
                  if (e.target.value === "COMPANY_PH") setCompanyOpen(true);
                  else setHolidayCode(e.target.value);
                }}
              >
                <option value="COMPANY_PH">
                  {t("PH · วันหยุดประเพณีองค์กร (ทุกพนักงาน)")}
                </option>
                {editableDayCodes
                  .filter((code) => code !== "PH")
                  .map((code) => (
                    <option key={code} value={code}>
                      {t(code)}
                      {t(" · ")}
                      {t(holidayLabels[code])}
                    </option>
                  ))}
                <option value="RESET">
                  {t("คืนค่าตารางเดิม (ลบวันหยุด / วันลา / ขาดงานที่กำหนดเอง)")}
                </option>
              </select>
            </label>
            <label>
              {t("เลือกตามวัน")}
              {t(" ")}
              <select
                aria-label={t("เลือกวันหยุดประจำสัปดาห์")}
                value=""
                disabled={saving}
                onChange={(e) => {
                  if (e.target.value !== "")
                    setHolidayDates(
                      days.filter(
                        (d) =>
                          d.startsWith(month) &&
                          new Date(d).getUTCDay() === Number(e.target.value),
                      ),
                    );
                }}
              >
                <option value="">{t("เลือกวันในสัปดาห์")}</option>
                {[
                  "อาทิตย์",
                  "จันทร์",
                  "อังคาร",
                  "พุธ",
                  "พฤหัสบดี",
                  "ศุกร์",
                  "เสาร์",
                ].map((label, i) => (
                  <option key={i} value={i}>
                    {t("ทุกวัน")}
                    {t(label)}
                    {t("ในเดือนนี้")}
                  </option>
                ))}
              </select>
            </label>
            <span role="status">
              {t("เลือก ")}
              {t(holidayDates.length)}
              {t(" วัน")}
            </span>
            <button
              className="button calendar-confirm"
              disabled={saving || !holidayDates.length}
              onClick={confirmHolidays}
            >
              {t(
                saving
                  ? "กำลังบันทึก..."
                  : `ยืนยันวันหยุด (${holidayDates.length})`,
              )}
            </button>
            <small>
              {t(
                "คลิกช่องวันที่เพื่อเลือกหรือยกเลิก · ใช้เฉพาะเดือนนี้ · การเปลี่ยนวันหยุดจะเปิดผลรับรองของวันที่เลือกให้ตรวจสอบใหม่",
              )}
            </small>
          </div>
        )}
        {selecting && (
          <div className="month-bulk-toolbar">
            <label>
              <input
                type="checkbox"
                aria-label={t("เลือกกะที่ยืนยันได้ทั้งหมดในเดือนนี้")}
                disabled={saving || !eligible.length}
                checked={
                  eligible.length > 0 && chosen.length === eligible.length
                }
                onChange={(e) =>
                  setSelected(e.target.checked ? eligible.map(keyOf) : [])
                }
              />
              {t(" ")}
              {t("เลือกทั้งหมดในเดือนนี้")}
            </label>
            <span role="status">
              {t("เลือก ")}
              {t(chosen.length)}
              {t(" / ")}
              {t(eligible.length)}
              {t(" รายการที่ยืนยันได้")}
            </span>
            <button
              className="button calendar-confirm"
              disabled={saving || !chosen.length}
              onClick={confirmSelected}
            >
              {t(
                saving ? "กำลังบันทึก..." : `ยืนยันที่เลือก (${chosen.length})`,
              )}
            </button>
            <small>
              {t("เลือกเฉพาะกะที่เริ่มในเดือนนี้ สแกนครบ และยังไม่ได้ยืนยัน")}
            </small>
          </div>
        )}
        <p className="month-summary">
          {t("ชั่วโมงปกติ ")}
          {t(number(monthly.reduce((n, r) => n + r.normal, 0)))}
          {t(" ชม. · OT ยืนยันแล้ว / ทำจริง")}
          {t(" ")}
          {t(
            number(
              monthly.reduce((n, r) => n + (r.approved ? r.actualOT : 0), 0),
            ),
          )}
          {t(" ")}
          {t("/ ")}
          {t(number(monthly.reduce((n, r) => n + r.punchedOT, 0)))}
          {t(" ชม.")}
        </p>
        <ActualCalendarLegend />
        {manualMode && employee ? <ManualScanPairing key={`${employeeId}-${month}`}
          employeeId={employeeId} deviceId={employee.device_emp_id} days={days} month={month}
          onBusy={setSaving} onClose={() => setManualMode(false)} /> : <>
        <div className="employee-month-scroll">
          <div className="employee-month-grid">
            <div className="month-weekdays">
              {[
                "จันทร์",
                "อังคาร",
                "พุธ",
                "พฤหัสบดี",
                "ศุกร์",
                "เสาร์",
                "อาทิตย์",
              ].map((d) => (
                <b key={d}>{t(d)}</b>
              ))}
            </div>
            {Array.from({ length: cellCount / 7 }, (_, week) => {
              const weekDays = days.slice(week * 7, week * 7 + 7);
              const events = layoutShifts(
                candidates,
                weekDays,
                results,
                now,
                actualTimeline,
              );
              const lanes = Math.max(1, ...events.map((e) => e.lane + 1));
              const remarks = (data.calendarRemarks || []).filter(
                (note) =>
                  weekDays.includes(note.date) &&
                  (!note.employeeId || note.employeeId === employeeId),
              );
              return (
                <div
                  className="employee-month-week"
                  key={weekDays[0]}
                  style={{
                    gridTemplateRows: `${remarks.length ? 116 : 64}px repeat(${lanes}, 76px)`,
                  }}
                >
                  {weekDays.map((date, i) => {
                    const shift = shiftsByDate.get(date);
                    const code = shift
                      ? normalizeDayCode(shift.shift_code)
                      : "";
                    const holiday = Object.hasOwn(holidayLabels, code);
                    return (
                      <div
                        key={date}
                        data-calendar-date={date}
                        className={`month-day ${holiday ? (code === "PH" || code === "PH8" ? "company-holiday-solid" : "holiday-striped") : ""} ${!date.startsWith(month) ? "outside-month" : ""} ${(holidayMode || shiftMode) && holidayDates.includes(date) ? "holiday-selected" : ""}`}
                        style={{ gridColumn: i + 1, gridRow: "1 / -1" }}
                      >
                        <span className="month-date">
                          {t(Number(date.slice(-2)))}
                        </span>
                        {holiday && (
                          <span
                            className="holiday-day-code"
                            title={t(holidayLabels[code])}
                          >
                            {t(code)}
                          </span>
                        )}
                        {!shift && <small>{t("ไม่มีข้อมูลกะ")}</small>}
                        {data.shiftOverrides?.[employeeId + "|" + date] && (
                          <small
                            title={
                              data.shiftOverrides[employeeId + "|" + date]
                                .reason
                            }
                          >
                            {t("เปลี่ยนกะ")}
                          </small>
                        )}
                        {remarks
                          .filter((note) => note.date === date)
                          .map((note) => (
                            <div
                              key={note.employeeId || "global"}
                              className="calendar-remark-label"
                              title={`${t(note.employeeId ? "เฉพาะคน" : "ทุกคน")}: ${note.text}`}
                            >
                              {t(note.employeeId ? "เฉพาะคน: " : "")}
                              {note.text}
                            </div>
                          ))}
                        {requestOpen && (
                          <button
                            className="holiday-date-picker"
                            aria-label={`${t("เลือกวันขอ OT")} ${date}`}
                            aria-pressed={requestDay?.date === date}
                            disabled={saving || !date.startsWith(month)}
                            onClick={(event) =>
                              setRequestDay({
                                date,
                                anchor: event.currentTarget,
                              })
                            }
                          >
                            <span aria-hidden="true">+</span>
                          </button>
                        )}
                        {(holidayMode || shiftMode) && (
                          <button
                            className="holiday-date-picker"
                            aria-label={t(
                              `${shiftMode ? "เลือกวันเปลี่ยนกะ" : "เลือกวันหยุด"} ${date}`,
                            )}
                            aria-pressed={holidayDates.includes(date)}
                            disabled={saving || !date.startsWith(month)}
                            onClick={() =>
                              setHolidayDates((prev) => toggle(prev, date))
                            }
                          >
                            <span aria-hidden="true">
                              {t(holidayDates.includes(date) ? "✓" : "+")}
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {events.map((e) => (
                    <div
                      key={e.id}
                      className={`month-shift ${e.actual?.estimated && e.start === e.end ? "scan-marker" : ""} status-${e.actual ? actualCardStatus(e.actual, e.shift, data.reviews[keyOf(e.shift)]?.deductOTBreak, e.result.approved && actualMatchesResult(actualTimeline.get(keyOf(e.shift)), e.result)) : e.plannedOnly ? "planned" : e.pending ? "pending" : e.result.status.toLowerCase()} ${selecting ? "selecting-shift" : ""} ${selecting && selected.includes(keyOf(e.shift)) && eligibleKeys.has(keyOf(e.shift)) ? "selected-shift" : ""}`}
                      style={{
                        gridColumn: `${e.first + 1} / ${e.last + 2}`,
                        gridRow: e.lane + 2,
                        marginLeft: `${e.left}%`,
                        marginRight: `${e.right}%`,
                      }}
                    >
                      <button
                        className={`month-shift-details ${e.actual ? "actual-card" : ""}`}
                        disabled={saving || holidayMode || shiftMode}
                        {...preview.bind(
                          e.shift,
                          e.result,
                          e.pending,
                          e.actual,
                        )}
                        onClick={() => {
                          preview.close();
                          setActiveActual(e.actual);
                          if (canEdit) setActive(e.shift);
                        }}
                        aria-label={t(
                          `รายละเอียด ${e.shift.date} ${e.shift.shift_code}`,
                        )}
                      >
                        <EvidenceMarker count={data.evidenceImageCounts?.[keyOf(e.shift)]}/>
                        {e.actual ? (
                          <ActualCard
                            actual={e.actual}
                            shift={e.shift}
                            deductOTBreak={data.reviews[keyOf(e.shift)]?.deductOTBreak}
                            approved={
                              e.result.approved &&
                              actualMatchesResult(
                                actualTimeline.get(keyOf(e.shift)),
                                e.result,
                              )
                            }
                          />
                        ) : (
                          <>
                            <OTInvestigate hours={e.result.monitoredOT} />
                            {e.result.missing && !e.pending && (
                              <span
                                className="missing-check"
                                role="img"
                                aria-label={t("สแกนไม่ครบ")}
                                title={t("สแกนไม่ครบ")}
                              >
                                {t("!")}
                              </span>
                            )}
                            {e.result.approved && (
                              <span
                                className="confirmed-check"
                                role="img"
                                aria-label={t("ยืนยันแล้ว")}
                                title={t("ยืนยันแล้ว")}
                              >
                                <Check
                                  size={12}
                                  strokeWidth={3}
                                  aria-hidden="true"
                                />
                              </span>
                            )}
                            <b>
                              {t(
                                e.allDay
                                  ? normalizeDayCode(e.shift.shift_code)
                                  : `${e.continuesBefore ? "←" : e.shift.shift_start}`,
                              )}
                            </b>
                            <span>
                              {t(
                                e.allDay
                                  ? holidayLabels[
                                      normalizeDayCode(e.shift.shift_code)
                                    ] || labels[e.result.status]
                                  : e.continuesAfter
                                    ? "→"
                                    : e.shift.shift_end,
                              )}
                            </span>
                          </>
                        )}
                      </button>
                      {selecting && (
                        <input
                          className="month-shift-checkbox"
                          type="checkbox"
                          aria-label={t(
                            `เลือกกะ ${e.shift.date} ${e.shift.shift_code}`,
                          )}
                          disabled={saving || !eligibleKeys.has(keyOf(e.shift))}
                          checked={
                            eligibleKeys.has(keyOf(e.shift)) &&
                            selected.includes(keyOf(e.shift))
                          }
                          onChange={() =>
                            setSelected((prev) => toggle(prev, keyOf(e.shift)))
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        <p className="month-summary">
          <span className="holiday-key holiday-striped" />
          H / H8 · {t("วันหยุดประจำสัปดาห์")}
          <span className="holiday-key company-holiday-solid" />
          PH / PH8 · {t("วันหยุดองค์กร")}
        </p>
        </>}
      </section>
      {active && (
        <ReviewDrawer
          key={`${keyOf(active)}-${activeActual?.id}`}
          active={active}
          actual={activeActual}
          onClose={close}
        />
      )}
    </>
  );
}
