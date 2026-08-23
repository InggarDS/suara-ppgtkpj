"use client";

import { useState } from "react";

export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem("suara-theme");
    if (t === "light") document.documentElement.setAttribute("data-theme", "light");
  } catch (e) {}
})();
`;

function readTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light">(readTheme);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (next === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("suara-theme", next);
  }

  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggle}
      suppressHydrationWarning
      aria-label={isLight ? "Switch to night mode" : "Switch to afternoon mode"}
      title={isLight ? "Afternoon mode" : "Night mode"}
      className={`inline-flex items-center gap-2 rounded-full border border-border-1 bg-paper-2 px-1 py-1 cursor-pointer ${className}`}
    >
      <span
        suppressHydrationWarning
        className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
          !isLight ? "bg-brand text-white" : "text-faint"
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"></path>
        </svg>
      </span>
      <span
        suppressHydrationWarning
        className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
          isLight ? "bg-brand text-white" : "text-faint"
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
        </svg>
      </span>
    </button>
  );
}
