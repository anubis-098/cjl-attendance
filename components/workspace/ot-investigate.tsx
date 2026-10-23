"use client";
import { useTranslation } from "@/lib/i18n";
import { number } from "@/lib/workspace";
import { Clock } from "lucide-react";

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
      <Clock size={13} strokeWidth={2.5} aria-hidden="true" />
    </span>
  );
}
