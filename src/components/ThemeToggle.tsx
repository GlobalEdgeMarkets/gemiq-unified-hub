import { useEffect, useState } from "react";

/**
 * Theme toggle — light ↔ dark. Persists to localStorage under "gemiq-theme"
 * and toggles a `dark` class on <html>. Default is light (the platform's
 * canonical theme); users opt into dark.
 *
 * Dark surface overrides live in src/styles.css under the ".dark" scope so
 * the same class-list utilities re-skin when the class is present.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("gemiq-theme") as
      | "light"
      | "dark"
      | null;
    const initial: "light" | "dark" = stored === "dark" ? "dark" : "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      window.localStorage.setItem("gemiq-theme", next);
    } catch {
      /* ignore */
    }
  }

  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={
        compact
          ? "inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#172864]/15 bg-white text-[#172864] transition hover:bg-[#F4F7FB] dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          : "inline-flex h-9 items-center gap-1.5 rounded-full border border-[#172864]/15 bg-white px-3 text-[#172864] transition hover:bg-[#F4F7FB] dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
      }
    >
      {isDark ? (
        <SunIcon className="h-4 w-4" />
      ) : (
        <MoonIcon className="h-4 w-4" />
      )}
      {!compact && (
        <span className="text-xs font-semibold">{isDark ? "Light" : "Dark"}</span>
      )}
    </button>
  );
}

function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  );
}
