"use client";

import { useEffect, useState } from "react";

type Theme = "pastel" | "contrast";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("pastel");

  // Initialen Zustand aus dem <html data-theme>-Attribut übernehmen,
  // das der Inline-Script im <head> bereits flackerfrei gesetzt hat.
  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === "contrast" ? "contrast" : "pastel");
  }, []);

  function toggle() {
    const next: Theme = theme === "contrast" ? "pastel" : "contrast";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("treasure-theme", next);
    } catch {
      /* localStorage nicht verfügbar – Theme gilt dann nur für diese Sitzung */
    }
  }

  const toContrast = theme !== "contrast";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-pressed={theme === "contrast"}
      aria-label={
        toContrast
          ? "Auf hohen Kontrast und große Schrift umschalten"
          : "Auf Pastell-Ansicht umschalten"
      }
    >
      {toContrast ? "🔆 Hoher Kontrast" : "🌸 Pastell-Ansicht"}
    </button>
  );
}
