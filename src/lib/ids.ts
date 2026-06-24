import { randomBytes } from "node:crypto";
import { ulid } from "ulid";

/** Kanonische, sortierbare interne ID. */
export function newId(): string {
  return ulid();
}

/**
 * Langer, nicht erratbarer QR-Token (≥128 bit Entropie).
 * URL-safe base64, ohne Padding. Wird in der QR-URL verwendet und auf die
 * interne Stein-ID gemappt (≠ DB-ID, damit man Steine nicht durchzählen kann).
 */
export function newQrToken(): string {
  return randomBytes(24).toString("base64url"); // 24 Byte = 192 bit
}

/** Geräte-Token für eine Hardware-Box. */
export function newDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}
