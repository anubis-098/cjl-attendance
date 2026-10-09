"use client";
import { useTranslation } from "@/lib/i18n";
export default function Pagination({
  page,
  total,
  pageSize = 25,
  onChange,
  onPageSizeChange,
}: {
  page: number;
  total: number;
  pageSize?: number;
  onChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}) {
  const { t, getLocale } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pagination">
      <span>
        {t(
          total
            ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}`
            : "0",
        )}
        {t(" ")}
        {t("จาก ")}
        {t(total)}
        {t(" รายการ")}
      </span>
      {onPageSizeChange && (
        <label className="page-size-control">
          {t("แสดง")}
          <select
            aria-label={t("จำนวนรายการต่อหน้า")}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {[25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {t(size)}
              </option>
            ))}
          </select>
          {t("รายการต่อหน้า")}
        </label>
      )}
      <button
        className="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        {t("ก่อนหน้า")}
      </button>
      <span>
        {t("หน้า ")}
        {t(page)}
        {t(" / ")}
        {t(pages)}
      </span>
      <button
        className="button"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        {t("ถัดไป")}
      </button>
    </div>
  );
}
