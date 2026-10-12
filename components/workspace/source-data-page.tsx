"use client";
import { useTranslation } from "@/lib/i18n";
import { MASTER_HEADERS } from "@/lib/source-headers";
import { EMPLOYEE_FILTERS } from "@/lib/employee-filters";
import { normalizeDepartment } from "@/lib/departments";
import type { EmployeeRow } from "@/lib/master-data";
import Link from "next/link";
import { employeeCalendarHref } from "@/lib/employee-calendar";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "./provider";
import Pagination from "./pagination";
import FingerprintServicePanel from "./fingerprint-service-panel";
import type { FingerprintImportSummary } from "@/lib/fingerprint-import";
import { FileUp, ChevronDown } from "lucide-react";
import EmployeeCreateForm from "./employee-create-form";
import UploadProgress from "./upload-progress";
import { postFormWithProgress } from "@/lib/browser-upload";
type ScanRow = { employee_id: string; scan_date: string; scan_time: string };
export default function SourceDataPage({
  kind,
}: {
  kind: "employees" | "fingerprints";
}) {
  const { t, getLocale } = useTranslation();
  const { refresh, setToast, setFilters } = useWorkspace();
  const [rows, setRows] = useState<(EmployeeRow | ScanRow)[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  const [progress, setProgress] = useState<number | null>(null),
    [lastFileName, setLastFileName] = useState("");
  const fileInput = useRef<HTMLInputElement>(null), uploadAbort = useRef<AbortController | null>(null);
  const master = kind === "employees";
  const [importResult, setImportResult] =
    useState<FingerprintImportSummary | null>(null);
  const [employeeMode, setEmployeeMode] = useState("merge");
  const [employeeFilters, setEmployeeFilters] = useState<
    Record<string, string>
  >({});
  const [options, setOptions] = useState<Record<string, string[]>>({});
  function changeFilter(key: string, value: string) {
    setEmployeeFilters((previous) => {
      const next = { ...previous };
      if (value === "") delete next[key];
      else next[key] = value;
      return next;
    });
    setPage(1);
  }
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    const query = new URLSearchParams({
      type: kind,
      page: String(page),
      search,
    });
    if (master) {
      for (const [key, value] of Object.entries(employeeFilters)) {
        query.set(key, key === "review" ? value : JSON.parse(value));
      }
    }
    fetch(`/api/source-data?${query}`, {
      signal: ctrl.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        const p = await r.json();
        if (!r.ok) throw Error(p.error);
        setRows(p.rows);
        setTotal(p.total);
        setOptions(p.options || {});
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [kind, master, page, search, version, employeeFilters]);
  async function upload(selected: File) {
    setBusy(true);
    setError("");
    setImportResult(null);
    setFile(selected); setLastFileName(selected.name); setProgress(0);
    const controller = new AbortController(); uploadAbort.current = controller;
    try {
      const form = new FormData();
      form.set("mode", kind);
      if (master) form.set("employeeMode", employeeMode);
      form.set(master ? "master" : "raw", selected);
      const p = await postFormWithProgress("/api/import", form, setProgress, controller.signal) as {
        fingerprintImport?: FingerprintImportSummary;
        data: { shifts: { date: string }[] };
      };
      setImportResult(p.fingerprintImport || null);
      await refresh();
      setFilters((prev) => ({
        ...prev,
        date:
          p.fingerprintImport?.to?.slice(0, 10) ||
          p.data.shifts[0]?.date ||
          prev.date,
        search: "",
        agency: "all",
        department: "all",
        shift: "all",
      }));
      setPage(1);
      setVersion((v) => v + 1);
      setToast("นำเข้าและบันทึกลงฐานข้อมูล SQL แล้ว");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "นำเข้าไม่สำเร็จ");
    } finally {
      uploadAbort.current = null;
      setBusy(false);
    }
  }
  function discardSelectedFile() {
    uploadAbort.current?.abort(); uploadAbort.current = null;
    setFile(null); setProgress(null); setLastFileName("");
    if (fileInput.current) fileInput.current.value = "";
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {t(master ? "EMPLOYEE DATABASE" : "FINGERPRINT DATABASE")}
          </div>
          <h1>{t(master ? "ข้อมูลพนักงาน" : "เวลาสแกนนิ้ว")}</h1>
          {master && (
            <p>{t("หัวตารางตามชีต Master Name · พนักงานทั้งหมดในฐานข้อมูล")}</p>
          )}
        </div>
        <Link className="button" href="/attendance">
          {t("เทียบข้อมูล Attendance")}
        </Link>
      </div>
      {!master && <FingerprintServicePanel />}
      <details className="panel employee-tools" open={master ? undefined : true}>
        <summary><span className="employee-tool-icon"><FileUp size={21}/></span><span>{t(master ? "Import File" : "นำเข้าไฟล์ด้วยตนเอง")}</span><ChevronDown size={18} className="employee-tool-chevron"/></summary>
        <div className="employee-tool-body"><section className="source-import">
        <p>
          {t(
            master
              ? "เลือก Excel หรือ CSV · จับคู่ตามชื่อคอลัมน์ สลับลำดับหรือเพิ่มคอลัมน์ได้"
              : "เลือกไฟล์ All-attlogd*.txt จากเครื่องสแกนนิ้ว",
          )}
        </p>
        {master && (
          <label className="field">
            {t("วิธีนำเข้าข้อมูลพนักงาน")}
            <select
              value={employeeMode}
              disabled={busy}
              onChange={(e) => setEmployeeMode(e.target.value)}
            >
              <option value="merge">{t("เพิ่ม/อัปเดตข้อมูล")}</option>
              <option value="replace">{t("แทนที่ข้อมูลทั้งหมด")}</option>
            </select>
          </label>
        )}
        <p>
          {t(
            master
              ? employeeMode === "merge"
                ? "เพิ่มรหัสใหม่และอัปเดตข้อมูลของรหัสที่มีอยู่ตามไฟล์ เก็บพนักงานที่ไม่มีในไฟล์และตารางกะรายวันเดิมไว้ เปิดผลตรวจสอบใหม่เฉพาะรหัสที่นำเข้า ข้อมูลสแกนนิ้วยังคงอยู่"
                : "ใช้รายชื่อในไฟล์แทนข้อมูลพนักงานทั้งหมด พนักงานที่ไม่มีในไฟล์จะถูกนำออก ล้างตารางกะและผลตรวจสอบเดิม ข้อมูลสแกนนิ้วยังคงอยู่"
              : "เพิ่มข้อมูลต่อจากทุกไฟล์เดิม ข้ามรายการซ้ำ เก็บสแกนเก่าไว้จนกว่าผู้พัฒนาจะสั่งลบ เปิดผลตรวจสอบใหม่เฉพาะกะที่มีสแกนเพิ่ม",
          )}
        </p>
        <input
          type="file"
          ref={fileInput}
          aria-label={t(
            master ? "Import employee file" : "Import fingerprint file",
          )}
          accept={master ? ".xlsx,.xls,.csv" : ".txt"}
          disabled={busy}
          onChange={(e) => { const selected = e.target.files?.[0]; setError(""); if (selected) void upload(selected); }}
        />
        {(file || lastFileName) && progress !== null && <UploadProgress fileName={lastFileName} progress={progress} busy={busy} onDiscard={discardSelectedFile} />}
        {error && (
          <p className="error" role="alert">
            {t(error)}
          </p>
        )}
      </section></div></details>
      {master && <EmployeeCreateForm onCreated={() => {setPage(1);setSearch("");setEmployeeFilters({});setVersion(v=>v+1);}} />}
      {!master && importResult && (
        <section className="panel" role="status" style={{ padding: 20 }}>
          <h2>
            {t("ผลนำเข้า ")}
            {importResult.filename}
          </h2>
          <p>
            {t("เพิ่มใหม่ ")}
            {t(importResult.added.toLocaleString())}
            {t(" รายการ · ข้ามรายการซ้ำ ")}
            {t(importResult.duplicates.toLocaleString())}
            {t(" รายการ · รวมสะสม ")}
            {t(importResult.total.toLocaleString())}
            {t(" รายการ")}
          </p>
          <p>
            {t("ช่วงเวลาภายในไฟล์: ")}
            {t(importResult.from.replace("T", " "))}
            {t(" ถึง")}
            {t(" ")}
            {t(importResult.to.replace("T", " "))}
          </p>
        </section>
      )}
      <section className="panel">
        <div className="filters">
          <input
            aria-label={t("ค้นหาข้อมูล")}
            placeholder={t(
              master ? "ค้นหารหัส หรือชื่อพนักงาน" : "ค้นหารหัสพนักงาน",
            )}
            data-filter-active={Boolean(search.trim())}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {master && (
            <>
              {EMPLOYEE_FILTERS.map((filter) => (
                <label className="employee-filter" key={filter.key}>
                  <span>{t(filter.label)}</span>
                  <select
                    aria-label={t(filter.label)}
                    data-filter-active={Boolean(employeeFilters[filter.key])}
                    value={employeeFilters[filter.key] ?? ""}
                    onChange={(e) => changeFilter(filter.key, e.target.value)}
                  >
                    <option value="">{t("ทั้งหมด")}</option>
                    {(options[filter.key] || []).map((value) => (
                      <option key={value} value={JSON.stringify(value)}>
                        {value || t("ไม่ระบุ")}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="employee-filter">
                <span>{t("ผลตรวจสอบ")}</span>
                <select
                  aria-label={t("ผลตรวจสอบ")}
                  data-filter-active={Boolean(employeeFilters.review)}
                  value={employeeFilters.review || ""}
                  onChange={(e) => changeFilter("review", e.target.value)}
                >
                  <option value="">{t("ทั้งหมด")}</option>
                  <option value="ready">{t("พร้อมจับคู่")}</option>
                  <option value="issue">{t("มีปัญหาข้อมูล")}</option>
                </select>
              </label>
              <button
                className="button"
                disabled={!search && !Object.keys(employeeFilters).length}
                onClick={() => {
                  setSearch("");
                  setEmployeeFilters({});
                  setPage(1);
                }}
              >
                {t("ล้างตัวกรอง")}
              </button>
            </>
          )}
          <span>
            {t(total.toLocaleString())}
            {t(" รายการ")}
          </span>
        </div>
        <div className="report-scroll">
          <table className="report-table">
            <thead>
              <tr>
                {(master
                  ? [...MASTER_HEADERS, "ผลตรวจสอบ"]
                  : ["รหัสพนักงาน", "ปี/เดือน/วัน", "เวลาสแกนนิ้ว"]
                ).map((h) => (
                  <th key={h}>{t(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading &&
                rows.map((row, i) =>
                  master ? (
                    <tr key={row.employee_id}>
                      {MASTER_HEADERS.map((h) => (
                        <td key={h}>
                          {h === "ชื่อ-นามสกุล" ? (
                            <Link
                              className="employee-calendar-link"
                              prefetch={false}
                              href={employeeCalendarHref(
                                row.employee_id,
                                undefined,
                                (row as EmployeeRow).source_data[h],
                              )}
                            >
                              {(row as EmployeeRow).source_data[h] ||
                                row.employee_id}
                            </Link>
                          ) : h === "แผนก" ? (
                            <span
                              title={`${t("ข้อมูลต้นฉบับ:")} ${(row as EmployeeRow).source_data[h] || "—"}`}
                            >
                              {normalizeDepartment(
                                (row as EmployeeRow).source_data[h] || "",
                              ) || "—"}
                            </span>
                          ) : (
                            (row as EmployeeRow).source_data[h] || "—"
                          )}
                        </td>
                      ))}
                      <td>{t((row as EmployeeRow).issue || "พร้อมจับคู่")}</td>
                    </tr>
                  ) : (
                    <tr key={`${row.employee_id}-${i}`}>
                      <td>{t(row.employee_id)}</td>
                      <td>{t((row as ScanRow).scan_date)}</td>
                      <td>{t((row as ScanRow).scan_time)}</td>
                    </tr>
                  ),
                )}
            </tbody>
          </table>
          {loading ? (
            <div className="empty" role="status">
              {t("กำลังโหลด...")}
            </div>
          ) : (
            !rows.length && (
              <div className="empty">
                {t(
                  search || Object.keys(employeeFilters).length
                    ? "ไม่พบข้อมูลที่ตรงกับตัวกรอง"
                    : "ยังไม่มีข้อมูล กรุณา Import File",
                )}
              </div>
            )
          )}
        </div>
        <Pagination page={page} total={total} pageSize={master ? 25 : 10} onChange={setPage} />
      </section>
    </>
  );
}
