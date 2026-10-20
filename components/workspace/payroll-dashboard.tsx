"use client";
import { useTranslation } from "@/lib/i18n";
import type { PayrollCard } from "@/lib/payroll-dashboard";
const summaryTitles = new Set(["รวมค่ากะ", "รวมค่าเย็นคาว", "รวมค่าเย็น + คาว", "รวมค่าโอที", "รวมเงินได้ทั้งหมด"]);

export default function PayrollDashboard({
  cards,
  selectedCount,
  loading,
}: {
  cards: PayrollCard[];
  selectedCount: number;
  loading: boolean;
}) {
  const { t, getLocale } = useTranslation();
  const groupTitles = ["ค่าโอที", "ค่ากะ", "เบี้ยเลี้ยง", "ค่าจ้างและรายได้รวม"];
  const groups = [
    cards.filter(c => c.title.startsWith("OT x") || c.title === "รวมค่าโอที"),
    cards.filter(c => ["ค่ากะเช้า", "ค่ากะบ่าย", "ค่ากะดึก", "รวมค่ากะ"].includes(c.title)),
    cards.filter(c => ["ค่าความคาว", "ค่าความเย็น", "รวมค่าเย็นคาว", "รวมค่าเย็น + คาว"].includes(c.title)),
    cards.filter(c => ["ค่าวันหยุดนักขัตฤกษ์", "วันหยุดประจำสัปดาห์", "วันทำงานปกติ", "รวมเงินได้ทั้งหมด"].includes(c.title)),
  ];
  const summaryCards = cards.filter(card => summaryTitles.has(card.title));
  const detailGroups = groups.map(group => group.filter(card => !summaryTitles.has(card.title)));
  return (
    <section className="panel payroll-dashboard" aria-busy={loading}>
      <div className="salary-visibility-heading">
        <h2>{t("สรุปค่าจ้างรายเดือน")}</h2>
        <span className="payroll-selection-badge" role="status">
          {t("เลือกแล้ว")} {selectedCount.toLocaleString(getLocale())} {t("คน")}
        </span>
      </div>
      <p className="payroll-dashboard-description">
        {t(
          "เฉพาะพนักงานที่เลือก · OT ค่ากะ และเบี้ยเลี้ยงเฉพาะที่ยืนยันแล้ว · จำนวนวันรวมเป็นคน-วัน",
        )}
      </p>
      {selectedCount === 0 && <p className="payroll-selection-hint">{t("ติ๊กเลือกหน้าชื่อพนักงานในตารางเพื่อแสดงยอดบน Dashboard")}</p>}
      <div className="payroll-dashboard-layout">
      <div className="payroll-dashboard-details">{detailGroups.map((group, index) => <section className="payroll-dashboard-group" aria-label={t(groupTitles[index])} key={index}>
        <h3 className="payroll-group-heading">{t(groupTitles[index])}</h3>
        <div className="payroll-dashboard-grid">
        {group.map((card) => (
          <article
            className={`payroll-dashboard-card${summaryTitles.has(card.title) ? " is-total" : ""}`}
            key={card.title}
          >
            <h3>{t(card.title)}</h3>
            <div className="payroll-dashboard-count">
              {loading || selectedCount === 0
                ? "—"
                : card.count.toLocaleString(getLocale(), {
                    maximumFractionDigits: 2,
                  })}{" "}
              <span>{t(card.unit)}</span>
            </div>
            <div className="payroll-dashboard-money">
              {loading || selectedCount === 0
                ? "—"
                : card.amount === null
                  ? t("รอระบุอัตรา")
                  : card.amount.toLocaleString(getLocale(), {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
              <span>{t("บาท")}</span>
            </div>
          </article>
        ))}
        </div>
      </section>)}</div>
      <aside className="payroll-dashboard-summary" aria-label={t("ยอดสรุป")}>
        <h3>{t("ยอดสรุป")}</h3>
        <div className="payroll-dashboard-summary-grid">{summaryCards.map(card => (
          <article className={`payroll-dashboard-card is-total${card.title === "รวมเงินได้ทั้งหมด" ? " is-grand-total" : ""}`} key={card.title}>
            <h3>{t(card.title)}</h3>
            <div className="payroll-dashboard-count">{loading || selectedCount === 0 ? "—" : card.count.toLocaleString(getLocale(), { maximumFractionDigits: 2 })} <span>{t(card.unit)}</span></div>
            <div className="payroll-dashboard-money">{loading || selectedCount === 0 ? "—" : card.amount === null ? t("รอระบุอัตรา") : card.amount.toLocaleString(getLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span>{t("บาท")}</span></div>
          </article>
        ))}</div>
      </aside>
      </div>
      <p className="payroll-dashboard-note">
        {t(
          "ค่าจ้างวันหยุดจ่ายเฉพาะ PH/PH8 · วันหยุดประจำสัปดาห์นับวันที่มาทำงานจริง เงินแสดงเฉพาะ OT ยืนยันแล้ว x2.0/x3.0 ซึ่งรวมในยอด OT อยู่แล้ว ไม่บวกซ้ำ · รวมเงินได้เป็นยอดก่อนหักเงิน",
        )}
      </p>
    </section>
  );
}
