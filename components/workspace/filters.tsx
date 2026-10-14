"use client";
import { useTranslation } from "@/lib/i18n";
import { holidayLabels, isoLocal } from "@/lib/engine";
import { addDays } from "@/lib/workspace";
import { ArrowLeft, ArrowRight, RotateCcw, Search } from "lucide-react";
import type { ReactNode } from "react";
import type { AttendanceData } from "./use-attendance";
import { dayCodeLabels } from "@/lib/day-codes";
export function ViewMode({ model }: { model: AttendanceData }) {
  const { t, getLocale } = useTranslation();
  return (
    <div className="segmented">
      {[
        ["week", "สัปดาห์"],
        ["biweek", "2 สัปดาห์"],
        ["month", "เดือน"],
        ["range", "กำหนดช่วงวันที่"],
      ].map(([value, label]) => (
        <button
          key={value}
          className={model.filters.view === value ? "selected" : ""}
          aria-pressed={model.filters.view === value}
          onClick={() => model.setFilters((p) => ({ ...p, view: value, rangeEnd: p.rangeEnd && p.rangeEnd >= p.date ? p.rangeEnd : addDays(p.date, 6) }))}
        >
          {t(label)}
        </button>
      ))}
    </div>
  );
}
export default function Filters({
  model,
  children,
  showView = true,
  onClearFilters,
}: {
  model: AttendanceData;
  children?: ReactNode;
  showView?: boolean;
  onClearFilters?: () => void;
}) {
  const { t, getLocale } = useTranslation();
  const { data, filters, setFilters, start, count, days } = model;
  const { date, view, search, agency, department, shift } = filters;
  const setDate = (date: string) => setFilters((p) => ({ ...p, date, rangeEnd: p.view === "range" ? addDays(date, count - 1) : p.rangeEnd }));
  const setSearch = (search: string) => setFilters((p) => ({ ...p, search }));
  const setAgency = (agency: string) => setFilters((p) => ({ ...p, agency }));
  const setDepartment = (department: string) =>
    setFilters((p) => ({ ...p, department }));
  const setShift = (shift: string) => setFilters((p) => ({ ...p, shift }));
  return (
    <>
      {showView && (
        <div className="report-view">
          <ViewMode model={model} />
        </div>
      )}
      <div className="period-toolbar">
        <div className="date-controls">
          <button
            className="icon-button"
            aria-label={t("ช่วงก่อนหน้า")}
            onClick={() =>
              setDate(addDays(start, -(view === "month" ? 1 : count)))
            }
          >
            <ArrowLeft size={15} />
          </button>
          <button
            className="icon-button"
            aria-label={t("ช่วงถัดไป")}
            onClick={() => setDate(addDays(start, count))}
          >
            <ArrowRight size={15} />
          </button>
          <b>
            {t(
              new Date(start).toLocaleDateString(getLocale(), {
                day: "numeric",
                month: "short",
              }),
            )}
            {t(" ")}
            {t("–")}
            {t(" ")}
            {t(
              new Date(days.at(-1)!).toLocaleDateString(getLocale(), {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            )}
          </b>
          {view === "range" && <span>{t("จากวันที่")}</span>}
          <input
            aria-label={t(view === "range" ? "จากวันที่" : "เลือกวันที่")}
            type="date"
            data-filter-active={Boolean(date)}
            value={date}
            onChange={(e) => {
              if (e.target.value) {
                const date = e.target.value;
                setFilters(p => ({ ...p, date, rangeEnd: p.view === "range" && (!p.rangeEnd || p.rangeEnd < date) ? date : p.rangeEnd }));
              }
            }}
          />
          {view === "range" && <>
            <span>{t("ถึงวันที่")}</span>
            <input aria-label={t("ถึงวันที่")} type="date" min={date} data-filter-active={true} value={filters.rangeEnd || date}
              onChange={e => { if (e.target.value && e.target.value >= date) setFilters(p => ({ ...p, rangeEnd: e.target.value })); }} />
          </>}
          <button
            className="button today"
            onClick={() => setDate(isoLocal(Date.now()).slice(0, 10))}
          >
            {t("วันนี้")}
          </button>
          {onClearFilters && (
            <button className="button clear-filters" onClick={onClearFilters}>
              <RotateCcw size={14} />
              {t("ล้างตัวกรอง")}
            </button>
          )}
        </div>
        <span className="timezone">{t("Asia/Bangkok (GMT+7)")}</span>
      </div>
      <div className="filters">
        <label className="search" data-filter-active={Boolean(search.trim())}>
          <Search size={15} />
          <input
            placeholder={t("ค้นหาชื่อ หรือรหัสพนักงาน...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label={t("Agency")}
          data-filter-active={agency !== "all"}
          value={agency}
          onChange={(e) => setAgency(e.target.value)}
        >
          <option value="all">{t("ทุก Agency")}</option>
          {[...new Set(data.shifts.map((s) => s.agency))].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select
          aria-label={t("แผนก")}
          data-filter-active={department !== "all"}
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          <option value="all">{t("ทุกแผนก")}</option>
          {[...new Set(data.shifts.map((s) => s.department))].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select
          aria-label={t("กะ")}
          data-filter-active={shift !== "all"}
          value={shift}
          onChange={(e) => setShift(e.target.value)}
        >
          <option value="all">{t("ทุกกะ")}</option>
          {[...new Set(data.shifts.map((s) => s.shift_code))]
            .filter((code) => !Object.hasOwn(holidayLabels, code))
            .sort()
            .map((code) => (
              <option key={code} value={code}>
                {t(code)}
                {t(" · ")}
                {t(dayCodeLabels[code] || "กะทำงาน")}
              </option>
            ))}
          {Object.entries(holidayLabels).map(([code, label]) => (
            <option key={code} value={code}>
              {t(code)}
              {t(" · ")}
              {t(label)}
            </option>
          ))}
        </select>
        {children}
        <select
          aria-label={t("ประเภทพนักงาน")}
          data-filter-active={filters.workerType !== "all"}
          value={filters.workerType}
          onChange={(e) =>
            setFilters((p) => ({ ...p, workerType: e.target.value }))
          }
        >
          <option value="all">{t("พนักงานทุกประเภท")}</option>
          <option value="Thai">{t("Thai")}</option>
          <option value="AEC">{t("AEC")}</option>
          <option value="unknown">{t("ยังไม่ระบุประเภท")}</option>
        </select>
      </div>
    </>
  );
}
