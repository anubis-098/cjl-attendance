"use client";
import { useTranslation } from "@/lib/i18n";
export default function Loading() {
  const { t } = useTranslation();
  return (
    <div className="empty" role="status">
      {t("กำลังโหลดหน้า...")}
    </div>
  );
}
