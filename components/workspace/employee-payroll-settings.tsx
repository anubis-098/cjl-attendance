"use client";

import { useEffect, useState } from "react";
import { BadgeDollarSign, CalendarDays, Check, X } from "lucide-react";
import { useAccount } from "../auth-provider";
import { useTranslation } from "@/lib/i18n";
import { useWorkspace } from "./provider";
import type { PayrollSettings } from "@/lib/payroll-settings";
import { payableDailyWage, wageServicePercent } from "@/lib/payroll-settings";

export default function EmployeePayrollSettings({
  employeeId,
  month,
  compact = false,
}: {
  employeeId: string;
  month: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { getLocale } = useTranslation();
  const label = (th: string, en: string) =>
    getLocale().startsWith("en") ? en : th;
  const title = label("ตั้งค่าเรทเงินรายบุคคล", "Employee pay rate");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <section
        className={`employee-payroll-settings${compact ? " employee-payroll-settings-compact" : " panel"}`}
      >
        <button
          type="button"
          className="button employee-rate-open-button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <BadgeDollarSign size={16} aria-hidden="true" />
          {title}
        </button>
      </section>
      {open && (
        <div
          className="employee-rate-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            className="employee-rate-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-rate-title"
          >
            <header className="employee-rate-header">
              <span className="employee-rate-header-icon">
                <BadgeDollarSign size={22} aria-hidden="true" />
              </span>
              <div>
                <h2 id="employee-rate-title">{title}</h2>
                <p>{employeeId}</p>
              </div>
              <button
                type="button"
                className="button employee-rate-close"
                aria-label={label("ปิด", "Close")}
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </header>
            <RateForm
              employeeId={employeeId}
              month={month}
              onClose={() => setOpen(false)}
            />
          </section>
        </div>
      )}
    </>
  );
}

function RateForm({
  employeeId,
  month,
  onClose,
}: {
  employeeId: string;
  month: string;
  onClose: () => void;
}) {
  const canEdit = useAccount().role === "super_admin";
  const { refresh, setToast } = useWorkspace();
  const { getLocale } = useTranslation();
  const label = (th: string, en: string) =>
    getLocale().startsWith("en") ? en : th;
  const [payMonth, setPayMonth] = useState(month);
  const [data, setData] = useState<{
    global: PayrollSettings;
    revision: number;
    local: { dailyWage: number } | null;
  } | null>(null);
  const [inherit, setInherit] = useState(true);
  const [wage, setWage] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setMessage("");
    fetch(
      `/api/employee-payroll?${new URLSearchParams({ month: payMonth, employeeId })}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (response) => {
        if (!response.ok) throw Error();
        return response.json();
      })
      .then((body) => {
        if (controller.signal.aborted) return;
        setData(body);
        setInherit(!body.local);
        setWage(String(body.local?.dailyWage ?? body.global.dailyWage));
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setMessage(label("โหลดข้อมูลไม่สำเร็จ", "Could not load rates"));
      });
    return () => controller.abort();
  }, [employeeId, payMonth]);

  const effectiveWage = inherit
    ? data?.global.dailyWage ?? 0
    : Number(wage || 0);
  const payableWage = data
    ? payableDailyWage({ ...data.global, dailyWage: effectiveWage })
    : 0;

  return (
    <form
      className="employee-rate-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!canEdit || busy || !data) return;
        setBusy(true);
        setMessage("");
        try {
          const response = await fetch("/api/employee-payroll", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              month: payMonth,
              employeeId,
              revision: data.revision,
              dailyWage: inherit ? null : Number(wage),
            }),
          });
          const body = await response.json();
          if (!response.ok) throw Error(body.error);
          await refresh();
          setToast(label("บันทึกเรทเงินแล้ว", "Pay rate saved"));
          onClose();
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : label("บันทึกไม่สำเร็จ", "Could not save"),
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="employee-rate-month">
        <span>
          <CalendarDays size={15} aria-hidden="true" />
          {label("เดือนจ่าย", "Pay month")}
        </span>
        <input
          type="month"
          value={payMonth}
          disabled={busy}
          onChange={(event) => {
            if (event.target.value) setPayMonth(event.target.value);
          }}
        />
      </label>

      {!data ? (
        <div className="employee-rate-loading" role="status">
          {label("กำลังโหลดเรทเงิน…", "Loading pay rates…")}
        </div>
      ) : (
        <>
          <fieldset
            disabled={!canEdit || busy}
            className={`employee-rate-fields${!canEdit ? " money-settings-readonly" : ""}`}
          >
            <label className="employee-rate-inherit">
              <input
                type="checkbox"
                checked={inherit}
                onChange={(event) => setInherit(event.target.checked)}
              />
              <span>
                <b>{label("ใช้เรท Global", "Use global rate")}</b>
                <small>
                  {label(
                    "ใช้ค่าจ้างส่วนกลางสำหรับเดือนที่เลือก",
                    "Use the global wage for this pay month",
                  )}
                </small>
              </span>
              {inherit && <Check size={17} aria-hidden="true" />}
            </label>

            <label className="employee-rate-wage">
              <span>{label("ค่าแรงฐาน / วัน", "Base daily wage")}</span>
              <div>
                <input
                  type="number"
                  min="0.01"
                  max="100000"
                  step="0.01"
                  required
                  disabled={inherit}
                  value={inherit ? data.global.dailyWage : wage}
                  onChange={(event) => setWage(event.target.value)}
                />
                <span>THB / day</span>
              </div>
            </label>
          </fieldset>

          <section className="employee-rate-summary" aria-live="polite">
            <span>{label("ค่าจ้างรวม Service", "Daily wage incl. Service")}</span>
            <b>
              {payableWage.toLocaleString(getLocale(), {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              <small> {label("บาท/วัน", "THB/day")}</small>
            </b>
            <small>
              {label("ค่าแรงฐาน", "Base wage")} {effectiveWage.toLocaleString(getLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {" + Service "}
              {wageServicePercent(data.global)}%
            </small>
          </section>

          <p className="employee-rate-note">
            {label(
              "ใช้กับรอบจ่ายเดือนที่เลือก (รอบ 26–25) และแทนเรท Global เฉพาะพนักงานคนนี้",
              "Applies to the selected pay month (26th–25th cycle) and overrides the global rate for this employee.",
            )}
          </p>
          {!canEdit && (
            <p className="employee-rate-readonly-note">
              {label(
                "แก้ไขเรทเงินได้เฉพาะ Super Admin",
                "Only Super Admin can edit pay rates",
              )}
            </p>
          )}
        </>
      )}

      {message && (
        <p role="alert" className="employee-rate-error">
          {message}
        </p>
      )}
      <footer className="employee-rate-footer">
        <button
          className="button employee-rate-cancel"
          type="button"
          disabled={busy}
          onClick={onClose}
        >
          {label("ยกเลิก", "Cancel")}
        </button>
        <button
          className="button primary employee-rate-save"
          type="submit"
          disabled={!canEdit || busy || !data}
        >
          {busy ? label("กำลังบันทึก…", "Saving…") : label("บันทึกเรทเฉพาะคนนี้", "Save employee rate")}
        </button>
      </footer>
    </form>
  );
}
