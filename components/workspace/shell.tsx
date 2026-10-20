"use client";
import { useTranslation } from "@/lib/i18n";
import {
  Building2,
  Banknote,
  CalendarDays,
  Check,
  History,
  ArrowLeft,
  ArrowUp,
  Search,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useWorkspace } from "./provider";
import { useAccount } from "../auth-provider";
import LanguageSwitcher from "../language-switcher";
import { canManageAttendance, roleLabels } from "@/lib/permissions";
import ReadOnlyWorkspace from "./read-only-workspace";
import WorkspaceSelector from "./workspace-selector";
export default function Shell({ children }: { children: ReactNode }) {
  const { t, getLocale } = useTranslation();
  const { toast, setToast, data, globalEmployeeSearch, setGlobalEmployeeSearch } = useWorkspace();
  const pathname = usePathname();
  const router = useRouter();
  const account = useAccount();
  const globalSearchHasResults = useMemo(() => {
    const query = globalEmployeeSearch.trim().toLocaleLowerCase();
    return query
      ? data.shifts.some((shift) =>
          `${shift.emp_id} ${shift.emp_name} ${shift.agency}`
            .toLocaleLowerCase()
            .includes(query),
        )
      : null;
  }, [data.shifts, globalEmployeeSearch]);
  const title: Record<string, string> = {
    "/attendance": "Attendance",
    "/approvals": "Approvals",
    "/audit-log": "Audit log",
    "/employees": "Employees",
    "/fingerprints": "Fingerprint logs",
    "/normal-hours": "Normal hours",
    "/overtime": "Overtime",
    "/payroll": "Monthly OT pay",
    "/accounts": "Accounts & Permissions",
    "/account": "My account",
  };
  return (
    <div className="app-shell">
      {t(" ")}
      <aside className="sidebar">
        <Link className="brand" href="/attendance" prefetch={false}>
          <span className="brand-icon">
            <Image
              src="/branding/cj-logistics.png"
              alt={t("CJ Logistics")}
              width={190}
              height={64}
              unoptimized
            />
          </span>
          {t("CJ Agent")}
          <span className="brand-dot">{t(".")}</span>
        </Link>
        <WorkspaceSelector />
        <div className="nav-label">{t("WORKSPACE")}</div>
        {[
          ["/attendance", "ภาพรวมเวลาทำงาน", CalendarDays],
          ["/employees", "ข้อมูลพนักงาน", Building2],
          ["/approvals", "รายการรออนุมัติ", ShieldCheck],
          ["/payroll", "คำนวณเงินโอที", Banknote],
          ["/audit-log", "ประวัติการตรวจสอบ", History],
          ["/fingerprints", "เวลาสแกนนิ้ว", History],
        ].filter(([href]) => canManageAttendance(account.role) || href === "/attendance").map(([href, label, Icon]) => {
          const Component = Icon as typeof CalendarDays;
          const active =
            pathname === href ||
            (href === "/employees" && pathname.startsWith("/employees/"));
          return (
            <Link
              key={String(href)}
              href={String(href)}
              prefetch={false}
              aria-label={t(String(label))}
              aria-current={active ? "page" : undefined}
              className={active ? "nav active" : "nav"}
            >
              <Component size={18} />
              {t(String(label))}
            </Link>
          );
        })}
        {t(" ")}
        {account.role === "super_admin" && (
          <Link
            className={pathname === "/accounts" ? "nav active" : "nav"}
            href="/accounts"
            prefetch={false}
          >
            <Settings2 size={18} />
            {t("จัดการบัญชี")}
          </Link>
        )}
        <div className="profile">
          <div className="avatar">{t("CJ")}</div>
          <div>
            <b>{account.displayName}</b>
            <small>
              {t(roleLabels[account.role])}
            </small>
          </div>
          <Link href="/account" aria-label={t("ตั้งค่าบัญชี")}>
            <Settings2 size={16} />
          </Link>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-heading">
            <button
              type="button"
              className="page-back-button"
              aria-label={t("Go back")}
              title={t("Go back")}
              onClick={() => {
                if (window.history.length > 1) window.history.back();
                else router.push("/attendance");
              }}
            >
              <ArrowLeft size={17} />
            </button>
            {t("Workspace ")}
            <span>{t("/")}</span>
            <strong>
              {t(
                title[pathname] ||
                  (pathname.startsWith("/employees/")
                    ? "Employee calendar"
                    : "Workspace"),
              )}
            </strong>
          </div>
          <label
            className="topbar-search"
            data-active={Boolean(globalEmployeeSearch.trim())}
            data-result={globalSearchHasResults === null ? "idle" : globalSearchHasResults ? "found" : "empty"}
          >
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              aria-label={t("Search employees by ID, name, or agency")}
              placeholder={t("Search employees by ID, name, or agency")}
              value={globalEmployeeSearch}
              onChange={(event) => setGlobalEmployeeSearch(event.target.value)}
            />
            <button
              type="button"
              aria-label={t("Clear filter")}
              title={t("Clear filter")}
              disabled={!globalEmployeeSearch}
              onClick={() => setGlobalEmployeeSearch("")}
            >
              <X size={16} />
            </button>
          </label>
          <div className="topbar-right">
            <span className="local-tag">
              <span className="green-dot" />
              {t("Connected")}
            </span>
            <LanguageSwitcher />
            <button
              className="button"
              onClick={async () => {
                try {
                  const response = await fetch("/api/auth/logout", {
                    method: "POST",
                  });
                  if (!response.ok) throw Error();
                  window.location.replace("/login");
                } catch {
                  setToast("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
                }
              }}
            >
              {t("ออกจากระบบ")}
            </button>
          </div>
        </header>
        <main>
          {!canManageAttendance(account.role) && pathname !== "/account" ? <ReadOnlyWorkspace /> : children}
          <footer className="page-footer">
            <span>
              <ShieldCheck size={13} />
              {t("ข้อมูลจริงจากฐานข้อมูลพนักงานและเวลาสแกนนิ้ว")}
            </span>
            <span>{t("CJ AGENT · ATTENDANCE & OT RECONCILIATION")}</span>
          </footer>
        </main>
      </div>
      <button
        type="button"
        className="scroll-top-button"
        aria-label={t("Scroll to top")}
        title={t("Scroll to top")}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <ArrowUp size={19} />
      </button>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {t(toast)}
          <button aria-label={t("ปิดข้อความ")} onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
