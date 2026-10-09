"use client";
import { useTranslation } from "@/lib/i18n";
import { number } from "@/lib/workspace";
import { Activity, Clock3, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import type { AttendanceData } from "./use-attendance";
export default function SummaryCards({ model, presence, compact = false }: { model: AttendanceData; compact?: boolean; presence?: { count: number; dates: string[]; today: boolean; scheduledCount: number; scheduledDate: string } }) {
  const { t, getLocale } = useTranslation();
  const { totals, employeeCount } = model;
  return (
    <div className={`stats${presence || compact ? " attendance-stats" : ""}`}>
      {presence ? <button type="button" className="stat" data-testid="scheduled-today"
        onClick={() => model.setFilters(p => ({ ...p, date: presence.scheduledDate, rangeEnd: presence.scheduledDate, view: "range" }))}>
        <div className="stat-label">{t("พนักงานตามกะในวันนี้")}<Users size={16} /></div>
        <div className="stat-value">{presence.scheduledCount.toLocaleString(getLocale())}<small>{t("คน")}</small></div>
        <div className="stat-foot">{presence.scheduledDate} · {t("ดูตารางวันนี้ →")}</div>
      </button> : <Link
        prefetch={false}
        href="/employees"
        className="stat"
        aria-label={t("พนักงานทั้งหมด")}
      >
        <div className="stat-label">
          {t("พนักงานทั้งหมด ")}
          <Users size={17} />
        </div>
        <div className="stat-value">
          {t(employeeCount)}
          <small>{t("คน")}</small>
        </div>
        <div className="stat-foot">{t("ดูฐานข้อมูลพนักงานทั้งหมด →")}</div>
      </Link>}
      {presence ? <div className="stat attendance-presence" data-testid="attendance-presence">
        <div className="stat-label">{t("พนักงานที่มีสแกน")}<Users size={17} /></div>
        <div className="stat-value">{presence.count.toLocaleString(getLocale())}<small>{t("คน")}</small></div>
        <div className="stat-foot" title={presence.dates.join(", ")}>{presence.today ? t("วันนี้") : t("วันที่เลือก")}: {presence.dates.length === 1 ? presence.dates[0] : `${presence.dates.length} ${t("วัน")}`}</div>
      </div> : <Link
        prefetch={false}
        href="/normal-hours"
        className="stat"
        aria-label={t("ชั่วโมงทำงานปกติ")}
      >
        <div className="stat-label">
          {t("ชั่วโมงทำงานปกติ ")}
          <Clock3 size={17} />
        </div>
        <div className="stat-value">
          {t(number(totals.normal))}
          <small>{t("ชม.")}</small>
        </div>
        <div className="stat-foot">{t("ดูรายละเอียดชั่วโมงปกติ →")}</div>
      </Link>}
      <Link
        prefetch={false}
        href="/overtime"
        className="stat"
        aria-label={t("OT ยืนยันแล้ว / ทำจริง")}
      >
        <div className="stat-label">
          {t("OT ยืนยันแล้ว / ทำจริง ")}
          <Activity size={17} />
        </div>
        <div className="stat-value">
          {t(number(totals.ot))}
          <span className="stat-denominator">
            {t(" ")}
            {t("/ ")}
            {t(number(totals.requested))}
          </span>
          <small>{t("ชม.")}</small>
        </div>
        <div className="stat-foot">{t("ดูรายงาน OT และตัวคูณ →")}</div>
      </Link>
      <Link
        prefetch={false}
        href="/approvals"
        className="stat"
        aria-label={t("รอการอนุมัติ")}
      >
        <div className="stat-label">
          {t("รอการอนุมัติ ")}
          <ShieldCheck size={17} />
        </div>
        <div className="stat-value">
          {t(totals.pending)}
          <small>{t("รายการ")}</small>
        </div>
        <div className="stat-foot amber-text">
          {t("ตรวจสอบและรับรองรายการ →")}
        </div>
      </Link>
    </div>
  );
}
