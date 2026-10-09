"use client";
import { useTranslation } from "@/lib/i18n";
import { useRef, useState } from "react";
import LanguageSwitcher from "./language-switcher";
export default function LoginForm() {
  const { t, getLocale } = useTranslation();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const usernameRef = useRef<HTMLInputElement>(null),
    passwordRef = useRef<HTMLInputElement>(null);
  const [invalid, setInvalid] = useState({ username: false, password: false });
  function highlight(
    username: boolean,
    password: boolean,
    message: string,
    focusPassword = false,
  ) {
    setInvalid({ username, password });
    setError(message);
    requestAnimationFrame(() => {
      const fields = [
        username && usernameRef.current,
        password && passwordRef.current,
      ].filter(Boolean) as HTMLInputElement[];
      (focusPassword ? passwordRef.current : fields[0])?.focus();
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        for (const field of fields) {
          field.getAnimations().forEach((animation) => animation.cancel());
          field.animate(
            [
              { transform: "translateX(0)" },
              { transform: "translateX(-4px)" },
              { transform: "translateX(4px)" },
              { transform: "translateX(-3px)" },
              { transform: "translateX(3px)" },
              { transform: "translateX(0)" },
            ],
            { duration: 350, easing: "ease-out" },
          );
        }
      }
    });
  }
  return (
    <main className="login-page">
      <div className="login-language">
        <LanguageSwitcher />
      </div>
      <form
        className="login-card"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          const data = new FormData(e.currentTarget);
          const username = String(data.get("username") || "").trim(),
            password = String(data.get("password") || "");
          if (!username || !password) {
            highlight(
              !username,
              !password,
              !username && !password
                ? "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน"
                : !username
                  ? "กรุณากรอกชื่อผู้ใช้"
                  : "กรุณากรอกรหัสผ่าน",
            );
            return;
          }
          setBusy(true);
          setError("");
          setInvalid({ username: false, password: false });
          try {
            const res = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username, password }),
            });
            const result = await res.json();
            if (res.status === 401) {
              setBusy(false);
              highlight(
                true,
                true,
                result.error || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
                true,
              );
              return;
            }
            if (!res.ok) throw Error(result.error);
            window.location.replace("/attendance");
          } catch (e) {
            setError(e instanceof Error ? e.message : "เชื่อมต่อไม่ได้");
            setBusy(false);
          }
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/branding/cj-logistics.png"
          alt={t("CJ Logistics")}
          width={190}
        />
        <h1>{t("CJ Agent.")}</h1>
        <p>{t("เข้าสู่ระบบจัดการเวลาและโอที")}</p>
        <label>
          {t("ชื่อผู้ใช้")}
          <input
            ref={usernameRef}
            name="username"
            autoComplete="username"
            required
            maxLength={64}
            autoFocus
            disabled={busy}
            aria-invalid={invalid.username}
            aria-describedby={invalid.username ? "login-error" : undefined}
            onChange={() => {
              setInvalid((value) => ({ ...value, username: false }));
            }}
          />
        </label>
        <label>
          {t("รหัสผ่าน")}
          <input
            ref={passwordRef}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={256}
            disabled={busy}
            aria-invalid={invalid.password}
            aria-describedby={invalid.password ? "login-error" : undefined}
            onChange={() => {
              setInvalid((value) => ({ ...value, password: false }));
            }}
          />
        </label>
        {error && (
          <p id="login-error" role="alert" className="error">
            {t(error)}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {t(busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ")}
        </button>
        <small>
          {t("หากไม่สามารถเข้าสู้ระบบได้ โปรดแจ่ง IT Administrator")}
        </small>
      </form>
    </main>
  );
}
