"use client";
import { useMemo, useSyncExternalStore } from "react";
import { english, thai } from "./translations";
export type Language = "th" | "en";
let language: Language = "th";
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export function useLocale() {
  return useSyncExternalStore(
    subscribe,
    () => language,
    () => "th" as Language,
  );
}
export function setLanguage(next: Language) {
  language = next;
  if (typeof document !== "undefined") document.documentElement.lang = next;
  try {
    localStorage.setItem("cj-language", next);
  } catch {
    /* Private browsing may block storage. */
  }
  listeners.forEach((listener) => listener());
}
export const getLocale = () => (language === "en" ? "en-GB" : "th-TH");
const fragments = Object.entries(english)
  .filter(([key]) => key.length >= 4 && /[\u0e00-\u0e7f]/.test(key))
  .sort((a, b) => b[0].length - a[0].length);
const shortWords = Object.entries(english).filter(
  ([key]) => key.length < 4 && /[\u0e00-\u0e7f]/.test(key),
);
export function translateText(text: string, locale: Language): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  const dictionary = locale === "en" ? english : thai;
  const exact = Object.hasOwn(dictionary, normalized)
    ? dictionary[normalized]
    : undefined;
  if (exact !== undefined)
    return (
      (text.match(/^\s*/)?.[0] || "") + exact + (text.match(/\s*$/)?.[0] || "")
    );
  if (locale === "th" || !/[\u0e00-\u0e7f]/.test(text)) return text;
  // Dynamic UI messages include employee IDs, counts and dates. Translate fixed
  // fragments only; callers must leave user-provided fields outside t().
  let result = text;
  for (const [from, to] of fragments) result = result.split(from).join(to);
  for (const [from, to] of shortWords)
    result = result.replace(
      new RegExp(
        `(?<![\\u0e00-\\u0e7f])${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\u0e00-\\u0e7f])`,
        "g",
      ),
      to,
    );
  return result;
}
export function t<T>(value: T): T {
  if (typeof value === "string") return translateText(value, language) as T;
  if (Array.isArray(value)) return value.map((item) => t(item)) as T;
  return value;
}
export function useTranslation() {
  const locale = useLocale();
  return useMemo(() => {
    const translate = <T>(value: T): T => {
      if (typeof value === "string") return translateText(value, locale) as T;
      if (Array.isArray(value))
        return value.map((item) => translate(item)) as T;
      return value;
    };
    return {
      language: locale,
      t: translate,
      getLocale: () => (locale === "en" ? "en-GB" : "th-TH"),
    };
  }, [locale]);
}
