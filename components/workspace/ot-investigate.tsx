"use client";
import { useTranslation } from "@/lib/i18n";
import { number } from "@/lib/workspace";

export default function OTInvestigate({ hours }: { hours: number }) {
  const { t, getLocale } = useTranslation();
  if (!Number.isFinite(hours) || hours < 3) return null;
  const label = getLocale().startsWith("en")
    ? `OT ${number(hours)} h · 3 hours or more: supervisor review recommended`
    : `OT ${number(hours)} ชม. · ตั้งแต่ 3 ชั่วโมงขึ้นไป ควรให้หัวหน้างานตรวจสอบ`;
  return (
    <span
      className="ot-investigate"
      role="img"
      aria-label={t(label)}
      title={t(label)}
    >
      <span
        aria-hidden="true"
        style={{
          fontFamily: "serif",
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {t("i")}
      </span>
    </span>
  );
}
