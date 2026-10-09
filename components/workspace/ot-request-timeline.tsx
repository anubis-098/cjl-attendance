"use client";
import { useTranslation } from "@/lib/i18n";
import { clock, isoLocal } from "@/lib/engine";

export default function OTRequestTimeline({ start, end, before, after, date }: {
  start: number; end: number; before: number; after: number; date: string;
}) {
  const { t } = useTranslation();
  const from = start - before * 3600000, to = end + after * 3600000;
  if (![from, to, start, end].every(Number.isFinite) || to <= from) return null;
  const style = (a: number, b: number) => ({ left: `${(a - from) / (to - from) * 100}%`, width: `${(b - a) / (to - from) * 100}%` });
  const time = (value: number) => {
    const day = isoLocal(value).slice(0, 10);
    return `${clock(value)}${day === date ? "" : ` (${day})`}`;
  };
  return <div className="shift-preview-chart ot-request-chart" role="group" aria-label={t("กราฟิกเวลาขอ OT")}>
    <strong>{t("แผนเวลาที่ขอ")}</strong>
    <div className="shift-preview-axis"><span>{time(from)}</span><span>{time(to)}</span></div>
    <div className="shift-preview-row"><span>{t("กะตามแผน")}</span><div className="shift-preview-track"><i className="preview-plan" style={style(start, end)} title={`${time(start)} – ${time(end)}`} /></div></div>
    <div className="shift-preview-row"><span>{t("OT ก่อนกะ")}</span><div className="shift-preview-track">{before > 0 ? <i className="preview-ot" style={style(from, start)} title={`${time(from)} – ${time(start)} · ${before} ${t("ชม.")}`} /> : <span className="preview-incomplete">—</span>}</div></div>
    <div className="shift-preview-row"><span>{t("OT หลังกะ")}</span><div className="shift-preview-track">{after > 0 ? <i className="preview-ot" style={style(end, to)} title={`${time(end)} – ${time(to)} · ${after} ${t("ชม.")}`} /> : <span className="preview-incomplete">—</span>}</div></div>
    <div className="shift-preview-legend"><span><i className="preview-plan" />{t("กะตามแผน")}</span><span><i className="preview-ot" />{t("ช่วง OT ที่ขอ")}</span></div>
    <div className="ot-request-chart-summary"><span>{t("OT ก่อนกะ")}: {before} {t("ชม.")}</span><span>{t("OT หลังกะ")}: {after} {t("ชม.")}</span></div>
  </div>;
}
