"use client";
import { useTranslation } from "@/lib/i18n";
import Link from "next/link";
import { employeeCalendarHref } from "@/lib/employee-calendar";
import { downloadCSV } from "@/lib/csv";
import { clock, keyOf, OT_RATES, Shift } from "@/lib/engine";
import {
  approveShifts,
  canApprove,
  labels,
  matchesStatus,
  number,
  toggle,
} from "@/lib/workspace";
import { ArrowDownToLine, CheckCheck } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Filters from "./filters";
import StatusFilter from "./status-filter";
import Pagination from "./pagination";
import SummaryCards from "./summary-cards";
import { useAttendance } from "./use-attendance";
const ReviewDrawer = dynamic(() => import("./review-drawer"));
export default function RecordsPage({
  mode,
}: {
  mode: "approvals" | "normal-hours" | "overtime";
}) {
  const { t, getLocale } = useTranslation();
  const model = useAttendance();
  const { filtered, results, setData, setToast, filters, start } = model;
  const [page, setPage] = useState(1),
    [selected, setSelected] = useState<string[]>([]),
    [active, setActive] = useState<Shift | null>(null),
    [status, setStatus] = useState("all");
  const close = useCallback(() => setActive(null), []);
  const titles = {
    approvals: "รายการรออนุมัติ",
    "normal-hours": "ชั่วโมงทำงานปกติ",
    overtime: "รายงาน OT ยืนยันแล้ว / ทำจริง",
  };
  const rows = useMemo(
    () =>
      filtered
        .filter((s) => {
          const r = results.get(keyOf(s))!;
          const included =
            mode === "approvals"
              ? !r.off && !r.absent && !r.approved && (!r.nonWorking || r.scheduleConflict)
              : mode === "normal-hours"
                ? r.normal > 0
                : r.punchedOT > 0;
          return included && matchesStatus(r, status);
        })
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) || a.emp_id.localeCompare(b.emp_id),
        ),
    [filtered, results, mode, status],
  );
  const incompleteDashboard = useMemo(() => {
    if (mode !== "approvals") return null;
    const employees = new Map<string, { key: string; name: string; id: string; department: string; agency: string; shift: string; count: number }>();
    const departments = new Map<string, number>();
    let incompleteCount = 0;
    for (const s of filtered) {
      const r = results.get(keyOf(s));
      if (!r || r.off || r.absent || r.nonWorking) continue;
      const intervals = model.actualTimeline.get(keyOf(s)) || [];
      const incomplete = r.missing || intervals.some((interval) => interval.estimated || interval.uncertain);
      if (!incomplete) continue;
      incompleteCount++;
      departments.set(s.department || t("Unknown department"), (departments.get(s.department || t("Unknown department")) || 0) + 1);
      const key = [s.emp_id, s.department, s.agency, s.shift_start, s.shift_end].join("|");
      const current = employees.get(key) || {
        key, name: s.emp_name, id: s.emp_id, department: s.department || t("Unknown department"),
        agency: s.agency || t("Unknown company"), shift: `${s.shift_start}–${s.shift_end}`, count: 0,
      };
      current.count++;
      employees.set(key, current);
    }
    const employeeRows = [...employees.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 8);
    const departmentRows = [...departments.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 6);
    return { employeeRows, departmentRows, incompleteCount, maxEmployee: Math.max(1, ...employeeRows.map((item) => item.count)), maxDepartment: Math.max(1, ...departmentRows.map((item) => item.count)) };
  }, [filtered, results, model.actualTimeline, mode, t]);
  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [filters, status]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / 25)));
  const displayed = rows.slice((currentPage - 1) * 25, currentPage * 25);
  const eligible = rows.filter(
    (s) => selected.includes(keyOf(s)) && canApprove(results.get(keyOf(s))!),
  );
  async function approve() {
    if (!eligible.length) return;
    if (!(await setData((prev) => approveShifts(prev, eligible)))) return;
    setSelected([]);
    setToast(`อนุมัติ ${eligible.length} รายการแล้ว`);
  }
  function exportRows() {
    downloadCSV(`${mode}-${start}.csv`, [
      [
        "Employee ID",
        "Name",
        "Date",
        "Shift",
        "In",
        "Out",
        "Normal hours",
        "Actual OT",
        "Approved OT",
        ...OT_RATES.map((r) => `Eligible x${r}`),
        "Status",
        "Approved",
      ],
      ...rows.map((s) => {
        const r = results.get(keyOf(s))!;
        return [
          s.emp_id,
          s.emp_name,
          s.date,
          s.shift_code,
          clock(r.inMs),
          clock(r.outMs),
          r.normal,
          r.punchedOT,
          r.approved ? r.actualOT : 0,
          ...OT_RATES.map((rate) => r.otByRate[rate]),
          r.status,
          r.approved,
        ];
      }),
    ]);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {t(
              mode === "approvals" ? "SUPERVISOR REVIEW" : "ATTENDANCE REPORT",
            )}
          </div>
          <h1>{t(titles[mode])}</h1>
          <p>
            {t(
              mode === "approvals"
                ? "ตรวจสอบและอนุมัติรายวัน รายคน หรือรายการที่เลือก"
                : "รายละเอียดตามช่วงเวลาและตัวกรอง · ชั่วโมงแสดงก่อนคูณอัตรา",
            )}
          </p>
        </div>
        <button className="button" onClick={exportRows}>
          <ArrowDownToLine size={16} />
          {t("ส่งออกรายงาน")}
        </button>
      </div>
      <SummaryCards model={model} compact={mode === "approvals"} />
      {incompleteDashboard && (
        <section className="incomplete-dashboard panel" aria-label={t("Incomplete scan dashboard")}>
          <div className="incomplete-dashboard-heading">
            <div>
              <h2>{t("Incomplete scan dashboard")}</h2>
              <p>{t("Ranked for the selected date range and filters")}</p>
            </div>
            <span className="incomplete-total">{t(incompleteDashboard.incompleteCount)} {t("incomplete shifts")}</span>
          </div>
          <div className="incomplete-dashboard-grid">
            <div className="incomplete-bars">
              <h3>{t("Departments with most incomplete scans")}</h3>
              {incompleteDashboard.departmentRows.length ? incompleteDashboard.departmentRows.map((item) => (
                <div className="incomplete-bar-row" key={item.name}>
                  <span className="incomplete-bar-label" title={item.name}>{item.name}</span>
                  <span className="incomplete-bar-track"><span style={{ width: `${Math.max(6, item.count / incompleteDashboard.maxDepartment * 100)}%` }} /></span>
                  <b>{t(item.count)}</b>
                </div>
              )) : <p className="incomplete-empty">{t("No incomplete scans in this period")}</p>}
            </div>
            <div className="incomplete-bars incomplete-employee-bars">
              <h3>{t("Employees with most incomplete scans")}</h3>
              {incompleteDashboard.employeeRows.length ? incompleteDashboard.employeeRows.map((item) => (
                <div className="incomplete-employee-row" key={item.key}>
                  <div className="incomplete-employee-meta">
                    <b>{item.name}</b><small>{item.id} · {item.department} · {item.agency} · {item.shift}</small>
                  </div>
                  <span className="incomplete-bar-track"><span style={{ width: `${Math.max(6, item.count / incompleteDashboard.maxEmployee * 100)}%` }} /></span>
                  <b>{t(item.count)}</b>
                </div>
              )) : <p className="incomplete-empty">{t("No incomplete scans in this period")}</p>}
            </div>
          </div>
        </section>
      )}
      <section className="panel">
        <Filters model={model}>
          <StatusFilter
            value={status}
            onChange={setStatus}
            approvals={mode === "approvals"}
          />
          {mode === "approvals" && (
            <>
              <button
                className="button primary"
                disabled={!eligible.length}
                onClick={approve}
              >
                <CheckCheck size={16} />
                {t("ยืนยันที่เลือก (")}
                {t(eligible.length)}
                {t(")")}
              </button>
            </>
          )}
        </Filters>
        <div className="report-scroll">
          <table className="report-table">
            <thead>
              <tr>
                {mode === "approvals" && (
                  <th>
                    <input
                      aria-label={t("เลือกรายการในหน้านี้")}
                      type="checkbox"
                      checked={
                        displayed.length > 0 &&
                        displayed.every((s) => selected.includes(keyOf(s)))
                      }
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [
                                ...new Set([
                                  ...selected,
                                  ...displayed.map(keyOf),
                                ]),
                              ]
                            : selected.filter(
                                (key) =>
                                  !displayed.some((s) => keyOf(s) === key),
                              ),
                        )
                      }
                    />
                  </th>
                )}
                <th>{t("พนักงาน")}</th>
                <th>{t("วันที่ / กะ")}</th>
                <th>{t("เข้า – ออก")}</th>
                {mode === "normal-hours" ? (
                  <th>{t("ชั่วโมงปกติ")}</th>
                ) : (
                  <>
                    <th>{t("OT ทำจริง (ชม.)")}</th>
                    <th>{t("OT อนุมัติ")}</th>
                  </>
                )}
                {mode === "overtime" &&
                  OT_RATES.map((rate) => (
                    <th key={rate}>
                      {t("x")}
                      {t(rate)}
                      <small>{t("ตามสิทธิ์ (ชม.)")}</small>
                    </th>
                  ))}
                <th>{t("สถานะ")}</th>
                <th>{t("ตรวจสอบ")}</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((s) => {
                const r = results.get(keyOf(s))!;
                return (
                  <tr key={keyOf(s)}>
                    {mode === "approvals" && (
                      <td>
                        <input
                        aria-label={`${t("เลือก")} ${s.emp_name} ${s.date}`}
                          type="checkbox"
                          checked={selected.includes(keyOf(s))}
                          onChange={() =>
                            setSelected(toggle(selected, keyOf(s)))
                          }
                        />
                      </td>
                    )}
                    <td>
                      <Link
                        className="employee-calendar-link"
                        prefetch={false}
                        href={employeeCalendarHref(
                          s.emp_id,
                          s.date,
                          s.emp_name,
                        )}
                      >
                        {s.emp_name}
                      </Link>
                      <small>
                        {t(s.emp_id)}
                        {t(" · ")}
                        {s.department}
                      </small>
                    </td>
                    <td>
                      {t(s.date)}
                      <small>{t(s.shift_code)}</small>
                    </td>
                    <td className="mono">
                      {t(clock(r.inMs))}
                      {t(" – ")}
                      {t(clock(r.outMs))}
                    </td>
                    {mode === "normal-hours" ? (
                      <td>
                        {t(number(r.normal))}
                        {t(" ชม.")}
                      </td>
                    ) : (
                      <>
                        <td>{t(number(r.punchedOT))}</td>
                        <td>
                          {t(number(r.approved ? r.actualOT : 0))}
                          {t(" ชม.")}
                        </td>
                      </>
                    )}
                    {mode === "overtime" &&
                      OT_RATES.map((rate) => (
                        <td key={rate}>{t(number(r.otByRate[rate]))}</td>
                      ))}
                    <td>
                      <span
                        className={`record-status status-${r.status.toLowerCase()}`}
                      >
                        {t(labels[r.status])}
                      </span>
                      {r.highOT && (
                        <small className="amber-text">
                          {t("OT สูงเกินเป้า · ")}
                          {t(number(r.monitoredOT))}
                          {t(" ชม.")}
                        </small>
                      )}
                      <small>
                        {t(r.approved ? "อนุมัติแล้ว" : "รออนุมัติ")}
                      </small>
                    </td>
                    <td>
                      <button className="button" onClick={() => setActive(s)}>
                        {t("ดูรายละเอียด")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && (
            <div className="empty">
              <h3>
                {t(
                  mode === "approvals"
                    ? "ไม่มีรายการรออนุมัติในช่วงเวลานี้"
                    : "ไม่พบรายการตามตัวกรอง",
                )}
              </h3>
              <p>{t("เปลี่ยนช่วงเวลา หรือเลือกตัวกรองอื่นเพื่อดูข้อมูล")}</p>
            </div>
          )}
        </div>
        <Pagination page={currentPage} total={rows.length} onChange={setPage} />
      </section>
      {active && (
        <ReviewDrawer key={keyOf(active)} active={active} onClose={close} />
      )}
    </>
  );
}
