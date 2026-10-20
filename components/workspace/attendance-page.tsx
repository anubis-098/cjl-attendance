"use client";
import { useTranslation } from "@/lib/i18n";
import DayRemark from "./day-remark";
import Link from "next/link";
import { employeeCalendarHref } from "@/lib/employee-calendar";
import { downloadCSV } from "@/lib/csv";
import {
  OT_RATES,
  Shift,
  clock,
  holidayLabels,
  isoLocal,
  keyOf,
} from "@/lib/engine";
import {
  approveShifts,
  addDays,
  canApprove,
  matchesStatus,
  labels,
  number,
  toggle,
} from "@/lib/workspace";
import {
  ArrowDownToLine,
  CalendarDays,
  Check,
  CheckCheck,
  Fingerprint,
  Search,
  Upload,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Filters, { ViewMode } from "./filters";
import StatusFilter from "./status-filter";
import Pagination from "./pagination";
import OTInvestigate from "./ot-investigate";
import { useShiftPreview } from "./shift-preview";
import SummaryCards from "./summary-cards";
import { scannedEmployees, scheduledEmployeeCount } from "@/lib/attendance-summary";
import { useAttendance } from "./use-attendance";
import { useCalendarClock } from "./use-calendar-clock";
import { layoutShifts } from "@/lib/calendar-layout";
import { dayCodeLabels } from "@/lib/day-codes";
import ActualCard, { ActualCalendarLegend } from "./actual-card";
import EvidenceMarker from "./evidence-marker";
import {
  actualMatchesResult,
  actualCardStatus,
  type ActualInterval,
} from "@/lib/actual-timeline";
const ReviewDrawer = dynamic(() => import("./review-drawer"));
const ImportModal = dynamic(() => import("./import-modal"));
export default function AttendancePage() {
  const { t, getLocale } = useTranslation();
  const now = useCalendarClock();
  const preview = useShiftPreview();
  const model = useAttendance();
  const [activeActual, setActiveActual] = useState<ActualInterval>();
  const { actualTimeline } = model;
  const {
    data,
    setData,
    setToast,
    globalEmployeeSearch,
    setGlobalEmployeeSearch,
    filters,
    filtered,
    results,
    start,
    days,
    shiftsByEmployee,
    carryIn,
  } = model;
  const [status, setStatus] = useState("all"),
    [selected, setSelected] = useState<string[]>([]),
    [selectedDays, setSelectedDays] = useState<string[]>([]),
    [active, setActive] = useState<Shift | null>(null),
    [importOpen, setImportOpen] = useState(false),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(25);
  const closeReview = useCallback(() => setActive(null), []),
    closeImport = useCallback(() => setImportOpen(false), []);
  const today = isoLocal(now).slice(0, 10);
  const presence = useMemo(() => {
    const dates = selectedDays.length ? [...selectedDays].sort() : [today];
    const shifts = data.shifts.filter(s =>
      (filters.agency === "all" || s.agency === filters.agency) &&
      (filters.department === "all" || s.department === filters.department) &&
      (filters.workerType === "all" || (s.worker_type || "unknown") === filters.workerType) &&
      (filters.shift === "all" || s.shift_code === filters.shift) &&
      (s.emp_name + " " + s.emp_id).toLowerCase().includes(filters.search.toLowerCase()) &&
      (!globalEmployeeSearch.trim() || `${s.emp_id} ${s.emp_name} ${s.agency}`.toLowerCase().includes(globalEmployeeSearch.trim().toLowerCase())));
    return { dates, today: selectedDays.length === 0, count: scannedEmployees(shifts, data.punches, dates), scheduledCount: scheduledEmployeeCount(shifts, today), scheduledDate: today };
  }, [data.shifts, data.punches, selectedDays, today, filters, globalEmployeeSearch]);
  useEffect(() => {
    setSelected([]);
    setSelectedDays([]);
    setPage(1);
  }, [filters, status]);
  const visible = useMemo(
    () =>
      filtered.filter((s) => {
        const r = results.get(keyOf(s))!;
        const periods = actualTimeline.get(keyOf(s));
        if (periods?.length) {
          if (status === "MISSING") return periods.some(a => a.estimated);
          if (status === "issues" && !actualMatchesResult(periods, r)) return true;
          if (status === "pending" && !actualMatchesResult(periods, r)) return true;
          if (["approved", "APPROVED"].includes(status) && !actualMatchesResult(periods, r)) return false;
        }
        return matchesStatus(r, status);
      }),
    [filtered, results, status, actualTimeline],
  );
  const calendarVisible = useMemo(
    () => [
      ...visible,
      ...carryIn.filter((s) => matchesStatus(results.get(keyOf(s))!, status)),
    ],
    [visible, carryIn, results, status],
  );
  const eventsByEmployee = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of calendarVisible) {
      const list = map.get(s.emp_id) || [];
      list.push(s);
      map.set(s.emp_id, list);
    }
    return map;
  }, [calendarVisible]);
  const allEmployees = useMemo(
    () => [...new Map(calendarVisible.map((s) => [s.emp_id, s])).values()],
    [calendarVisible],
  );
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(allEmployees.length / pageSize)),
  );
  const employees = allEmployees.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const chosen = visible.filter(
    (s) => selected.includes(s.emp_id) || selectedDays.includes(s.date),
  );
  function open(s: Shift) {
    setActive(s);
  }
  async function approve() {
    const eligible = chosen.filter(
      (s) =>
        canApprove(results.get(keyOf(s))!) &&
        actualMatchesResult(
          actualTimeline.get(keyOf(s)),
          results.get(keyOf(s))!,
        ),
    );
    if (!eligible.length) {
      setToast("ไม่มีรายการที่อนุมัติได้ กรุณาตรวจสอบข้อมูลก่อน");
      return;
    }
    if (!(await setData((prev) => approveShifts(prev, eligible)))) return;
    setSelected([]);
    setSelectedDays([]);
    setToast("อนุมัติ " + eligible.length + " รายการแล้ว");
  }
  function exportData() {
    // `visible` is derived from the current date range, employee filters, and status filter.
    const rowsToExport = visible;
    downloadCSV("attendance-" + start + "-to-" + days.at(-1) + ".csv", [
      [
        "Employee ID",
        "Name",
        "Date",
        "Shift-in",
        "Shift-out",
        "In",
        "Out",
        "Actual hour",
        "Actual Total OT",
        ...OT_RATES.map((rate) => `OT x${rate} (actual hours)`),
        "Status",
        "Approved",
      ],
      ...rowsToExport.map((s) => {
        const r = results.get(keyOf(s))!;
        return [
          s.emp_id,
          s.emp_name,
          s.date,
          s.shift_start,
          s.shift_end,
          r.inMs === undefined ? "" : isoLocal(r.inMs).slice(11, 16),
          r.outMs === undefined ? "" : isoLocal(r.outMs).slice(11, 16),
          r.missing ? "" : number(r.normal + r.actualOT),
          number(r.actualOT),
          ...OT_RATES.map((rate) => number(r.rawOT[rate])),
          r.status,
          r.approved,
        ];
      }),
    ]);
    setToast("ส่งออกรายงาน CSV แล้ว");
  }
  return (
    <>
      {t(preview.popup)}
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t("TIME & ATTENDANCE")}</div>
          <h1>{t("ภาพรวมเวลาทำงาน")}</h1>
          <p>
            {t("จัดการเวลาทำงาน กระทบยอด OT และรับรองข้อมูลพนักงาน Agency")}
          </p>
        </div>
        <div className="heading-actions">
          <button className="button" onClick={exportData}>
            <ArrowDownToLine size={15} />
            {t("ส่งออกรายงาน")}
          </button>
          <button
            className="button primary"
            onClick={() => setImportOpen(true)}
          >
            <Upload size={15} />
            {t("นำเข้าข้อมูล")}
          </button>
        </div>
      </div>
      <SummaryCards model={model} presence={presence} />
      <ActualCalendarLegend />
      {data.importReport && (
        <p className="import-warning">
          {t("ข้อมูล CJ ช่วง ")}
          {t(data.importReport.summary.from)}
          {t(" –")}
          {t(" ")}
          {t(data.importReport.summary.to)}
          {t(" · แสดงเฉพาะกะที่จับคู่ได้ · ดาวน์โหลดข้อสังเกต ")}
          {t(data.importReport.issues.length)}
          {t(" รายการได้ที่ “นำเข้าข้อมูล”")}
        </p>
      )}
      <section className="panel">
        <div className="calendar-toolbar">
          <div className="section-title">
            <CalendarDays size={18} />
            <h2>{t("ตารางเวลาพนักงาน")}</h2>
            <span className="count-pill">
              {t(allEmployees.length)}
              {t(" คน")}
            </span>
          </div>
          <ViewMode model={model} />
        </div>
        <Filters
          model={model}
          showView={false}
          onClearFilters={() => {
            setGlobalEmployeeSearch("");
            model.setFilters({
              date: today,
              view: "week",
              search: "",
              agency: "all",
              department: "all",
              workerType: "all",
              shift: "all",
            });
            setStatus("all");
          }}
        >
          <StatusFilter value={status} onChange={setStatus} />
          <button
            className="button approve"
            disabled={!chosen.length}
            onClick={approve}
          >
            <CheckCheck size={15} />
            {t("ยืนยันที่เลือก ")}
            {t(chosen.length > 0 && "(" + chosen.length + ")")}
          </button>
        </Filters>
        {t(" ")}
        <div className="table-scroll">
          <table className="calendar">
            <thead>
              <tr>
                <th className="employee-column">
                  <div className="employee-th">
                    <input
                      aria-label={t("เลือกพนักงานทั้งหมด")}
                      type="checkbox"
                      checked={
                        employees.length > 0 &&
                        employees.every((e) => selected.includes(e.emp_id))
                      }
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? employees.map((e) => e.emp_id)
                            : [],
                        )
                      }
                    />
                    <span>
                      {t("พนักงาน ")}
                      <small>{t("EMPLOYEE / TOTAL HOURS")}</small>
                    </span>
                  </div>
                </th>
                {days.map((d) => (
                  <th
                    key={d}
                    className={
                      d === isoLocal(Date.now()).slice(0, 10)
                        ? "highlight-day"
                        : ""
                    }
                  >
                    <label>
                      <input
                        aria-label={t(`เลือกวันที่ ${d}`)}
                        type="checkbox"
                        checked={selectedDays.includes(d)}
                        onChange={() =>
                          setSelectedDays(toggle(selectedDays, d))
                        }
                      />
                      <span>
                        {t(
                          new Date(d).toLocaleDateString(getLocale(), {
                            weekday: "short",
                          }),
                        )}
                        {t(" ")}
                        <b>{t(Number(d.slice(-2)))}</b>
                      </span>
                    </label>
                    <DayRemark date={d} />
                    <div className="day-hour-scale" aria-hidden="true">
                      {["00", "06", "12", "18"].map((hour) => (
                        <span key={hour}>{t(hour)}</span>
                      ))}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee, i) => {
                const shifts = shiftsByEmployee.get(employee.emp_id) || [];
                const hours = shifts.reduce(
                  (v, s) => v + results.get(keyOf(s))!.normal,
                  0,
                );
                const events = layoutShifts(
                  eventsByEmployee.get(employee.emp_id) || [],
                  days,
                  results,
                  now,
                  actualTimeline,
                );
                const laneCount = Math.max(
                  1,
                  ...events.map((event) => event.lane + 1),
                );
                return (
                  <tr key={employee.emp_id}>
                    <td className="employee-column">
                      <div className="employee-cell">
                        <input
                          aria-label={`${t("เลือก")} ${employee.emp_name}`}
                          type="checkbox"
                          checked={selected.includes(employee.emp_id)}
                          onChange={() =>
                            setSelected(toggle(selected, employee.emp_id))
                          }
                        />
                        <div className={`employee-avatar tone-${i % 4}`}>
                          {employee.emp_name.slice(0, 1)}
                        </div>
                        <div className="employee-info">
                          <Link
                            className="employee-calendar-link"
                            prefetch={false}
                            href={employeeCalendarHref(
                              employee.emp_id,
                              filters.date,
                              employee.emp_name,
                            )}
                          >
                            {employee.emp_name}
                          </Link>
                          <span>
                            {t(employee.emp_id)} <i>{t("·")}</i>{" "}
                            {employee.agency}
                          </span>
                          <small>
                            {employee.department}
                            {t(" ")}
                            <strong>
                              {t(number(hours))}
                              {t(" ชม.")}
                            </strong>
                          </small>
                        </div>
                      </div>
                    </td>
                    <td colSpan={days.length} className="schedule-grid-cell">
                      <div
                        className="schedule-grid"
                        style={{
                          gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
                          gridTemplateRows: `repeat(${laneCount}, minmax(82px, auto))`,
                        }}
                      >
                        {days.map((day, index) => (
                          <div
                            key={day}
                            aria-hidden="true"
                            className="schedule-day-background"
                            style={{ gridColumn: index + 1, gridRow: "1 / -1" }}
                          />
                        ))}
                        {events.map((event) => {
                          const {
                            shift: s,
                            result: r,
                            first,
                            last,
                            lane,
                            left,
                            right,
                            allDay,
                            endDate,
                            continuesBefore,
                            continuesAfter,
                          } = event;
                          const overnight = endDate > s.date;
                          const plannedEndDate =
                            s.shift_end <= s.shift_start
                              ? addDays(s.date, 1)
                              : s.date;
                          return (
                            <div
                              key={event.id}
                              className={`schedule-event ${event.actual?.estimated && event.start === event.end ? "scan-marker" : ""} ${!allDay ? "timed-event" : ""} ${overnight ? "overnight-event" : ""} ${continuesBefore ? "continues-before" : ""} ${continuesAfter ? "continues-after" : ""}`}
                              style={{
                                gridColumn: `${first + 1} / ${last + 2}`,
                                gridRow: lane + 1,
                                marginLeft: `${left}%`,
                                marginRight: `${right}%`,
                              }}
                              data-shift-key={keyOf(s)}
                            >
                              {r.off && !event.actual ? (
                                <div className="off-cell">
                                  {t(s.shift_code)}
                                  <span>{t(holidayLabels[s.shift_code])}</span>
                                </div>
                              ) : (
                                <button
                                  className={`attendance-card ${event.actual ? "actual-card" : ""} status-${event.actual ? actualCardStatus(event.actual, s, data.reviews[keyOf(s)]?.deductOTBreak, r.approved && actualMatchesResult(actualTimeline.get(keyOf(s)), r)) : event.plannedOnly ? "planned" : event.pending ? "pending" : r.status.toLowerCase()} ${r.approved && actualMatchesResult(actualTimeline.get(keyOf(s)), r) ? "verified" : ""}`}
                                  aria-label={`${s.emp_name} ${event.actual && event.actual.inMs === undefined ? "--:--" : isoLocal(event.actual?.inMs ?? event.start)} - ${event.actual && event.actual.outMs === undefined ? "--:--" : isoLocal(event.actual?.outMs ?? event.end)} ${event.actual ? "Actual" : "Master"}`}
                                  {...preview.bind(
                                    s,
                                    r,
                                    event.pending,
                                    event.actual,
                                  )}
                                  onClick={() => {
                                    preview.close();
                                    setActiveActual(event.actual);
                                    open(s);
                                  }}
                                >
                                  <EvidenceMarker count={data.evidenceImageCounts?.[keyOf(s)]}/>
                                  {event.actual ? (
                                    <ActualCard
                                      actual={event.actual}
                                      shift={s}
                                      deductOTBreak={data.reviews[keyOf(s)]?.deductOTBreak}
                                      approved={
                                        r.approved &&
                                        actualMatchesResult(
                                          actualTimeline.get(keyOf(s)),
                                          r,
                                        )
                                      }
                                    />
                                  ) : (
                                    <>
                                      <OTInvestigate hours={r.monitoredOT} />
                                      {r.missing && !event.pending && (
                                        <span
                                          className="missing-check"
                                          role="img"
                                          aria-label={t("สแกนไม่ครบ")}
                                          title={t("สแกนไม่ครบ")}
                                        >
                                          {t("!")}
                                        </span>
                                      )}
                                      {r.approved && (
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
                                      {!allDay && (
                                        <span
                                          className="compact-shift-time"
                                          aria-hidden="true"
                                        >
                                          <b>
                                            {t(
                                              continuesBefore
                                                ? "←"
                                                : s.shift_start,
                                            )}
                                          </b>
                                          <b>
                                            {t(
                                              continuesAfter
                                                ? "→"
                                                : s.shift_end,
                                            )}
                                          </b>
                                          <small>{t(s.shift_code)}</small>
                                        </span>
                                      )}
                                      {(continuesBefore || continuesAfter) && (
                                        <span className="calendar-continuation">
                                          {t(
                                            continuesBefore
                                              ? "← ต่อจากช่วงก่อนหน้า"
                                              : "ต่อไปช่วงถัดไป →",
                                          )}
                                        </span>
                                      )}
                                      <span className="card-plan">
                                        <b>
                                          {t(
                                            overnight
                                              ? `${s.date.slice(8)}/${s.date.slice(5, 7)} ${s.shift_start} → ${plannedEndDate.slice(8)}/${plannedEndDate.slice(5, 7)} ${s.shift_end}`
                                              : `${s.shift_start} – ${s.shift_end}`,
                                          )}
                                        </b>
                                        <span>
                                          {r.approved ? (
                                            <Check size={12} />
                                          ) : (
                                            s.shift_code
                                          )}
                                        </span>
                                      </span>
                                      <span className="card-punch">
                                        <Fingerprint size={11} />
                                        {t(
                                          overnight && r.inMs !== undefined
                                            ? `${isoLocal(r.inMs).slice(8, 10)}/${isoLocal(r.inMs).slice(5, 7)} `
                                            : "",
                                        )}
                                        {t(clock(r.inMs))}
                                        {t(" –")}
                                        {t(" ")}
                                        {t(
                                          overnight && r.outMs !== undefined
                                            ? `${isoLocal(r.outMs).slice(8, 10)}/${isoLocal(r.outMs).slice(5, 7)} `
                                            : "",
                                        )}
                                        {t(clock(r.outMs))}
                                      </span>
                                      {r.holiday && (
                                        <span className="holiday-code">
                                          {t(s.shift_code)}
                                          {t(" ·")}
                                          {t(" ")}
                                          {t(
                                            dayCodeLabels[s.shift_code] ||
                                              holidayLabels[s.shift_code],
                                          )}
                                        </span>
                                      )}
                                      <span className="rate-pills">
                                        {OT_RATES.filter(
                                          (rate) => r.rawOT[rate] > 0,
                                        ).map((rate) => (
                                          <span key={rate}>
                                            {t("x")}
                                            {t(rate)}
                                            {t(" · ")}
                                            {t(number(r.rawOT[rate]))}
                                            {t(" ชม.")}
                                          </span>
                                        ))}
                                        {r.ratePending && (
                                          <span>{t("รอยืนยันอัตรา")}</span>
                                        )}
                                      </span>
                                      <span className="card-bottom">
                                        {r.highOT && (
                                          <span
                                            className="micro late"
                                            title={t(
                                              r.overBudgetApproved
                                                ? "ยืนยันโอทีแล้ว"
                                                : "ชั่วโมง OT x1.5 + x3.0 ตั้งแต่ 5 ชม.",
                                            )}
                                          >
                                            {t("OT สูงเกินเป้า ")}
                                            {t(number(r.monitoredOT))}
                                            {t("h")}
                                          </span>
                                        )}
                                        {r.missing ? (
                                          <span className="micro missing">
                                            {t(
                                              r.inMs === undefined
                                                ? "IN? "
                                                : "",
                                            )}
                                            {t(
                                              r.outMs === undefined
                                                ? "OUT?"
                                                : "",
                                            )}
                                          </span>
                                        ) : r.nonWorking ? (
                                          <span className="micro late">
                                            {t(
                                              r.scheduleConflict
                                                ? "พบสแกน: ตรวจสอบวันลา / ขาดงาน"
                                                : dayCodeLabels[s.shift_code],
                                            )}
                                          </span>
                                        ) : r.punchedOT > 0 ? (
                                          <span className="micro ot">
                                            {t(
                                              r.approved
                                                ? labels.APPROVED
                                                : labels.UNAPPROVED,
                                            )}
                                            {t(" ")}
                                            {t(number(r.punchedOT))}
                                            {t("h")}
                                          </span>
                                        ) : (
                                          <span className="normal-label">
                                            {t(
                                              r.status === "UNAPPROVED"
                                                ? "OT รอพิจารณา"
                                                : "เวลาปกติ",
                                            )}
                                          </span>
                                        )}
                                        {data.reviews[keyOf(s)]?.inTime && (
                                          <span title={t("มีการตรวจสอบเวลา")}>
                                            {t("↗")}
                                          </span>
                                        )}
                                        {r.approved && (
                                          <span className="approved-label">
                                            {t("ยืนยันแล้ว")}
                                          </span>
                                        )}
                                      </span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!employees.length && (
            <div className="empty">
              <Search size={28} />
              <h3>{t("ไม่พบข้อมูลในช่วงเวลานี้")}</h3>
              <p>{t("ลองเปลี่ยนวันที่ ตัวกรอง หรือนำเข้าข้อมูลเพิ่มเติม")}</p>
            </div>
          )}
        </div>
        <div className="table-footer">
          <span className="calendar-continuation">
            {t(
              "1 ช่อง = 24 ชั่วโมง · แถบกะต่อเนื่องตามเวลา · ยอดชั่วโมงและส่งออกยึดวันเริ่มกะ",
            )}
          </span>
          <ActualCalendarLegend compact />
          <span>{t("คลิกที่กะเพื่อดูรายละเอียดและตรวจสอบ")}</span>
        </div>
        <Pagination
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
            setSelected([]);
            setSelectedDays([]);
          }}
          page={currentPage}
          total={allEmployees.length}
          onChange={setPage}
        />
      </section>
      {active && (
        <ReviewDrawer
          key={keyOf(active)}
          active={active}
          actual={activeActual}
          onClose={closeReview}
        />
      )}
      {t(" ")}
      {importOpen && <ImportModal onClose={closeImport} />}
    </>
  );
}
