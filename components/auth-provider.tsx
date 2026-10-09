"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { Account } from "@/lib/auth";
const Context = createContext<Account | null>(null);
export const useAccount = () => useContext(Context)!;
export default function AuthProvider({
  user,
  children,
}: {
  user: Account;
  children: ReactNode;
}) {
  useEffect(() => {
    let leaving = false;
    const leave = () => {
      if (leaving) return;
      leaving = true;
      window.location.replace("/login?expired=1");
    };
    const original = window.fetch;
    window.fetch = async (...args) => {
      const response = await original(...args);
      const url = new URL(
        args[0] instanceof Request ? args[0].url : String(args[0]),
        window.location.href,
      );
      if (
        url.origin === location.origin &&
        url.pathname.startsWith("/api/") &&
        response.status === 401
      )
        leave();
      return response;
    };
    const check = () => {
      if (Date.now() >= user.expiresAt) {
        leave();
        return;
      }
      void window.fetch("/api/auth/me", { cache: "no-store" }).catch(() => {});
    };
    const timer = window.setTimeout(
      leave,
      Math.max(0, user.expiresAt - Date.now()),
    );
    const poll = window.setInterval(check, 60000);
    window.addEventListener("focus", check);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      window.removeEventListener("focus", check);
      window.fetch = original;
    };
  }, [user.expiresAt]);
  return <Context.Provider value={user}>{children}</Context.Provider>;
}
