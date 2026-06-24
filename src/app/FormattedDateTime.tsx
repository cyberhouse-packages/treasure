"use client";

import { useEffect, useState } from "react";

function format(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Zeigt einen ISO-Zeitstempel in der lokalen Zeitzone des Betrachters an
 * (z.B. "Dienstag, 23. Juni 2026, 14:05"). Die Anzeige wird im Browser auf die
 * lokale Zeit aktualisiert; suppressHydrationWarning, da Server- und
 * Client-Zeitzone abweichen können.
 */
export function FormattedDateTime({ iso }: { iso: string }) {
  const [text, setText] = useState(() => format(iso));

  useEffect(() => {
    setText(format(iso));
  }, [iso]);

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}
