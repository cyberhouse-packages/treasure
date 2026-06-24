// Reine, testbare Geschäftsregeln rund um den Aufnahme-Lebenszyklus eines Steins.
// Bewusst ohne DB/IO, damit die Immutability-Logik isoliert getestet werden kann.

import { MAX_RECORDING_MS, MAX_RECORDING_TOLERANCE_MS } from "./constants";

export type StoneStatus = "empty" | "recorded" | "confirmed";

/** Darf für diesen Stein (über)aufgenommen / hochgeladen werden? */
export function canRecord(status: StoneStatus): boolean {
  // empty -> erste Aufnahme, recorded -> Überschreiben des Entwurfs.
  // confirmed -> niemals mehr.
  return status === "empty" || status === "recorded";
}

/** Darf der aktuelle Entwurf bestätigt (und damit gesperrt) werden? */
export function canConfirm(status: StoneStatus): boolean {
  return status === "recorded";
}

/** Ist die Aufnahme endgültig gesperrt? */
export function isLocked(status: StoneStatus): boolean {
  return status === "confirmed";
}

/** Serverseitige Dauer-Validierung mit kleiner Encoder-Toleranz. */
export function isDurationValid(durationMs: number): boolean {
  return (
    Number.isFinite(durationMs) &&
    durationMs > 0 &&
    durationMs <= MAX_RECORDING_MS + MAX_RECORDING_TOLERANCE_MS
  );
}

/** Fehlercode-Typen für klare API-Antworten. */
export type StoneRuleError =
  | "locked" // bereits bestätigt, keine Änderung mehr
  | "nothing_to_confirm" // kein Entwurf vorhanden
  | "duration_too_long"
  | "duration_invalid";
