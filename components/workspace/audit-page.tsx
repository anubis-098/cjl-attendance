"use client";
import { useTranslation } from "@/lib/i18n";
import { downloadCSV } from "@/lib/csv";
import { ArrowDownToLine, History, Search } from "lucide-react";
import { useMemo, useState } from "react";
import Pagination from "./pagination";
import { useWorkspace } from "./provider";
import AuditDetail from "./audit-detail";
export default function AuditPage() {
  const { t, getLocale } = useTranslation();
  const { data } = useWorkspace();
  const [expanded, setExpanded] = useState<string | null>(null);
  const employees = useMemo(() => new Map(data.shifts.map(s => [s.emp_id, s.emp_name])), [data.shifts]);
  const [search, setSearch] = useState(""),
    [date, setDate] = useState(""),
    [page, setPage] = useState(1);
  const rows = useMemo(
    () =>
      data.audit.filter(
        (a) =>
          (!date || a.key.endsWith("|" + date)) &&
          `${a.key} ${employees.get(a.key.split("|")[0]) || ""} ${a.actor} ${a.reason}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [data.audit, search, date, employees],
  );
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / 25)));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t("AUDIT TRAIL")}</div>
          <h1>{t("ประวัติการตรวจสอบ")}</h1>
          <p>
            {t("ประวัติการอนุมัติและแก้ไข พร้อมข้อมูลก่อน–หลัง · ")}
            {t(rows.length)}
            {t(" ")}
            {t("รายการ")}
          </p>
        </div>
        <button
          className="button"
          onClick={() =>
            downloadCSV("audit-log.csv", [
              ["Key", "Actor", "Timestamp", "Reason", "Before", "After"],
              ...rows.map((a) => [
                a.key,
                a.actor,
                a.timestamp,
                a.reason,
                a.before,
                a.after,
              ]),
            ])
          }
        >
          <ArrowDownToLine size={16} />
          {t("ส่งออกประวัติ")}
        </button>
      </div>
      <section className="panel audit-panel">
        <div className="filters">
          <label className="search">
            <Search size={15} />
            <input
              aria-label={t("ค้นหาประวัติ")}
              placeholder={t("ค้นหารหัส ผู้ดำเนินการ หรือเหตุผล")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="audit-date">
            {t("วันที่ทำงาน")}
            {t(" ")}
            <input
              aria-label={t("วันที่ทำงาน")}
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <button
            className="button"
            onClick={() => {
              setSearch("");
              setDate("");
              setPage(1);
            }}
          >
            {t("ล้างตัวกรอง")}
          </button>
        </div>
        {!rows.length ? (
          <div className="empty">
            <History size={30} />
            <h3>{t("ไม่พบประวัติการแก้ไข")}</h3>
            <p>{t("การอนุมัติและแก้ไขเวลาจะถูกบันทึกไว้ที่นี่")}</p>
          </div>
        ) : (
          rows.slice((currentPage - 1) * 25, currentPage * 25).map((a) => (
            <article className="audit-entry" key={a.id}>
              <b>
                {t(a.key)}
                {employees.get(a.key.split("|")[0]) && ` · ${employees.get(a.key.split("|")[0])}`}
                {t(" · ")}
                {a.reason}
              </b>
              <small>
                {a.actor}
                {t(" ·")}
                {t(" ")}
                {t(
                  new Date(a.timestamp).toLocaleString(getLocale(), {
                    timeZone: "Asia/Bangkok",
                  }),
                )}
              </small>
              <details open={expanded === a.id}>
                <summary onClick={event => { event.preventDefault(); setExpanded(expanded === a.id ? null : a.id); }}>{t("ดูข้อมูลก่อนและหลังแก้ไข")}</summary>
                {expanded === a.id && <AuditDetail entry={a} employeeName={employees.get(a.key.split("|")[0])} />}
              </details>
            </article>
          ))
        )}
        <Pagination page={currentPage} total={rows.length} onChange={setPage} />
      </section>
    </>
  );
}
