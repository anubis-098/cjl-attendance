"use client";
import { useTranslation } from "@/lib/i18n";
import { useState } from "react";
import { X } from "lucide-react";
import { useDialog } from "./use-dialog";
import { useWorkspace } from "./provider";
import { addDays } from "@/lib/workspace";

export default function CompanyHolidayModal({
  month,
  onClose,
}: {
  month: string;
  onClose: () => void;
}) {
  const { t, getLocale } = useTranslation();
  const { data, employeeCount, saveCompanyHolidays } = useWorkspace();
  const saved = (data.companyHolidays || []).filter((d) => d.startsWith(month));
  const [selected, setSelected] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useDialog(onClose, busy);
  const first = `${month}-01`;
  const offset = (new Date(first).getUTCDay() + 6) % 7;
  const lastDay = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0),
  ).getUTCDate();
  const cells = Array.from(
    { length: Math.ceil((offset + lastDay) / 7) * 7 },
    (_, i) => addDays(first, i - offset),
  );
  const added = selected.filter((d) => !saved.includes(d));
  const removed = saved.filter((d) => !selected.includes(d));
  return (
    <div
      className="overlay modal-overlay"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <section
        className="payroll-export-modal company-holiday-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-holiday-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <div>
            <div className="eyebrow">{t("COMPANY HOLIDAYS")}</div>
            <h2 id="company-holiday-title">{t("กำหนดวันหยุดประเพณีองค์กร")}</h2>
          </div>
          <button
            autoFocus
            className="button"
            aria-label={t("ปิดวันหยุดองค์กร")}
            disabled={busy}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <div className="payroll-export-body">
          <h3>
            {t(
              new Date(`${first}T12:00:00+07:00`).toLocaleDateString(
                getLocale(),
                {
                  month: "long",
                  year: "numeric",
                  timeZone: "Asia/Bangkok",
                },
              ),
            )}
          </h3>
          <p>
            {t(
              "คลิกวันที่เพื่อกำหนด PH ร่วมกันทุกพนักงาน ทุกแผนก และทุก Agency (",
            )}
            {t(employeeCount)}
            {t(" คนใน Master) รวมพนักงานที่เพิ่มในภายหลัง")}
          </p>
          <p className="company-holiday-notice">
            {t(
              "วันหยุดองค์กรแทนวันลา ขาดงาน และวันหยุดรายบุคคลในวันที่เลือก หากยกเลิกจะกลับไปใช้ตารางเดิม ยอดยืนยันที่ได้รับผลกระทบจะเปิดให้ตรวจสอบใหม่",
            )}
          </p>
          <div className="company-holiday-grid">
            {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((day) => (
              <b key={day}>{t(day)}</b>
            ))}
            {cells.map((date) => (
              <button
                type="button"
                className="company-holiday-cell"
                key={date}
                aria-label={t(`วันหยุดองค์กร ${date}`)}
                aria-pressed={selected.includes(date)}
                disabled={busy || !date.startsWith(month)}
                onClick={() =>
                  setSelected((prev) =>
                    prev.includes(date)
                      ? prev.filter((d) => d !== date)
                      : [...prev, date].sort(),
                  )
                }
              >
                <span>{t(Number(date.slice(-2)))}</span>
                <small>
                  {t(
                    selected.includes(date)
                      ? "✓ PH"
                      : saved.includes(date)
                        ? "ยกเลิก"
                        : "",
                  )}
                </small>
              </button>
            ))}
          </div>
          <p role="status">
            {t("เลือก ")}
            {t(selected.length)}
            {t(" วัน · เพิ่ม ")}
            {t(added.length)}
            {t(" วัน · ยกเลิก")}
            {t(" ")}
            {t(removed.length)}
            {t(" วัน")}
          </p>
          <p>
            {t("เพิ่ม: ")}
            {t(added.join(", ") || "—")}
            <br />
            {t("ยกเลิก: ")}
            {t(removed.join(", ") || "—")}
          </p>
          <p>
            {t(
              "ไม่มีวันหยุดราชการตั้งต้น วันที่ที่เลือกจะใช้ร่วมกันใน Attendance ปฏิทินพนักงาน การคำนวณเงิน และ Export",
            )}
          </p>
          {error && (
            <p role="alert" className="error">
              {t(error)}
            </p>
          )}
        </div>
        <footer>
          <button className="button" disabled={busy} onClick={onClose}>
            {t("ยกเลิก")}
          </button>
          <button
            className="button primary"
            disabled={busy || (!added.length && !removed.length)}
            onClick={async () => {
              setBusy(true);
              setError("");
              const ok = await saveCompanyHolidays(month, selected);
              setBusy(false);
              if (ok) onClose();
              else
                setError(
                  "บันทึกไม่สำเร็จ กรุณาปิดหน้าต่างและโหลดข้อมูลใหม่ก่อนลองอีกครั้ง",
                );
            }}
          >
            {t(busy ? "กำลังบันทึก..." : "ยืนยันใช้กับทุกพนักงาน")}
          </button>
        </footer>
      </section>
    </div>
  );
}
