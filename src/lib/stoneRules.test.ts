import { describe, it, expect } from "vitest";
import {
  canRecord,
  canConfirm,
  isLocked,
  isDurationValid,
} from "./stoneRules";
import { MAX_RECORDING_MS } from "./constants";

describe("stoneRules – Aufnahme-Lebenszyklus", () => {
  it("erlaubt Aufnahme bei leerem Stein", () => {
    expect(canRecord("empty")).toBe(true);
  });

  it("erlaubt Überschreiben eines nicht bestätigten Entwurfs", () => {
    expect(canRecord("recorded")).toBe(true);
  });

  it("verbietet Aufnahme nach Bestätigung (Immutability)", () => {
    expect(canRecord("confirmed")).toBe(false);
    expect(isLocked("confirmed")).toBe(true);
  });

  it("erlaubt Bestätigen nur aus dem Entwurfs-Zustand", () => {
    expect(canConfirm("empty")).toBe(false);
    expect(canConfirm("recorded")).toBe(true);
    expect(canConfirm("confirmed")).toBe(false);
  });
});

describe("stoneRules – Dauer-Validierung (120s)", () => {
  it("akzeptiert genau 120 Sekunden", () => {
    expect(isDurationValid(MAX_RECORDING_MS)).toBe(true);
  });

  it("akzeptiert knapp über 120s innerhalb der Toleranz", () => {
    expect(isDurationValid(MAX_RECORDING_MS + 1000)).toBe(true);
  });

  it("lehnt deutlich zu lange Aufnahmen ab", () => {
    expect(isDurationValid(MAX_RECORDING_MS + 5000)).toBe(false);
  });

  it("lehnt 0 oder negative Dauer ab", () => {
    expect(isDurationValid(0)).toBe(false);
    expect(isDurationValid(-1)).toBe(false);
  });
});
