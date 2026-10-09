"use client";
import { useEffect, type ReactNode } from "react";
import { setLanguage } from "@/lib/i18n";
export default function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    try {
      setLanguage(localStorage.getItem("cj-language") === "en" ? "en" : "th");
    } catch {
      setLanguage("th");
    }
    const storage = (event: StorageEvent) => {
      if (event.key === "cj-language")
        setLanguage(event.newValue === "en" ? "en" : "th");
    };
    window.addEventListener("storage", storage);
    return () => window.removeEventListener("storage", storage);
  }, []);
  return children;
}
