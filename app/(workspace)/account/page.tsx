"use client";
import { useTranslation, getLocale } from "@/lib/i18n";
import { useState } from "react";
export default function AccountPage() {
  const { t, getLocale } = useTranslation();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="panel account-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const data = new FormData(e.currentTarget);
        if (data.get("password") !== data.get("confirm")) {
          setError("รหัสผ่านใหม่ไม่ตรงกัน");
          return;
        }
        setBusy(true);
        setError("");
        try {
          const res = await fetch("/api/auth/password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              currentPassword: data.get("currentPassword"),
              password: data.get("password"),
            }),
          });
          const result = await res.json();
          if (!res.ok) throw Error(result.error);
          location.replace("/login");
        } catch (e) {
          setError(e instanceof Error ? e.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ");
          setBusy(false);
        }
      }}
    >
      <h1>{t("เปลี่ยนรหัสผ่าน")}</h1>
      <p>{t("เมื่อเปลี่ยนสำเร็จ ต้องล็อกอินใหม่ทุกอุปกรณ์")}</p>
      <fieldset disabled={busy}>
        <label>
          {t("รหัสผ่านปัจจุบัน")}
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            maxLength={256}
            required
          />
        </label>
        <label>
          {t("รหัสผ่านใหม่")}
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            maxLength={256}
            required
          />
        </label>
        <label>
          {t("ยืนยันรหัสผ่านใหม่")}
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={6}
            maxLength={256}
            required
          />
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="error">
          {t(error)}
        </p>
      )}
      <button className="button primary" disabled={busy}>
        {t("เปลี่ยนรหัสผ่าน")}
      </button>
    </form>
  );
}
