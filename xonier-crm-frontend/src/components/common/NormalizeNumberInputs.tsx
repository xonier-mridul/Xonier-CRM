"use client";

import { useEffect } from "react";

/** Keeps native number inputs editable without an unwanted leading zero. */
export default function NormalizeNumberInputs() {
  useEffect(() => {
    const clearPlaceholderZero = (event: FocusEvent) => {
      const input = event.target as HTMLInputElement | null;
      if (input?.tagName === "INPUT" && input.type === "number" && input.value === "0") {
        input.value = "";
      }
    };

    const normalizeLeadingZeros = (event: Event) => {
      const input = event.target as HTMLInputElement | null;
      if (!input || input.tagName !== "INPUT" || input.type !== "number") return;

      // Preserve 0.x decimals, but turn 0250 / 00025 into 250 / 25.
      const normalized = input.value.replace(/^0+(?=\d)/, "");
      if (normalized !== input.value) {
        input.value = normalized;
      }
    };

    document.addEventListener("focusin", clearPlaceholderZero);
    document.addEventListener("input", normalizeLeadingZeros, true);
    return () => {
      document.removeEventListener("focusin", clearPlaceholderZero);
      document.removeEventListener("input", normalizeLeadingZeros, true);
    };
  }, []);

  return null;
}
