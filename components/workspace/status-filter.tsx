"use client";
import { useTranslation } from "@/lib/i18n";
import { labels } from "@/lib/workspace";

export default function StatusFilter({
  value,
  onChange,
  approvals = false,
}: {
  value: string;
  onChange: (value: string) => void;
  approvals?: boolean;
}) {
  const { t, getLocale } = useTranslation();
  return (
    <select
      aria-label={t("สถานะ")}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="all">
        {t(approvals ? "รออนุมัติทั้งหมด" : "ทุกสถานะ")}
      </option>
      <option value="issues">{t("รอตรวจสอบทั้งหมด")}</option>
      {!approvals && (
        <optgroup label={t("การอนุมัติ")}>
          <option value="pending">{t("รออนุมัติ")}</option>
          <option value="approved">{t("อนุมัติแล้ว")}</option>
        </optgroup>
      )}
      <optgroup label={t("รายละเอียดที่ต้องตรวจสอบ")}>
        {[
          "MISSING",
          "UNAPPROVED",
          "LATE",
          "OVER",
          "RATE_PENDING",
          "SCHEDULE_CONFLICT",
          "ABSENT",
        ].map((status) => (
          <option key={status} value={status}>
            {t(labels[status])}
          </option>
        ))}
      </optgroup>
      <optgroup label={t("สถานะอื่น ๆ")}>
        {[
          "NORMAL",
          "APPROVED",
          ...(!approvals ? ["OFF", "LEAVE", "RESIGNED"] : []),
        ].map((status) => (
          <option key={status} value={status}>
            {t(labels[status])}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
