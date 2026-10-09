"use client";
import { useEffect } from "react";
export function useDialog(onClose: () => void, busy = false) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key !== "Tab") return;
      const items = [
        ...document.querySelectorAll<HTMLElement>(
          '[role="dialog"] button:not([disabled]),[role="dialog"] input:not([disabled]),[role="dialog"] textarea:not([disabled]),[role="dialog"] select:not([disabled]),[role="dialog"] a[href],[role="dialog"] summary',
        ),
      ].filter(
        (element) =>
          element.getClientRects().length > 0 && !element.matches(":disabled"),
      );
      const first = items[0],
        last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, [onClose, busy]);
}
