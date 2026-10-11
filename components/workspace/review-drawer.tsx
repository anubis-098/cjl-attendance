"use client";
import { useTranslation } from "@/lib/i18n";
import {
  OT_RATES,
  OT_RULES_VERSION,
  Review,
  Shift,
  holidayLabels,
  isoLocal,
  keyOf,
  reconcile,
} from "@/lib/engine";
import { audit, labels, number } from "@/lib/workspace";
import { CalendarDays, Check, Fingerprint, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useWorkspace } from "./provider";
import { useDialog } from "./use-dialog";
import { dayCodeLabels } from "@/lib/day-codes";
import EvidencePanel from "./attendance-evidence";
import { ActualNotice } from "./actual-card";
import type { ActualInterval } from "@/lib/actual-timeline";
export default function ReviewDrawer({
  active,
  onClose,
  actual,
}: {
  active: Shift;
  onClose: () => void;
  actual?: ActualInterval;
}) {
  const { t, getLocale } = useTranslation();
  const { data, setData, setToast, punchesByEmployee } = useWorkspace();
  const punches = punchesByEmployee.get(active.device_emp_id) || [];
  const result = useMemo(
    () => reconcile(active, punches, data.reviews[keyOf(active)]),
    [active, punches, data.reviews],
  );
  const [reason, setReason] = useState(""),
    [error, setError] = useState("");
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  type Field = "reason" | "inTime" | "outTime";
  const [invalidField, setInvalidField] = useState<Field | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const inRef = useRef<HTMLInputElement>(null);
  const outRef = useRef<HTMLInputElement>(null);
  function requireField(field: Field, message: string) {
    setInvalidField(field);
    setError(message);
    if (field !== "reason") setDraft((prev) => ({ ...prev, approved: false }));
    requestAnimationFrame(() => {
      const input =
        field === "reason"
          ? reasonRef.current
          : field === "inTime"
            ? inRef.current
            : outRef.current;
      if (!input) return;
      input.scrollIntoView({ block: "center", behavior: "instant" });
      input.focus({ preventScroll: true });
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        input.getAnimations().forEach((animation) => animation.cancel());
        input.animate(
          [
            { transform: "translateX(0)" },
            { transform: "translateX(-4px)" },
            { transform: "translateX(4px)" },
            { transform: "translateX(-3px)" },
            { transform: "translateX(3px)" },
            { transform: "translateX(0)" },
          ],
          { duration: 350, easing: "ease-in-out" },
        );
      }
    });
  }
  function clearField(field: Field) {
    if (invalidField === field) {
      setInvalidField(null);
      setError("");
    }
  }
  const [draft, setDraft] = useState<Review>(() => ({
    ...data.reviews[keyOf(active)],
    approved: result.approved,
    otRulesVersion: OT_RULES_VERSION,
    overBudget: data.reviews[keyOf(active)]?.overBudget ?? false,
    note: data.reviews[keyOf(active)]?.note ?? "",
    inTime: data.reviews[keyOf(active)]?.inTime || (result.inMs === undefined ? "" : isoLocal(result.inMs)),
    outTime: data.reviews[keyOf(active)]?.outTime || (result.outMs === undefined ? "" : isoLocal(result.outMs)),
  }));
  const preview = useMemo(
    () => reconcile(active, punches, draft),
    [active, punches, draft],
  );
  useDialog(onClose, evidenceBusy);
  async function save() {
    if (!active || evidenceBusy) return;
    const old = result;
    const changed =
      draft.inTime !== (data.reviews[keyOf(active)]?.inTime || (old.inMs === undefined ? "" : isoLocal(old.inMs))) ||
      draft.outTime !== (data.reviews[keyOf(active)]?.outTime || (old.outMs === undefined ? "" : isoLocal(old.outMs))) ||
      Boolean(draft.deductOTBreak) !==
        Boolean(data.reviews[keyOf(active)]?.deductOTBreak);
    if (changed && !reason.trim()) {
      requireField("reason", "กรุณาระบุเหตุผลในการแก้ไขเวลาหรือหักพัก OT");
      return;
    }
    if (draft.inTime && draft.outTime && draft.outTime <= draft.inTime) {
      requireField("outTime", "เวลาออกต้องอยู่หลังเวลาเข้า");
      return;
    }
    const r = reconcile(
      active,
      punchesByEmployee.get(active.device_emp_id) || [],
      draft,
    );
    if (
      draft.approved &&
      (r.missing ||
        r.ratePending ||
        r.nonWorking ||
        r.requiresOvertimeApproval ||
        r.status === "UNAPPROVED")
    ) {
      if (r.inMs === undefined) {
        requireField("inTime", "กรุณาระบุเวลาเข้าก่อนรับรอง");
        return;
      }
      if (r.outMs === undefined) {
        requireField("outTime", "กรุณาระบุเวลาออกก่อนรับรอง");
        return;
      }
      setInvalidField(null);
      setError("กรุณาตรวจสอบข้อมูลสแกน กะ และอัตรา OT ให้ครบก่อนรับรอง");
      return;
    }
    const saved = await setData((prev) => ({
      ...prev,
      reviews: { ...prev.reviews, [keyOf(active)]: draft },
      audit: [
        audit(
          active,
          {
            review: prev.reviews[keyOf(active)],
            inTime: old.inMs === undefined ? "" : isoLocal(old.inMs),
            outTime: old.outMs === undefined ? "" : isoLocal(old.outMs),
          },
          draft,
          reason || "ตรวจสอบและยืนยันผลการทำงาน",
        ),
        ...prev.audit,
      ],
    }));
    if (!saved) return;
    onClose();
    setToast("บันทึกผลตรวจสอบและประวัติการแก้ไขแล้ว");
  }
  return (
    <div
      className="overlay"
      onClick={() => {
        if (!evidenceBusy) onClose();
      }}
    >
      <section
        className="drawer attendance-details-compact"
        role="dialog"
        aria-modal="true"
        aria-label={t("รายละเอียดเวลาทำงาน")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <div className="eyebrow">{t("ATTENDANCE DETAILS")}</div>
            <h2>{t("ตรวจสอบเวลาทำงาน")}</h2>
          </div>
          <button
            autoFocus
            className="icon-button"
            aria-label={t("ปิดรายละเอียด")}
            disabled={evidenceBusy}
            onClick={() => onClose()}
          >
            <X size={20} />
          </button>
        </div>
        <div className="drawer-body">
          {actual && (
            <>
              <ActualNotice actual={actual} compact />
              <button
                className="button"
                type="button"
                onClick={() => {
                  setDraft((prev) => ({
                    ...prev,
                    approved: false,
                    inTime:
                      actual.inMs === undefined ? "" : isoLocal(actual.inMs),
                    outTime:
                      actual.outMs === undefined ? "" : isoLocal(actual.outMs),
                  }));
                }}
              >
                {t("นำเฉพาะเวลาสแกนจริงมาให้ตรวจสอบ")}
              </button>
            </>
          )}
          <div className="detail-person">
            <div className="employee-avatar">{active.emp_name[0]}</div>
            <div>
              <h3>{active.emp_name}</h3>
              <p>
                {t(active.emp_id)}
                {t(" · ")}
                {active.department}
              </p>
            </div>
          </div>
          <div className="detail-date">
            <CalendarDays size={16} />
            {t(
              new Date(active.date).toLocaleDateString(getLocale(), {
                dateStyle: "full",
              }),
            )}
          </div>
          <div className="detail-summary">
            <div>
              <small>{t("กะตามแผน")}</small>
              <b>
                {t(active.shift_start)}
                {t(" – ")}
                {t(active.shift_end)}
              </b>
            </div>
            <div>
              <small>{t("สถานะ")}</small>
              <b>{t(labels[result.status])}</b>
            </div>
          </div>
          {active.source_day_code && (
            <p className="ot-description">
              {t("โค้ดต้นทาง Attendance: ")}
              {t(active.source_day_code)}
              {t(" ·")}
              {t(" ")}
              {t(
                data.shiftOverrides?.[keyOf(active)]
                  ? "เวลากะที่กำหนดเฉพาะวัน"
                  : "เวลากะจาก Master Name",
              )}
              {t(" ")}
            </p>
          )}
          {data.shiftOverrides?.[keyOf(active)] && (
            <p className="ot-description">
              {t("กะที่กำหนดเฉพาะวัน · ")}
              {data.shiftOverrides[keyOf(active)].reason}
            </p>
          )}
          <h4>
            <Fingerprint size={16} />
            {t(" ข้อมูลสแกนดิบ")}
          </h4>
          <div className="raw-logs">
            {result.logs.map((p, i) => (
              <div key={i}>
                <span>
                  {t(
                    p.ms === preview.inMs
                      ? "เข้า"
                      : p.ms === preview.outMs
                        ? "ออก"
                        : "สแกนอื่น",
                  )}
                </span>
                <code>{t(p.punch_timestamp.replace("T", " "))}</code>
                {(p.ms === preview.inMs || p.ms === preview.outMs) && (
                  <Check size={13} />
                )}
              </div>
            ))}
            {!result.logs.length && <p>{t("ไม่พบข้อมูลสแกนในช่วงกะ")}</p>}
          </div>
          <div className="target-box">
            <b>
              {t(
                result.approved
                  ? labels.APPROVED
                  : result.punchedOT > 0
                    ? labels.UNAPPROVED
                    : labels.NORMAL,
              )}
            </b>
            <p>
              {t("OT ทำจริง ")}
              {t(number(preview.punchedOT))}
              {t(" ชม.")}
            </p>
          </div>
          {preview.highOT && (
            <p className="over-alert">
              {t("OT สูงเกินเป้า · x1.5 + x3.0 รวม ")}
              {t(number(preview.monitoredOT))}
              {t(" ชม. กรุณาตรวจสอบภาระงานก่อนยืนยัน")}
            </p>
          )}
          <h4>{t("ชั่วโมงแยกตามตัวคูณ")}</h4>
          {result.approvalNeedsReview && (
            <p className="over-alert">
              {t(
                "ผลจับคู่หรือยอด OT เปลี่ยนจากกฎเดิม กรุณาตรวจสอบและยืนยันใหม่",
              )}
            </p>
          )}
          <p className="ot-description">
            {t("เวลาเริ่มคำนวณ")}: {preview.calculationStart === undefined ? "—" : isoLocal(preview.calculationStart).replace("T", " ")}
            {" · "}{getLocale().startsWith("en") ? "Post-shift OT starts" : "เริ่ม OT หลัง"}: {preview.overtimeStart === undefined ? "—" : isoLocal(preview.overtimeStart).replace("T", " ")}
          </p>
          <label className="sign-off">
            <div>
              <b>{t("หักพัก OT 30 นาที")}</b>
              <small>
                {t(
                  "เลือกได้เมื่อ OT x1.5 / x3.0 ก่อนหักพักเกิน 3.0 ชม.",
                )}
              </small>
            </div>
            <input
              type="checkbox"
              aria-label={t("หักพัก OT 30 นาที")}
              disabled={
                draft.approved ||
                (!preview.canDeductOTBreak && !draft.deductOTBreak)
              }
              checked={Boolean(draft.deductOTBreak)}
              onChange={(e) =>
                setDraft({ ...draft, deductOTBreak: e.target.checked })
              }
            />
          </label>
          <p className="ot-description">
            {t("OT ก่อนหักพัก ")}
            {t(number(preview.grossAfterShiftOT))}
            {t(" ชม.")}
            {t(" · ")}
            {t("หักพัก ")}
            {t(number(preview.otBreakHours))}
            {t(" ชม.")}
            {t(" · ")}
            {t("OT สุทธิ ")}
            {t(number(preview.afterShiftOT))}
            {t(" ชม.")}
          </p>
          <p className="ot-description">
            {t(active.shift_code)}
            {t(" ·")}
            {t(" ")}
            {t(
              dayCodeLabels[active.shift_code] ||
                holidayLabels[active.shift_code] ||
                "กะปกติ 9 ชม. หักพัก 1 ชม. = สุทธิ 8 ชม.",
            )}
          </p>
          <table className="rate-table">
            <thead>
              <tr>
                <th>{t("ตัวคูณ")}</th>
                <th>{t("ทำจริง (ชม.)")}</th>
                <th>{t("ตามสิทธิ์อนุมัติ (ชม.)")}</th>
              </tr>
            </thead>
            <tbody>
              {OT_RATES.map((rate) => {
                return (
                  <tr key={rate}>
                    <th>
                      {t("x")}
                      {t(rate)}
                    </th>
                    <td>{t(number(preview.rawOT[rate]))}</td>
                    <td>{t(number(preview.otByRate[rate]))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <EvidencePanel
            key={keyOf(active)}
            employeeId={active.emp_id}
            date={active.date}
            onBusy={setEvidenceBusy}
          />
          <h4>{t("ปรับปรุงเวลา")}</h4>
          {draft.approved && (
            <p className="lock-note">
              {t("ข้อมูลที่รับรองแล้วถูกล็อก ปิดการรับรองเพื่อแก้ไข")}
            </p>
          )}
          <div className="time-fields">
            <label>
              {t("เวลาเข้า")}
              <input
                ref={inRef}
                aria-invalid={invalidField === "inTime"}
                aria-describedby={
                  invalidField === "inTime"
                    ? "attendance-validation-error"
                    : undefined
                }
                disabled={draft.approved}
                type="datetime-local"
                value={draft.inTime || ""}
                onChange={(e) => {
                  setDraft({ ...draft, inTime: e.target.value });
                  clearField("inTime");
                }}
              />
            </label>
            <label>
              {t("เวลาออก")}
              <input
                ref={outRef}
                aria-invalid={invalidField === "outTime"}
                aria-describedby={
                  invalidField === "outTime"
                    ? "attendance-validation-error"
                    : undefined
                }
                disabled={draft.approved}
                type="datetime-local"
                value={draft.outTime || ""}
                onChange={(e) => {
                  setDraft({ ...draft, outTime: e.target.value });
                  clearField("outTime");
                }}
              />
            </label>
          </div>
          <label className="field">
            {t("เหตุผลในการแก้ไข")}
            <textarea
              ref={reasonRef}
              aria-invalid={invalidField === "reason"}
              aria-describedby={
                invalidField === "reason"
                  ? "attendance-validation-error"
                  : undefined
              }
              placeholder={t("จำเป็นเมื่อเปลี่ยนเวลาหรือหักพัก OT")}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.trim()) clearField("reason");
              }}
            />
          </label>
          <label className="field">
            {t("ผลการทำงาน / หมายเหตุ (ไม่บังคับ)")}
            <textarea
              disabled={draft.approved}
              placeholder={t("ระบุผลการทำงานตามเป้าหมาย OT")}
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
          </label>
          <label className="sign-off">
            <div>
              <b>{t("Supervisor sign-off")}</b>
              <small>{t("ยืนยันความถูกต้องของเวลาและผลงาน")}</small>
            </div>
            <input
              role="switch"
              type="checkbox"
              checked={draft.approved}
              onChange={(e) =>
                setDraft({ ...draft, approved: e.target.checked })
              }
            />
          </label>
          {error && (
            <p className="error" role="alert" id="attendance-validation-error">
              {t(error)}
            </p>
          )}
        </div>
        <div className="drawer-footer">
          <button
            className="button"
            disabled={evidenceBusy}
            onClick={() => onClose()}
          >
            {t("ยกเลิก")}
          </button>
          <button
            className="button primary"
            disabled={evidenceBusy}
            onClick={save}
          >
            <Check size={16} />
            {t(" บันทึกผลตรวจสอบ")}
          </button>
        </div>
      </section>
    </div>
  );
}
