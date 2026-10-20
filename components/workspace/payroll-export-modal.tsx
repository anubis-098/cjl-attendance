"use client";
import { useTranslation } from "@/lib/i18n";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Clock3,
  Download,
  Layers3,
  WalletCards,
  X,
} from "lucide-react";
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
  const incompleteRows = report.rows.filter((row) => row.missing > 0);
  const presets = [
    {
      id: "approved",
      title: "ยืนยันแล้วเท่านั้น",
      description: "ชั่วโมงและยอด OT รวมเบี้ยเลี้ยงที่ยืนยันแล้ว",
      icon: BadgeCheck,
      groups: exportPreset("approved"),
    },
    {
      id: "pending",
      title: "รอยืนยันเท่านั้น",
      description: "รายการ OT และเบี้ยเลี้ยงที่ยังรอ Supervisor ยืนยัน",
      icon: Clock3,
      groups: exportPreset("pending"),
    },
    {
      id: "salarySummary",
      title: "สรุปเงินเดือน",
      description: "ค่าจ้าง วันทำงาน วันหยุด และวันลา",
      icon: WalletCards,
      groups: ["salary", "leave", "publicHolidays"] as ExportGroup[],
    },
    {
      id: "all",
      title: "ข้อมูลทั้งหมด",
      description: "ทุกหมวดข้อมูล ทั้งยืนยันแล้ว รอยืนยัน และข้อมูลประกอบ",
      icon: Layers3,
      groups: exportPreset("all"),
    },
  ] as const;
  const selectedPreset = presets.find(
    (preset) =>
      JSON.stringify([...selected].sort()) ===
      JSON.stringify([...preset.groups].sort()),
  )?.id;
  const selectedPresetTitle = presets.find(
    (preset) => preset.id === selectedPreset,
  )?.title;
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
            {t(
              selectedOnly
                ? " คน เฉพาะพนักงานที่เลือก"
                : " คน ตามตัวกรองปัจจุบัน รวมทุกหน้าตาราง",
            )}
          </p>
          {incompleteRows.length > 0 && (
            <div className="payroll-export-warning" role="alert">
              <strong>{t("ส่งออกได้ แต่พบรายการสแกนไม่ครบ")}</strong>
              <span>
                {t("ยอดเงินยังไม่สมบูรณ์: ไม่คำนวณค่าจ้างตามวันทำงาน OT และเบี้ยเลี้ยงจากกะที่สแกนไม่ครบ โดยระบุวันที่ไว้ใน CSV")}{" "}
                {incompleteRows
                  .slice(0, 5)
                  .map((row) => {
                    const dates = [...new Set(
                      row.days.filter((day) => day.missing ?? day.status === "MISSING").map((day) => day.date),
                    )];
                    return `${row.id} ${row.name} (${row.missing}: ${dates.join(", ") || t("วันที่ไม่ระบุ")})`;
                  })
                  .join(", ")}
                {incompleteRows.length > 5 &&
                  ` ${t("และอีก")} ${incompleteRows.length - 5} ${t("คน")}`}
              </span>
            </div>
          )}
          <section
            className="payroll-export-presets"
            aria-labelledby="export-preset-heading"
          >
            <div className="payroll-export-section-heading">
              <div>
                <h3 id="export-preset-heading">{t("เลือกชุดข้อมูล")}</h3>
                <p>
                  {t(
                    "เลือกชุดที่ต้องการส่งออก ระบบจะเลือกหมวดข้อมูลให้โดยอัตโนมัติ",
                  )}
                </p>
              </div>
              {selectedPresetTitle && (
                <span>
                  {t("ชุดที่เลือก")}: {t(selectedPresetTitle)}
                </span>
              )}
            </div>
            <div className="payroll-export-preset-grid">
              {presets.map(({ id, title, description, icon: Icon, groups }) => (
                <button
                  key={id}
                  type="button"
                  className="payroll-export-preset-card"
                  aria-pressed={selectedPreset === id}
                  onClick={() => setSelected([...groups])}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span className="payroll-export-preset-copy">
                    <strong>{t(title)}</strong>
                    <small>{t(description)}</small>
                  </span>
                  <span
                    className="payroll-export-preset-check"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </button>
              ))}
            </div>
          </section>
          <details className="payroll-export-custom">
            <summary>{t("ปรับแต่งหมวดข้อมูลเอง")}</summary>
            <p>{t("รหัส ชื่อ Agency แผนก และรอบคำนวณจะถูกรวมในไฟล์เสมอ")}</p>
            <div className="payroll-export-options">
              {["ยืนยันแล้ว", "รอยืนยัน", "ข้อมูลประกอบ"].map((section) => (
                <fieldset key={section}>
                  <legend>{t(section)}</legend>
                  {EXPORT_GROUPS.filter((g) => g.section === section).map(
                    (g) => (
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
                    ),
                  )}
                </fieldset>
              ))}
            </div>
          </details>
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
            className="button primary"
            disabled={
              !selected.length ||
              !report.rows.length
            }
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
