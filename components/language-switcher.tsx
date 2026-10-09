"use client";
import { Languages } from "lucide-react";
import { setLanguage, useLocale } from "@/lib/i18n";
export default function LanguageSwitcher() {
  const language = useLocale();
  return (
    <label className="language-switcher">
      <Languages size={17} aria-hidden="true" />
      <select
        aria-label="Language / ภาษา"
        value={language}
        onChange={(e) => setLanguage(e.target.value === "en" ? "en" : "th")}
      >
        <option value="th">ไทย</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
