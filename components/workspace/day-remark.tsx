"use client";
import { useTranslation } from "@/lib/i18n";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, Trash2 } from "lucide-react";
import { useWorkspace } from "./provider";
import { useDialog } from "./use-dialog";

export default function DayRemark({
  date,
  employeeId,
}: {
  date: string;
  employeeId?: string;
}) {
  const { t, getLocale } = useTranslation();
  const { data } = useWorkspace();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const notes = (data.calendarRemarks || []).filter(
    (n) => n.date === date && (!n.employeeId || n.employeeId === employeeId),
  );
  return (
    <>
      <button
        type="button"
        className={`day-remark ${notes.length ? "has-remark" : ""}`}
        aria-label={t(`หมายเหตุวันที่ ${date}`)}
        title={
          notes
            .map((n) => `${n.employeeId ? "Local" : "Global"}: ${n.text}`)
            .join("\n") || t("เพิ่มหมายเหตุรายวัน")
        }
        onClick={() => setOpen(true)}
      >
        <MessageSquare size={15} />
        {notes.length ? (
          <span>
            {notes
              .map((n) => `${n.employeeId ? "Local" : "Global"}: ${n.text}`)
              .join(" · ")}
          </span>
        ) : (
          t("Remark")
        )}
      </button>
      {open &&
        createPortal(
          <Editor date={date} employeeId={employeeId} onClose={close} />,
          document.body,
        )}
    </>
  );
}
function Editor({
  date,
  employeeId,
  onClose,
}: {
  date: string;
  employeeId?: string;
  onClose: () => void;
}) {
  const { t, getLocale } = useTranslation();
  const { data, refresh, setToast } = useWorkspace();
  const [scope, setScope] = useState(employeeId || "");
  const [original] = useState(() =>
    Object.fromEntries(
      (data.calendarRemarks || [])
        .filter((n) => n.date === date)
        .map((n) => [n.employeeId, n.text]),
    ),
  );
  const [drafts, setDrafts] = useState(original);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useDialog(onClose, busy);
  async function save(remove = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/calendar-remarks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, employeeId: scope, text: remove ? "" : drafts[scope] || "", expected: original[scope] || "" }),
      });
      const result = await res.json();
      if (!res.ok) throw Error(result.error);
      await refresh();
      setToast(remove ? (getLocale().startsWith("en") ? "Remark deleted" : "ลบหมายเหตุแล้ว") : "บันทึกหมายเหตุแล้ว");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally { setBusy(false); }
  }
  return (
    <div className="overlay modal-overlay" onClick={() => !busy && onClose()}>
      <section
        className="payroll-export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="remark-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2 id="remark-title">
            {t("หมายเหตุวันที่ ")}
            {t(date)}
          </h2>
          <button className="button" disabled={busy} onClick={onClose}>
            {t("ปิด")}
          </button>
        </header>
        <div className="payroll-export-body remark-form">
          <label>
            {t("ขอบเขตหมายเหตุ")}
            <select
              autoFocus
              disabled={busy}
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="">{t("Global · พนักงานทุกคน")}</option>
              {employeeId && (
                <option value={employeeId}>
                  {t("Local · เฉพาะพนักงาน ")}
                  {employeeId}
                </option>
              )}
            </select>
          </label>
          <p>
            {t(
              scope
                ? "หมายเหตุเฉพาะพนักงานคนนี้"
                : "แสดงบนหัววันที่ในหน้า Attendance สำหรับพนักงานทุกคน",
            )}
          </p>
          <label>
            {t("เหตุการณ์ / หมายเหตุ")}
            <textarea
              rows={4}
              maxLength={1000}
              disabled={busy}
              value={drafts[scope] || ""}
              placeholder={t("เช่น ฝนตกหนัก น้ำท่วมบริเวณทางเข้า")}
              onChange={(e) =>
                setDrafts({ ...drafts, [scope]: e.target.value })
              }
            />
          </label>
          <p>
            {t(
              "บันทึกเฉพาะขอบเขตที่เลือก · เว้นว่างแล้วบันทึกเพื่อลบหมายเหตุ · ไม่กระทบเวลาหรือการคำนวณเงิน",
            )}
          </p>
          {error && (
            <p role="alert" className="error">
              {t(error)}
            </p>
          )}
        </div>
        <footer>
          {original[scope] && <button type="button" className="button remark-delete" disabled={busy} onClick={() => save(true)}>
            <Trash2 size={16} />
            {getLocale().startsWith("en") ? (scope ? "Delete local remark" : "Delete global remark") : (scope ? "ลบหมายเหตุเฉพาะคนนี้" : "ลบหมายเหตุสำหรับทุกคน")}
          </button>}
          <button className="button" disabled={busy} onClick={onClose}>
            {t("ยกเลิก")}
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => save()}
          >
            {t(
              busy
                ? "กำลังบันทึก..."
                : scope
                  ? "บันทึกเฉพาะคนนี้"
                  : "บันทึกสำหรับทุกคน",
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}
