"use client";
import { useTranslation } from "@/lib/i18n";
import { clock, isoLocal, type Shift } from "@/lib/engine";
import { actualCardStatus, type ActualInterval } from "@/lib/actual-timeline";
import OTInvestigate from "./ot-investigate";
import { Check } from "lucide-react";
import { workTime } from "@/lib/work-time";
import { shiftWindow } from "@/lib/shift-window";

export default function ActualCard({
  actual,
  shift,
  approved = false,
  deductOTBreak = false,
}: {
  actual: ActualInterval;
  shift: Shift;
  approved?: boolean;
  deductOTBreak?: boolean;
}) {
  const { t } = useTranslation();
  const monitoredHours = actualCardStatus(actual, shift, deductOTBreak) === "actual-ot"
    && actual.inMs !== undefined && actual.outMs !== undefined
    ? workTime(actual.inMs, actual.outMs, deductOTBreak, shiftWindow(shift, shift.date)).overtimeHours : 0;
  return (
    <>
      <OTInvestigate hours={monitoredHours} />
      <span className="actual-card-time">
        <b>{actual.inMs === undefined ? "--:--" : clock(actual.inMs)}</b>
        <span>–</span>
        <b>{actual.outMs === undefined ? "--:--" : clock(actual.outMs)}</b>
      </span>
      <small>
        {t(
          actual.estimated
            ? "เวลาคาดการณ์"
            : actual.uncertain
              ? "คู่สแกนรอตรวจสอบ"
              : actual.reviewed ? "เวลาที่หัวหน้างานแก้ไข" : "Actual · เวลาสแกน",
        )}
      </small>
      <small className="actual-master-time">
        {t("Master")}: {shift.shift_code} {shift.shift_start}–{shift.shift_end}
      </small>
      {(actual.estimated || actual.uncertain) && (
        <span className="missing-check" aria-label={t("รอตรวจสอบ")}>
          !
        </span>
      )}
      {approved && (
        <span className="confirmed-check" aria-label={t("ยืนยันแล้ว")}>
          <Check size={12} strokeWidth={3} />
        </span>
      )}
    </>
  );
}

export function ActualCalendarLegend() {
  const { t } = useTranslation();
  return (
    <p className="actual-calendar-legend">
      {t(
        "ปฏิทิน Actual: แสดงเวลาสแกนจริง · ฟ้า = งานปกติ · เหลือง = มี OT · เขียว = ยืนยันแล้ว · แดง = สแกนไม่ครบ/กำกวม",
      )}
    </p>
  );
}

export function ActualNotice({ actual, compact = false }: { actual: ActualInterval; compact?: boolean }) {
  const { t } = useTranslation();
  const period = !actual.estimated && !actual.uncertain && actual.inMs !== undefined && actual.outMs !== undefined
    ? workTime(actual.inMs, actual.outMs) : undefined;
  return (
    <div
      className={`actual-notice ${actual.estimated || actual.uncertain ? "needs-review" : ""}`}
    >
      <b>{t(actual.reason)}</b>
      <p>
        {actual.inMs === undefined ? "--:--" : isoLocal(actual.inMs).replace("T", " ")} →{" "}
        {actual.outMs === undefined ? "--:--" : isoLocal(actual.outMs).replace("T", " ")}
      </p>
      {!compact && period && (
        <p className="actual-calculation-times">
          {t("เวลาเริ่มคำนวณ")}: {clock(period.calculationStart)}
          {" · "}{t("เริ่ม OT หลังงาน 8 ชม. + พัก 1 ชม.")}: {isoLocal(period.overtimeStart).replace("T", " ")}
        </p>
      )}
      {!compact && <><small>{t("นาที 01–20 ปัดลงต้นชั่วโมง หลังนาที 20 ปัดขึ้น · เวลาสแกนจริงไม่เปลี่ยน")}</small>
      <br />
      <small>
        {t(
          "ช่วง Actual ใช้แสดงผลเท่านั้น ตรวจสอบเวลาเข้า–ออกและกะก่อนยืนยัน ไม่ใช้เวลาคาดการณ์คำนวณเงิน",
        )}
      </small>
      </>}
    </div>
  );
}
