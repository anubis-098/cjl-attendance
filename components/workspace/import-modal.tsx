"use client";
import { useTranslation } from "@/lib/i18n";
import { downloadCSV } from "@/lib/csv";
import { AlertCircle, FileSpreadsheet, Upload, X } from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "./provider";
import { useDialog } from "./use-dialog";
import type { CJImport } from "@/lib/import-cj";
import type { Data } from "@/lib/engine";
export default function ImportModal({ onClose }: { onClose: () => void }) {
  const { t, getLocale } = useTranslation();
  const { data, refresh, setFilters, setToast } = useWorkspace();
  const [master, setMaster] = useState<File | null>(null),
    [raw, setRaw] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [format, setFormat] = useState("standard");
  const [attendance, setAttendance] = useState<File | null>(null);
  const [preview, setPreview] = useState<CJImport | null>(null);
  useDialog(onClose, busy);
  async function importData() {
    if (!master || !raw) {
      setError("กรุณาเลือกทั้ง Master Data และ Raw Punch");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (format === "cj") {
        if (!attendance)
          throw Error("กรุณาเลือกไฟล์ CDC Agency Attendance ด้วย");
        const { importCJFiles } = await import("@/lib/import-cj");
        setPreview(await importCJFiles(master, raw, attendance));
        return;
      }
      const { importFiles } = await import("@/lib/import");
      const next = await importFiles(master, raw);
      await commit(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "นำเข้าไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }
  async function commit(_next: Data) {
    if (!master || !raw) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("mode", format);
      form.set("master", master);
      form.set("raw", raw);
      if (attendance) form.set("attendance", attendance);
      const response = await fetch("/api/import", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) throw Error(payload.error);
      await refresh();
      setFilters((prev) => ({
        ...prev,
        date: payload.data.shifts[0]?.date || prev.date,
        agency: "all",
        department: "all",
        shift: "all",
        search: "",
      }));
      onClose();
      setToast("นำเข้าและบันทึกลง SQL แล้ว");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="overlay modal-overlay" onClick={() => !busy && onClose()}>
      <section
        className="import-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("นำเข้าข้อมูล")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <div className="eyebrow">{t("IMPORT & RECONCILE")}</div>
            <h2>{t("นำเข้าข้อมูลเวลาทำงาน")}</h2>
          </div>
          <button
            autoFocus
            className="icon-button"
            disabled={busy}
            aria-label={t("ปิดนำเข้า")}
            onClick={() => onClose()}
          >
            <X size={20} />
          </button>
        </div>
        <div className="import-body">
          <p>
            {t("อัปโหลด Master และข้อมูลเครื่องสแกนเพื่อกระทบยอดอัตโนมัติ")}
          </p>
          {data.importReport && (
            <p>
              {t("ผลนำเข้า CJ ล่าสุด: ")}
              {t(data.importReport.issues.length)}
              {t(" ข้อสังเกต")}
              {t(" ")}
              <button
                className="text-button"
                onClick={() =>
                  downloadCSV("cj-import-issues.csv", [
                    ["Source", "Row", "Employee ID", "Date", "Reason"],
                    ...data.importReport!.issues.map((i) => [
                      i.source,
                      i.row,
                      i.employee,
                      i.date,
                      i.reason,
                    ]),
                  ])
                }
              >
                {t("ดาวน์โหลดรายการตรวจสอบล่าสุด")}
              </button>
            </p>
          )}
          <label className="field">
            {t("รูปแบบไฟล์")}
            <select
              aria-label={t("รูปแบบไฟล์")}
              value={format}
              disabled={busy}
              onChange={(e) => {
                setFormat(e.target.value);
                setPreview(null);
                setError("");
              }}
            >
              <option value="standard">{t("CSV / Excel รูปแบบมาตรฐาน")}</option>
              <option value="cj">
                {t("CJ: Master Name + Fingerprint TXT + Attendance")}
              </option>
            </select>
          </label>
          <div className="import-warning">
            <AlertCircle size={17} />
            {t(
              " การนำเข้าจะแทนที่ตารางกะและผลตรวจสอบ แต่สแกนนิ้วจะเพิ่มต่อจากข้อมูลเดิมและข้ามรายการซ้ำเสมอ",
            )}
          </div>
          {[
            [
              "Master shift data",
              format === "cj"
                ? "Master Name list.xlsx · ใช้ชีต Master Name"
                : "ข้อมูลพนักงานและกะทำงาน",
              setMaster,
            ],
            [
              "Raw biometric log",
              format === "cj"
                ? "All-attlogd*.txt · รหัส วันที่ YYYYMMDD เวลา HHmm"
                : "ข้อมูลสแกนเข้า–ออกจากเครื่อง",
              setRaw,
            ],
            ...(format === "cj"
              ? [
                  [
                    "Agency attendance",
                    "CDC Agency Attendance · ตารางรายวันและ OT รวมทั้งงวด",
                    setAttendance,
                  ],
                ]
              : []),
          ].map(([title, description, setter], i) => (
            <label className="upload-zone" key={i}>
              <FileSpreadsheet size={28} />
              <b>{t(String(title))}</b>
              <span>{t(String(description))}</span>
              <input
                aria-label={t(String(title))}
                type="file"
                disabled={busy}
                accept={format === "cj" && i === 1 ? ".txt" : ".csv,.xlsx,.xls"}
                onChange={(e) => {
                  setPreview(null);
                  (setter as (file: File | null) => void)(
                    e.target.files?.[0] || null,
                  );
                }}
              />
              <small>
                {t(
                  format === "cj"
                    ? "ตรวจสอบผลการจับคู่ก่อนยืนยันนำเข้า"
                    : "CSV, XLSX หรือ XLS · วันที่ YYYY-MM-DD · เวลา HH:mm",
                )}
              </small>
            </label>
          ))}
          {preview && (
            <div className="import-preview" role="status">
              <h3>{t("ผลตรวจสอบก่อนนำเข้า")}</h3>
              <p>
                {t(preview.summary.from)}
                {t(" – ")}
                {t(preview.summary.to)}
                {t(" ·")}
                {t(" ")}
                {t(preview.summary.employees)}
                {t(" คน · ")}
                {t(preview.data.shifts.length)}
                {t(" ")}
                {t("กะที่จับคู่ได้")}
              </p>
              <p>
                {t("สแกน ")}
                {t(preview.summary.rawScans)}
                {t(" รายการ · รวมรายการซ้ำ")}
                {t(" ")}
                {t(preview.summary.duplicateScans)}
                {t(" รายการ · สแกนที่ยังจับคู่ไม่ได้")}
                {t(" ")}
                {t(preview.summary.unmatchedScans)}
                {t(" รายการ")}
              </p>
              <p>
                {t("OT รวมในรายงาน ")}
                {t(preview.summary.monthlyOT.toLocaleString())}
                {t(
                  " ชม. ใช้อ้างอิงเท่านั้น ระบบคำนวณและรับรอง OT จากเวลาสแกนจริงได้โดยไม่ต้องมีคำขอ OT",
                )}
              </p>
              <p>
                {t(
                  "ใช้เฉพาะวันที่มีโค้ดใน Attendance และอยู่ในช่วงไฟล์สแกน รายการโค้ด/เวลากะที่ไม่ชัดเจนจะถูกแยกไว้ด้านล่าง ไม่ปรากฏในตารางคำนวณ",
                )}
              </p>
              <p>
                {t("พบข้อสังเกต ")}
                {t(preview.issues.length)}
                {t(" รายการ")}
              </p>
              <button
                className="button"
                onClick={() =>
                  downloadCSV("cj-import-issues.csv", [
                    ["Source", "Row", "Employee ID", "Date", "Reason"],
                    ...preview.issues.map((i) => [
                      i.source,
                      i.row,
                      i.employee,
                      i.date,
                      i.reason,
                    ]),
                  ])
                }
              >
                {t("ดาวน์โหลดรายการที่ต้องตรวจสอบ")}
              </button>
              <ul>
                {preview.issues.slice(0, 8).map((i, index) => (
                  <li key={index}>
                    {t(i.employee)} {t(i.date)}
                    {t(": ")}
                    {i.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            className="text-button"
            onClick={() => {
              downloadCSV("master-template.csv", [
                [
                  "emp_id",
                  "emp_name",
                  "department",
                  "agency",
                  "device_emp_id",
                  "date",
                  "shift_code",
                  "shift_start",
                  "shift_end",
                  "requested_ot_hrs",
                  "ot_task_target",
                ],
              ]);
            }}
          >
            {t("ดาวน์โหลดตัวอย่าง Master CSV")}
          </button>
          <button
            className="text-button"
            onClick={() => {
              downloadCSV("punch-template.csv", [
                ["device_emp_id", "punch_timestamp", "punch_type"],
              ]);
            }}
          >
            {t("ดาวน์โหลดตัวอย่าง Punch CSV")}
          </button>
          <p className="import-help">
            {t(
              "หากรหัสเครื่องไม่ตรง emp_id ให้เพิ่มคอลัมน์ device_emp_id ใน Master เพื่อจับคู่โดยตรง",
            )}
          </p>
          {error && (
            <p className="error" role="alert">
              {t(error)}
            </p>
          )}
        </div>
        <div className="drawer-footer">
          <button className="button" disabled={busy} onClick={() => onClose()}>
            {t("ยกเลิก")}
          </button>
          <button
            className="button primary"
            disabled={
              busy ||
              !master ||
              !raw ||
              (format === "cj" && !attendance) ||
              (!!preview && !preview.data.shifts.length)
            }
            onClick={() =>
              preview
                ? commit({
                    ...preview.data,
                    importReport: {
                      issues: preview.issues,
                      summary: preview.summary,
                    },
                  })
                : importData()
            }
          >
            <Upload size={15} />
            {t(
              busy
                ? "กำลังกระทบยอด..."
                : preview
                  ? "ยืนยันนำเข้ารายการที่จับคู่ได้"
                  : format === "cj"
                    ? "ตรวจสอบไฟล์และการจับคู่"
                    : "นำเข้าและกระทบยอด",
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
