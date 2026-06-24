"use client";

import type { CSSProperties } from "react";

// Kugel, die auf einen Lautstärkepegel (0..1) reagiert – pulsiert und leuchtet
// im Takt der Stimme. Der Pegel wird über die CSS-Variable --lvl gesteuert,
// damit der Hochkontrast-/Reduced-Motion-Modus die Reaktion sauber abschalten kann.

export function ReactiveOrb({
  level,
  size = 150,
}: {
  level: number;
  size?: number;
}) {
  const lvl = Math.max(0, Math.min(1, level));
  const style: CSSProperties = { width: size, height: size };
  (style as Record<string, string | number>)["--lvl"] = lvl;
  return <div className="orb orb-live" style={style} aria-hidden="true" />;
}
