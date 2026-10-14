"use client";
import { useTranslation } from "@/lib/i18n";
import { useState } from "react";
import type { Shift } from "@/lib/engine";
import type { ShiftOverride } from "@/lib/shift-overrides";
export default function ShiftEditor({
  shifts,
  employee,
  count,
  saving,
  onConfirm,
  onSelectAll,
  onClear,
}: {
  shifts: Shift[];
  employee?: Shift;
  count: number;
  saving: boolean;
  onConfirm: (
    change: Omit<ShiftOverride, "reason"> | null,
    reason: string,
  ) => Promise<void>;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const { t, getLocale } = useTranslation();
  const [code, setCode] = useState(
    ["M", "D", "A", "N"].includes(
      employee?.base_shift_code || employee?.shift_code || "",
    )
      ? employee!.base_shift_code || employee!.shift_code
      : "M",
  );
  const [start, setStart] = useState(employee?.shift_start || "08:00"),
    [end, setEnd] = useState(employee?.shift_end || "17:00");
  const [reason, setReason] = useState("");
  const presets = [
    ...new Set(
      [
        "A|16:00|01:00",
        ...shifts.map(
          (s) =>
            `${s.base_shift_code || s.shift_code}|${s.shift_start}|${s.shift_end}`,
        ),
      ],
    ),
  ]
    .filter((s) => /^[MDAN]\|/.test(s))
    .sort();
  return (
    <form
      className="payroll-settings"
      onSubmit={(e) => {
        e.preventDefault();
        if (!saving && count)
          void onConfirm(
            code === "RESET" ? null : { code, start, end },
            reason,
          );
      }}
    >
      <h3>{t("เปลี่ยนกะเฉพาะวันที่เลือก")}</h3>
      <fieldset disabled={saving}>
        <div className="payroll-settings-grid">
          <label>
            {t("ใช้เวลากะที่มีในระบบ")}
            <select
              aria-label={t("ใช้เวลากะที่มีในระบบ")}
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                const [c, a, b] = e.target.value.split("|");
                setCode(c);
                setStart(a);
                setEnd(b);
              }}
            >
              <option value="">{t("เลือกต้นแบบ หรือกำหนดเวลาเอง")}</option>
              {presets.map((p) => (
                <option key={p} value={p}>
                  {t(p.replaceAll("|", " · "))}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("กะใหม่")}
            <select
              aria-label={t("กะใหม่")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            >
              <option value="M">{t("M · กะเช้า")}</option>
              <option value="D">{t("D · กะเช้าไม่มีค่ากะ")}</option>
              <option value="A">{t("A · กะบ่าย")}</option>
              <option value="N">{t("N · กะดึก")}</option>
              <option value="RESET">{t("คืนค่ากะเดิม")}</option>
            </select>
          </label>
          {code !== "RESET" && (
            <>
              <label>
                {t("เวลาเริ่มกะใหม่")}
                <input
                  aria-label={t("เวลาเริ่มกะใหม่")}
                  type="time"
                  required
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label>
                {t("เวลาสิ้นสุดกะใหม่")}
                <input
                  aria-label={t("เวลาสิ้นสุดกะใหม่")}
                  type="time"
                  required
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
            </>
          )}
          <label>
            {t("เหตุผลเปลี่ยนกะ")}
            <input
              aria-label={t("เหตุผลเปลี่ยนกะ")}
              required
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("เช่น เปลี่ยนกะตามที่หัวหน้ายืนยัน")}
            />
          </label>
        </div>
        <p>
          {t(code !== "RESET" && end < start ? "เวลาออกเป็นวันถัดไป · " : "")}
          {t("เลือกช่องวันที่ด้านล่าง · ไม่เปลี่ยนรหัสวันหยุดหรือวันลา")}
        </p>
        <p>
          {t(
            "บันทึกแล้วจะจับสแกนใหม่ ล้างเวลาเข้า–ออกที่แก้ด้วยมือในวันที่เลือก และเปิดการยืนยันของวันนั้นกับวันข้างเคียงให้ตรวจสอบใหม่ เก็บค่าเดิมไว้ในประวัติ",
          )}
        </p>
        <div className="month-controls">
          <button type="button" className="button" onClick={onSelectAll}>
            {t("เลือกทุกวันในเดือน")}
          </button>
          <button type="button" className="button" onClick={onClear}>
            {t("ล้างวันที่เลือก")}
          </button>
          <span role="status">
            {t("เลือก ")}
            {t(count)}
            {t(" วัน")}
          </span>
          <button
            className="button calendar-confirm"
            type="submit"
            disabled={!count || !reason.trim()}
          >
            {t(saving ? "กำลังบันทึก..." : `ยืนยันเปลี่ยนกะ (${count})`)}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
