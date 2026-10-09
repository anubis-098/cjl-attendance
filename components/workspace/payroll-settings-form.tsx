"use client";
import { useTranslation } from "@/lib/i18n";
import { useState } from "react";
import { SlidersHorizontal, Wallet, Clock3, Snowflake, Sun, Moon, Building2, Save, ChevronDown } from "lucide-react";
import { useAccount } from "../auth-provider";
import { OT_RATES } from "@/lib/engine";
import { normalizeDepartment } from "@/lib/departments";
import {
  departmentAllowance,
  payrollSettingFields,
  standaloneOTRates,
  payableDailyWage,
  wageServicePercent,
  validatePayrollSettings,
  type PayrollSettings,
  type DepartmentAllowance,
} from "@/lib/payroll-settings";

export default function PayrollSettingsForm({
  month,
  initial,
  saved,
  departments,
  revision,
  onBusy,
  onSaved,
}: {
  month: string;
  initial: PayrollSettings;
  saved: boolean;
  departments: string[];
  revision: number;
  onBusy: (busy: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const { t, getLocale } = useTranslation();
  const canEdit = useAccount().role === "super_admin";
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      payrollSettingFields.map(([key]) => [key, String(key === "wageServicePercent" ? wageServicePercent(initial) : initial[key] ?? 0)]),
    ),
  );
  const [mapping, setMapping] = useState(initial.departments);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const draft = {
    ...initial,
    ...Object.fromEntries(
      payrollSettingFields.map(([key]) => [key, Number(values[key])]),
    ),
    departments: mapping,
  } as PayrollSettings;
  const rates = standaloneOTRates(draft);
  const en = getLocale().startsWith("en");
  const groups = [
    { title: en ? "Base wage & Service" : "ค่าแรงและ Service", icon: Wallet, keys: ["dailyWage", "wageServicePercent", "servicePercent"] },
    { title: en ? "Shift allowances" : "ค่ากะ", icon: Sun, keys: ["morning", "afternoon", "night"] },
    { title: en ? "Department allowances" : "เบี้ยเลี้ยงแผนก", icon: Snowflake, keys: ["seafood", "frozen"] },
  ];
  const icons = { dailyWage: Wallet, wageServicePercent: Wallet, servicePercent: Clock3, morning: Sun, afternoon: Sun, night: Moon, seafood: Wallet, frozen: Snowflake };
  return (
    <section className="panel payroll-settings">
      <details>
        <summary className="payroll-settings-toggle">
          <SlidersHorizontal size={18} aria-hidden="true" />
          <span>{t("อัตราค่าจ้างและเบี้ยเลี้ยง")}</span>
          <small>{month} · {saved ? (en ? "Saved" : "บันทึกแล้ว") : (en ? "Defaults" : "ค่าเริ่มต้น")}</small>
          <ChevronDown size={16} aria-hidden="true" className="rates-chevron" />
        </summary>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || !canEdit) return;
            setError("");
            setBusy(true);
            onBusy(true);
            try {
              const settings = validatePayrollSettings(draft);
              const response = await fetch("/api/payroll", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ month, revision, settings }),
              });
              const result = await response.json();
              if (!response.ok) throw Error(result.error);
              await onSaved();
            } catch (e) {
              setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
            } finally {
              setBusy(false);
              onBusy(false);
            }
          }}
        >
          <fieldset disabled={busy || !canEdit} className={!canEdit ? "money-settings-readonly" : undefined}>
            <div className="payroll-rate-groups">
              {groups.map(group => <section key={group.title} className="payroll-rate-group">
                <h3><group.icon size={16} aria-hidden="true" />{group.title}</h3>
                <div className="payroll-settings-grid">
              {payrollSettingFields.filter(([key]) => group.keys.includes(key)).map(([key, label]) => {
                const Icon = icons[key];
                return (
                <label key={key}>
                  <span><Icon size={14} aria-hidden="true" />{t(label)}{key.endsWith("Percent") ? " (%)" : t(" (บาท)")}</span>
                  <input
                    type="number"
                    min={key === "dailyWage" ? "0.01" : "0"}
                    max={key.endsWith("Percent") ? "100" : "100000"}
                    step="0.01"
                    required
                    value={values[key]}
                    onChange={(e) =>
                      setValues({ ...values, [key]: e.target.value })
                    }
                  />
                </label>
              );})}
                </div>
              </section>)}
            </div>
            <div className="payroll-rate-preview">
              <span>{en ? "OT base / day" : "ฐาน OT / วัน"}: {Number.isFinite(rates["1.0"]) ? payableDailyWage({ ...draft, wageServicePercent: draft.servicePercent ?? 0 }).toFixed(2) : "—"}</span>
              <span>{getLocale().startsWith("en") ? "Daily wage incl. Service" : "ค่าจ้างรายวันรวม Service"}: {Number.isFinite(payableDailyWage(draft)) ? payableDailyWage(draft).toFixed(2) : "—"}</span>
              {OT_RATES.map((rate) => (
                <span key={rate}>
                  {t("x")}
                  {t(rate)}
                  {t(":")}
                  {t(" ")}
                  {t(
                    Number.isFinite(rates[rate]) ? rates[rate].toFixed(2) : "—",
                  )}
                  {t(" ")}
                  {t("บาท/ชม.")}
                </span>
              ))}
            </div>
            <details className="payroll-departments">
              <summary>
                <Building2 size={15} aria-hidden="true" />
                {t("ตรวจประเภทเบี้ยเลี้ยงของแผนก (")}
                {t(departments.length)}
                {t(" แผนก)")}
              </summary>
              <div className="payroll-settings-grid">
                {departments.map((department) => (
                  <label key={department}>
                    {department || t("ไม่ระบุแผนก")}
                    {!Object.hasOwn(mapping, department) &&
                      new Set(
                        Object.entries(mapping)
                          .filter(
                            ([key]) => normalizeDepartment(key) === department,
                          )
                          .map(([, value]) => value),
                      ).size > 1 && (
                        <small>
                          {t(
                            "ชื่อเดิมมีเบี้ยเลี้ยงต่างกัน ยังใช้อัตราเดิมรายคน กรุณาเลือกเพื่อใช้ร่วมกัน",
                          )}
                        </small>
                      )}
                    <select
                      aria-label={t(`เบี้ยเลี้ยงแผนก ${department}`)}
                      value={departmentAllowance(department, draft)}
                      onChange={(e) =>
                        setMapping({
                          ...mapping,
                          [department]: e.target.value as DepartmentAllowance,
                        })
                      }
                    >
                      <option value="none">{t("ไม่มีเบี้ยเลี้ยงแผนก")}</option>
                      <option value="seafood">
                        {t("Seafood · ค่าความคาว")}
                      </option>
                      <option value="frozen">{t("Frozen · ค่าเย็น")}</option>
                    </select>
                  </label>
                ))}
              </div>
            </details>
            <div className="payroll-settings-actions">
            <small>{en ? "This pay month · Local base wages take priority" : "เดือนจ่ายนี้ · ค่าแรงฐานรายบุคคลใช้แทน Global"}</small>
            <button type="submit" className="button primary">
              <Save size={15} aria-hidden="true" />
              {t(busy ? "กำลังบันทึก..." : `บันทึกอัตราเดือน ${month}`)}
            </button>
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="error">
              {t(error)}
            </p>
          )}
        </form>
      </details>
    </section>
  );
}
