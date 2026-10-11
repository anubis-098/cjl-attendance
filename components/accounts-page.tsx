"use client";
import { useTranslation } from "@/lib/i18n";
import { useCallback, useEffect, useId, useState } from "react";
import { useAccount } from "./auth-provider";
import { CircleAlert } from "lucide-react";
import { roleLabels, type AccountRole } from "@/lib/permissions";
function MissingEmail() {
  const { t, getLocale } = useTranslation();
  const id = useId();
  return (
    <span className="account-email-warning">
      <button
        type="button"
        aria-label={t("ยังไม่ได้กรอก Email")}
        aria-describedby={id}
      >
        <CircleAlert size={17} aria-hidden="true" />
      </button>
      <span id={id} role="tooltip" className="account-email-tooltip">
        {t("แนะนำให้กรอก Email สำหรับบัญชีนี้ (ไม่บังคับ)")}
      </span>
    </span>
  );
}
type Row = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  employeeId: string;
  active: boolean;
  version: number;
};
const blank = {
  id: "",
  username: "",
  displayName: "",
  email: "",
  role: "supervisor",
  employeeId: "",
  active: true,
  version: 0,
  password: "",
};
export default function AccountsPage() {
  const { t, getLocale } = useTranslation();
  const me = useAccount();
  const [rows, setRows] = useState<Row[]>([]),
    [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [history, setHistory] = useState<
    { actor: string; action: string; username: string; created_at: string }[]
  >([]);
  const load = useCallback(async () => {
    const res = await fetch("/api/accounts", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw Error(data.error);
    setRows(data.accounts);
    setHistory(data.history);
  }, []);
  useEffect(() => {
    load().catch((e) => setMessage(e.message));
  }, [load]);
  async function save(method: string, body: unknown) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/accounts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw Error(result.error);
      if (result.requiresLogin) {
        location.replace("/login");
        return;
      }
      await load();
      setEditing(false);
      setForm(blank);
      setMessage("บันทึกบัญชีเรียบร้อยแล้ว");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="accounts-page">
      <div className="page-heading">
        <div>
          <h1>{t("จัดการบัญชีและสิทธิ์")}</h1>
          <p>
            {t(
              "Guest ดูเวลาเท่านั้น · Employee ดูเฉพาะตนเอง · ทั้งสองระดับไม่เห็นข้อมูลการเงิน",
            )}
          </p>
        </div>
        <button
          className="button primary"
          disabled={busy}
          onClick={() => {
            setForm(blank);
            setEditing(true);
            setMessage("");
          }}
        >
          {t("สร้างบัญชี")}
        </button>
      </div>
      {message && <p role="status">{t(message)}</p>}
      {editing && (
        <form
          className="panel account-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save(form.id ? "PUT" : "POST", form);
          }}
        >
          <h2>{t(form.id ? "แก้ไขบัญชี" : "สร้างบัญชีใหม่")}</h2>
          <fieldset disabled={busy}>
            <label>
              {t("ชื่อผู้ใช้")}
              <input
                autoFocus
                required
                pattern="[a-zA-Z0-9._\-]{3,64}"
                minLength={3}
                maxLength={64}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoComplete="off"
              />
            </label>
            <label>
              {t("ชื่อแสดง")}
              <input
                required
                maxLength={100}
                value={form.displayName}
                onChange={(e) =>
                  setForm({ ...form, displayName: e.target.value })
                }
              />
            </label>
            <div className="account-email-field">
              <label>
                {t("Email (ไม่บังคับ)")}
                <input
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  placeholder={t("name@company.com")}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              {!form.email.trim() && <MissingEmail />}
            </div>
            <label>
              {t("สิทธิ์")}
              <select
                disabled={form.id === me.id}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="supervisor">{t("Supervisor")}</option>
                <option value="super_admin">{t("Super Admin")}</option>
                <option value="guest">Guest</option>
                <option value="employee">Employee</option>
              </select>
            </label>
            {form.role === "employee" && <label>{t("รหัสพนักงานที่ผูกบัญชี")}<input required maxLength={100} value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} placeholder="BE000609" /></label>}
            <label>
              {t(form.id ? "รหัสผ่านใหม่ (เว้นว่างเพื่อใช้เดิม)" : "รหัสผ่าน")}
              <input
                type="password"
                autoComplete="new-password"
                minLength={6}
                maxLength={256}
                required={!form.id}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <label>
              <input
                type="checkbox"
                disabled={form.id === me.id}
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              {t(" เปิดใช้งานบัญชี")}
            </label>
          </fieldset>
          <p>
            {t(
              "รหัสผ่านอย่างน้อย 6 ตัวอักษร · แก้ Email อย่างเดียวไม่ต้องล็อกอินใหม่ · การแก้ไขข้อมูลบัญชีอื่นจะยกเลิกเซสชันเดิม",
            )}
          </p>
          <div className="account-actions">
            <button
              className="button"
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setForm(blank);
              }}
            >
              {t("ยกเลิก")}
            </button>
            <button className="button primary" disabled={busy}>
              {t("บันทึก")}
            </button>
          </div>
        </form>
      )}
      <div className="panel report-scroll">
        <table className="report-table">
          <thead>
            <tr>
              <th>{t("ชื่อผู้ใช้")}</th>
              <th>{t("ชื่อแสดง")}</th>
              <th>{t("Email")}</th>
              <th>{t("สิทธิ์")}</th>
              <th>{t("รหัสพนักงาน")}</th>
              <th>{t("สถานะ")}</th>
              <th>{t("จัดการ")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.username}</td>
                <td>{row.displayName}</td>
                <td>{row.email || <MissingEmail />}</td>
                <td>
                  {t(roleLabels[row.role as AccountRole])}
                </td>
                <td>{row.employeeId || "—"}</td>
                <td>{t(row.active ? "ใช้งาน" : "ปิดใช้งาน")}</td>
                <td>
                  <div className="account-actions">
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() => {
                        setForm({ ...row, password: "" });
                        setEditing(true);
                        setMessage("");
                      }}
                    >
                      {t("แก้ไข")}
                    </button>
                    <button
                      className="button"
                      disabled={busy || row.id === me.id}
                      onClick={() => {
                        if (
                          window.confirm(
                            t(
                              `ลบบัญชี ${row.username} และยกเลิกการเข้าสู่ระบบของบัญชีนี้?`,
                            ),
                          )
                        )
                          void save("DELETE", {
                            id: row.id,
                            version: row.version,
                          });
                      }}
                    >
                      {t("ลบ")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="panel account-form">
        <summary>{t("ประวัติการจัดการบัญชี (100 รายการล่าสุด)")}</summary>
        {history.map((h, i) => (
          <p key={i}>
            {t(new Date(h.created_at).toLocaleString(getLocale()))}
            {t(" · ")}
            {h.actor}
            {t(" · ")}
            {t(h.action)}
            {t(" · ")}
            {h.username}
          </p>
        ))}
      </details>
    </section>
  );
}
