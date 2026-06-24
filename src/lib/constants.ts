// Zentrale fachliche Konstanten

/** Maximale Aufnahmedauer in Millisekunden (120 Sekunden laut Briefing). */
export const MAX_RECORDING_MS = 120_000;

/**
 * Kleine Toleranz für die serverseitige Dauerprüfung. Browser-Encoder liefern
 * gelegentlich ein paar Millisekunden über dem Stop-Zeitpunkt; wir lehnen erst
 * deutlich darüber ab, damit gültige Aufnahmen nicht fälschlich verworfen werden.
 */
export const MAX_RECORDING_TOLERANCE_MS = 1_500;

/** Erlaubte Audio-MIME-Typen für Uploads. */
export const ALLOWED_AUDIO_MIME = [
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/ogg",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/mpeg",
] as const;

/**
 * Obergrenze Dateigröße. 120s Opus liegt klar darunter (~1–2 MB). Unter dem
 * Vercel-Serverless-Body-Limit (4,5 MB), da der Upload über die Route läuft.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB
