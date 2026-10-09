"use client";
import { useTranslation } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { Download, X } from "lucide-react";
import {
  buildPayrollExport,
  EXPORT_GROUPS,
  exportPreset,
  type ExportGroup,
  type PayrollReport,
} from "@/lib/payroll-export";
import { downloadCSV } from "@/lib/csv";
import { useDialog } from "./use-dialog";

export default function PayrollExportModal({
  report,
  filename,
  selectedOnly = false,
  onClose,
}: {
  report: PayrollReport;
  filename: string;
  selectedOnly?: boolean;
  onClose: () => void;
}) {
  const { t, getLocale } = useTranslation();
  const [selected, setSelected] = useState<ExportGroup[]>(() =>
    exportPreset("approved"),
  );
  const [totals, setTotals] = useState(true);
  useDialog(onClose);
  const csv = useMemo(
    () => buildPayrollExport(report, selected, totals),
    [report, selected, totals],
  );
  return (
    <div className="overlay modal-overlay" onClick={onClose}>
      <section
        className="payroll-export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payroll-export-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <div>
            <div className="eyebrow">{t("EXPORT MONTHLY PAYROLL")}</div>
            <h2 id="payroll-export-title">{t("เลือกข้อมูลส่งออก CSV")}</h2>
          </div>
          <button
            className="button"
            aria-label={t("ปิดหน้าต่างส่งออก")}
            autoFocus
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <div className="payroll-export-body">
          <p>
            {t("รอบ ")}
            {t(report.period.from)}
            {t(" ถึง ")}
            {t(report.period.to)}
            {t(" ·")}
            {t(" ")}
            {t(report.rows.length)}
            {t(selectedOnly ? " คน เฉพาะพนักงานที่เลือก" : " คน ตามตัวกรองปัจจุบัน รวมทุกหน้าตาราง")}
          </p>
          <div
            className="payroll-export-presets"
            aria-label={t("ชุดข้อมูลส่งออก")}
          >
            {(
              [
                ["approved", "ยืนยันแล้วเท่านั้น"],
                ["pending", "รอยืนยันเท่านั้น"],
                ["all", "ข้อมูลทั้งหมด"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                className="button"
                aria-pressed={
                  JSON.stringify(selected.slice().sort()) ===
                  JSON.stringify(exportPreset(id).sort())
                }
                onClick={() => setSelected(exportPreset(id))}
              >
                {t(label)}
              </button>
            ))}
            <button className="button" onClick={() => setSelected([])}>
              {t("ล้างตัวเลือก")}
            </button>
          </div>
          <p>
            {t(
              "เลือกข้อมูลเพิ่มเติมได้เอง · รหัส ชื่อ แผนก Agency และรอบคำนวณจะส่งออกเสมอ",
            )}
          </p>
          <div className="payroll-export-options">
            {["ยืนยันแล้ว", "รอยืนยัน", "ข้อมูลประกอบ"].map((section) => (
              <fieldset key={section}>
                <legend>{t(section)}</legend>
                {EXPORT_GROUPS.filter((g) => g.section === section).map((g) => (
                  <label key={g.id}>
                    <input
                      type="checkbox"
                      checked={selected.includes(g.id)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked
                            ? [...prev, g.id]
                            : prev.filter((id) => id !== g.id),
                        )
                      }
                    />
                    <span>{t(g.label)}</span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          <label className="payroll-export-total">
            <input
              type="checkbox"
              checked={totals}
              onChange={(e) => setTotals(e.target.checked)}
            />
            {t("เพิ่มแถวรวมท้ายไฟล์")}
          </label>
          <p>
            {t(
              "เลือก “สรุปค่าจ้างรายเดือนและวันทำงานจริง” เพื่อรวมค่าจ้างปกติและค่าจ้างวันหยุด · ยอดทั้งหมดก่อนภาษีและหักเงิน · หากอัตราไม่ครบจะแสดง “อัตราไม่ครบ” แทนยอดเงิน",
            )}
          </p>
          <h3>
            {t("ตัวอย่างไฟล์ · ")}
            {t(csv[0].length)}
            {t(" คอลัมน์")}
          </h3>
          <div className="report-scroll">
            <table className="report-table">
              <thead>
                <tr>
                  {csv[0].map((cell) => (
                    <th key={cell}>{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csv
                  .slice(1, Math.min(report.rows.length, 3) + 1)
                  .map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>{cell || "—"}</td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <small>
            {t(
              "แสดงตัวอย่างสูงสุด 3 คน · ไฟล์ CSV ใช้หัวตารางภาษาไทยและตัวเลขทศนิยม 2 ตำแหน่ง เปิดใน Excel ได้",
            )}
          </small>
        </div>
        <footer>
          <span role="status">
            {t("เลือก ")}
            {t(selected.length)}
            {t(" กลุ่มข้อมูล · ")}
            {t(report.rows.length)}
            {t(" คน")}
          </span>
          <button className="button" onClick={onClose}>
            {t("ยกเลิก")}
          </button>
          <button
            className="button"
            onClick={() => setSelected(["salary", "leave", "publicHolidays"])}
          >
            {t("สรุปเงินเดือน")}
          </button>
          <button
            className="button primary"
            disabled={!selected.length || !report.rows.length}
            onClick={() => {
              downloadCSV(filename, csv);
              onClose();
            }}
          >
            <Download size={18} />
            {t("ดาวน์โหลด CSV")}
          </button>
        </footer>
      </section>
    </div>
  );
}
