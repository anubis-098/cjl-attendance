"use client";
import { useTranslation, getLocale } from "@/lib/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PayrollDashboard from "./payroll-dashboard";
import { OT_RATES, isoLocal } from "@/lib/engine";
const DISPLAY_OT_RATES = OT_RATES;
import { payrollDashboard } from "@/lib/payroll-dashboard";
import type { calculatePayroll } from "@/lib/payroll";
import type { PayrollSettings } from "@/lib/payroll-settings";
import PayrollSettingsForm from "./payroll-settings-form";
import { labels, number } from "@/lib/workspace";
import dynamic from "next/dynamic";
const PayrollExportModal = dynamic(() => import("./payroll-export-modal"));
import { employeeCalendarHref } from "@/lib/employee-calendar";
import { useWorkspace } from "./provider";
import Pagination from "./pagination";
type Report = ReturnType<typeof calculatePayroll> & {
  settings: PayrollSettings;
  settingsSaved: boolean;
  departments: string[];
  revision: number;
};
const money = (n: number | null | undefined) =>
  n == null
    ? "รอระบุอัตรา"
    : n.toLocaleString(getLocale(), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
export default function PayrollPage() {
  const { t, getLocale } = useTranslation();
  const { refresh } = useWorkspace();
  const [month, setMonth] = useState(isoLocal(Date.now()).slice(0, 7));
  const [cycle, setCycle] = useState("26-25");
  const [report, setReport] = useState<Report | null>(null);
  const [search, setSearch] = useState("");
  const [agency, setAgency] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(
    new Set(),
  );
  useEffect(() => {
    setSelectedEmployees(new Set());
    setExportOpen(false);
  }, [month, cycle, search, agency]);
  const closeExport = useCallback(() => setExportOpen(false), []);
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setReport(null);
    setError("");
    setPage(1);
    setActive(null);
    fetch(`/api/payroll?month=${month}&cycle=${cycle}`, {
      signal: ctrl.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        const p = await r.json();
        if (!r.ok) throw Error(p.error);
        setReport(p);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [month, cycle, version]);
  const rows = useMemo(
    () =>
      (report?.rows || []).filter(
        (r) =>
          (agency === "all" || r.agency === agency) &&
          `${r.id} ${r.name}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [report, agency, search],
  );
  const shownPage = Math.min(page, Math.max(1, Math.ceil(rows.length / 25)));
  const selectedRows = useMemo(
    () => rows.filter((r) => selectedEmployees.has(r.id)),
    [rows, selectedEmployees],
  );
  const cards = useMemo(() => payrollDashboard(selectedRows), [selectedRows]);
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  const detail = rows.find((r) => r.id === active);
  return (
    <>
      {exportOpen && report && (
        <PayrollExportModal
          report={{
            ...report,
            rows: selectedRows.length ? selectedRows : rows,
          }}
          selectedOnly={selectedRows.length > 0}
          filename={`ot-pay-${month}-${cycle}.csv`}
          onClose={closeExport}
        />
      )}
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t("MONTHLY OVERTIME PAY")}</div>
          <h1>{t("คำนวณเงินโอทีรายเดือน")}</h1>
          <p>
            {t("คำนวณ OT ค่ากะ และเบี้ยเลี้ยงจากเวลาทำงาน ตั้งอัตราได้บนเว็บ")}
          </p>
        </div>
        <button
          className="button"
          disabled={!rows.length || loading || busy}
          onClick={() => setExportOpen(true)}
        >
          {t(selectedRows.length ? "ส่งออก CSV เฉพาะที่เลือก" : "ส่งออก CSV")}
          {selectedRows.length > 0 && ` (${selectedRows.length})`}
        </button>
      </div>
      <section className="panel">
        <div className="month-controls">
          <label>
            {t("เดือนจ่าย")}
            {t(" ")}
            <input
              aria-label={t("เดือนจ่าย")}
              type="month"
              data-filter-active={Boolean(month)}
              value={month}
              disabled={busy}
              onChange={(e) => {
                if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) {
                  setMonth(e.target.value);
                  setAgency("all");
                }
              }}
            />
          </label>
          <label>
            {t("รอบคำนวณ")}
            {t(" ")}
            <select
              aria-label={t("รอบคำนวณ")}
              disabled={busy}
              data-filter-active={true}
              value={cycle}
              onChange={(e) => setCycle(e.target.value)}
            >
              <option value="26-25">{t("26 เดือนก่อน – 25 เดือนนี้")}</option>
              <option value="calendar">{t("วันที่ 1 – สิ้นเดือน")}</option>
            </select>
          </label>
          <button
            className="button"
            disabled={loading || busy}
            onClick={() => setVersion((v) => v + 1)}
          >
            {t("อัปเดตยอด")}
          </button>
          {report && (
            <span>
              {t(report.period.from)}
              {t(" ถึง ")}
              {t(report.period.to)}
            </span>
          )}
        </div>
      </section>
      {error && (
        <p role="alert" className="error">
          {t(error)}
        </p>
      )}
      <PayrollDashboard
        selectedCount={selectedRows.length}
        cards={cards}
        loading={loading}
      />
      {report && (
        <PayrollSettingsForm
          key={`${month}-${version}`}
          month={month}
          initial={report.settings}
          saved={report.settingsSaved}
          departments={report.departments}
          revision={report.revision}
          onBusy={setBusy}
          onSaved={async () => {
            setVersion((v) => v + 1);
            await refresh();
          }}
        />
      )}
      <section className="panel">
        <div className="filters">
          <input
            aria-label={t("ค้นหารายงานเงิน OT")}
            placeholder={t("ค้นหารหัสหรือชื่อพนักงาน")}
            data-filter-active={Boolean(search.trim())}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label={t("Agency รายงานเงิน OT")}
            data-filter-active={agency !== "all"}
            value={agency}
            onChange={(e) => {
              setAgency(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t("ทุก Agency")}</option>
            {[...new Set(report?.rows.map((r) => r.agency))].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="report-scroll">
          <table className="report-table payroll-report-table">
            <thead>
              <tr>
                <th className="payroll-selection">
                  <input
                    type="checkbox"
                    aria-label={t("เลือกพนักงานทั้งหมดตามตัวกรอง")}
                    checked={allSelected}
                    disabled={!rows.length || loading || busy}
                    ref={(node) => {
                      if (node)
                        node.indeterminate =
                          selectedRows.length > 0 && !allSelected;
                    }}
                    onChange={(e) =>
                      setSelectedEmployees(
                        e.target.checked
                          ? new Set(rows.map((r) => r.id))
                          : new Set(),
                      )
                    }
                  />
                </th>
                <th>{t("พนักงาน")}</th>
                <th>{t("วันทำงานจริง / ค่าจ้างรายวัน")}</th>
                <th>{t("ค่าจ้างตามวันทำงานจริง (บาท)")}</th>
                <th>
                  {t("ค่าจ้าง + ยอดยืนยัน (บาท)")}
                  <small>{t("ค่าจ้างวันหยุด OT เบี้ยเลี้ยง และค่ากะ")}</small>
                </th>
                <th>
                  {t("ยอดประมาณการ (บาท)")}
                  <small>{t("รวมรายการรอยืนยัน")}</small>
                </th>
                {DISPLAY_OT_RATES.map((r) => (
                  <th key={r}>
                    {t("OT x")}
                    {t(r)}
                    <small>{t("ชม.ยืนยัน × บาท/ชม. = บาท")}</small>
                  </th>
                ))}
                <th>{t("OT ยืนยัน")}</th>
                <th>{t("OT รอยืนยัน")}</th>
                <th>
                  {t("เบี้ยเลี้ยงแผนก / ค่ากะ")}
                  <small>{t("ยืนยัน / รอยืนยัน (บาท)")}</small>
                </th>
                <th>
                  {t("รวม OT + เบี้ยเลี้ยง")}
                  <small>{t("ยืนยันแล้ว (บาท)")}</small>
                </th>
                <th>{t("วันหยุด / ตรวจสอบ")}</th>
                <th>{t("รายละเอียด")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice((shownPage - 1) * 25, shownPage * 25).map((r) => (
                <tr key={r.id}>
                  <td className="payroll-selection">
                    <input
                      type="checkbox"
                      aria-label={`${t("เลือกพนักงาน")} ${r.name} (${r.id})`}
                      checked={selectedEmployees.has(r.id)}
                      disabled={loading || busy}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedEmployees((previous) => {
                          const next = new Set(previous);
                          if (checked) next.add(r.id);
                          else next.delete(r.id);
                          return next;
                        });
                      }}
                    />
                  </td>
                  <td>
                    <Link
                      className="employee-calendar-link"
                      href={employeeCalendarHref(r.id, month + "-01", r.name)}
                    >
                      {r.name}
                    </Link>
                    <small>
                      {t(r.id)}
                      {t(" · ")}
                      {r.agency}
                    </small>
                  </td>
                  <td>
                    {t(r.workedDays)}
                    {t(" วัน")}
                    <small title={`${getLocale().startsWith("en") ? "Base" : "ฐาน"} ${money(r.rate?.baseDailyWage ?? r.rate?.dailyWage)} + Service ${r.rate?.wageServicePercent ?? r.rate?.servicePercent ?? 0}% · ${r.rate?.rateSource === "local" ? "Local" : "Global"}`}>
                      {t(money(r.rate?.dailyWage))}
                      {t(" บาท/วัน")}
                    </small>
                  </td>
                  <td>
                    <b>{t(money(r.dailyWageTotal))}</b>
                  </td>
                  <td>
                    <b>{t(money(r.salaryWithApprovedOT))}</b>
                  </td>
                  <td>{t(money(r.projectedSalary))}</td>
                  {DISPLAY_OT_RATES.map((rate) => (
                    <td key={rate}>
                      <b>{t(money(r.approvedAmounts[rate]))}</b>
                      <small>
                        {t(number(r.approvedHours[rate]))}
                        {t(" ×")}
                        {t(" ")}
                        {t(money(r.rate?.rates[rate]))}
                      </small>
                    </td>
                  ))}
                  <td>
                    <b>{t(money(r.approvedTotal))}</b>
                  </td>
                  <td>{t(money(r.pendingTotal))}</td>
                  <td>
                    <b>
                      {t(money(r.approvedAllowanceTotal))}
                      {t(" /")}
                      {t(" ")}
                      {t(money(r.pendingAllowanceTotal))}
                    </b>
                    <small>
                      {t("แผนก ")}
                      {money(r.approvedAllowances.department)}
                      {t(" · ค่ากะ")}
                      {t(" ")}
                      {t(money(r.approvedAllowances.shift))}
                    </small>
                    <small>
                      {t("วันปกติยืนยัน ")}
                      {t(r.approvedAllowances.days)}
                      {t(" วัน · รอยืนยัน")}
                      {t(" ")}
                      {t(r.pendingAllowances.days)}
                      {t(" วัน")}
                    </small>
                  </td>
                  <td>
                    <b>
                      {t(
                        money(
                          (r.approvedTotal || 0) + r.approvedAllowanceTotal,
                        ),
                      )}
                    </b>
                  </td>
                  <td>
                    {t(
                      Object.entries(r.holidays)
                        .map(([code, n]) => `${code}: ${n}`)
                        .join(" · ") || "—",
                    )}
                    <small>
                      {t(r.missing ? `สแกนไม่ครบ ${r.missing} กะ` : "")}
                    </small>
                    <small>{t(r.rate?.warnings.join(" · "))}</small>
                  </td>
                  <td>
                    <button
                      className="button"
                      onClick={() => setActive(active === r.id ? null : r.id)}
                    >
                      {t("ดูรายวัน")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(loading || !rows.length) && (
          <div className="empty" role="status">
            {t(loading ? "กำลังคำนวณ..." : "ไม่มีข้อมูลกะในรอบนี้")}
          </div>
        )}
        <Pagination page={shownPage} total={rows.length} onChange={setPage} />
      </section>
      {detail && (
        <section className="panel payroll-detail">
          <h2>
            {t(detail.name)}
            {t(" · ชั่วโมงและเบี้ยเลี้ยงรายวัน")}
          </h2>
          <p>
            {getLocale().startsWith("en") ? "Base daily wage" : "ค่าจ้างฐานรายวัน"} {money(detail.rate?.baseDailyWage ?? detail.rate?.dailyWage)}
            {` + Service ${detail.rate?.wageServicePercent ?? detail.rate?.servicePercent ?? 0}% = ${money(detail.rate?.dailyWage)} · ${detail.rate?.rateSource === "local" ? "Local" : "Global"}`}
            {getLocale().startsWith("en") ? " · Allowances fixed, no Service added" : " · เบี้ยเลี้ยงคงที่ ไม่บวก Service"}
          </p>
          <div className="report-scroll">
            <table className="report-table">
              <thead>
                <tr>
                  <th>{t("วันที่")}</th>
                  <th>{t("รหัสกะ / วันหยุด")}</th>
                  <th>{t("ค่าจ้างปกติ (บาท)")}</th>
                  {DISPLAY_OT_RATES.map((r) => (
                    <th key={r}>
                      {t("x")}
                      {t(r)}
                      {t(" ชม.")}
                    </th>
                  ))}
                  <th>{t("สถานะ")}</th>
                  <th>{t("เบี้ยเลี้ยงแผนก (บาท)")}</th>
                  <th>{t("ค่ากะ (บาท)")}</th>
                  <th>{t("หมายเหตุ")}</th>
                </tr>
              </thead>
              <tbody>
                {detail.days.map((d) => (
                  <tr key={d.date}>
                    <td>{t(d.date)}</td>
                    <td>{t(d.code)}</td>
                    <td>
                      {t(
                        d.paidWorkday ? money(detail.rate?.dailyWage) : "0.00",
                      )}
                    </td>
                    {DISPLAY_OT_RATES.map((r) => (
                      <td key={r}>{t(number(d.hours[r]))}</td>
                    ))}
                    <td>
                      {t(labels[d.status])}
                      {t(d.approved ? " · รวมในยอดยืนยัน" : "")}
                    </td>
                    <td>{t(money(d.departmentAllowance))}</td>
                    <td>{t(money(d.shiftAllowance))}</td>
                    <td>{t(d.allowanceNote || "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <p className="month-summary">
        {t(
          "เวลาเข้า: นาที 01–20 ปัดลง หลังนาที 20 ปัดขึ้น · งาน 8 ชม. + พัก 1 ชม. แล้วนับ OT · OT ขั้นต่ำ 1 ชม. ปัดลงทุก 30 นาที · H/H8: 8 ชม. แรก x2.0 ส่วนเกิน x3.0 · PH/PH8: 8 ชม. แรก x1.0 ส่วนเกิน x3.0 · เบี้ยเลี้ยงเฉพาะวันทำงานปกติ · ไม่รวมภาษีหรือหักเงิน",
        )}
      </p>
    </>
  );
}
