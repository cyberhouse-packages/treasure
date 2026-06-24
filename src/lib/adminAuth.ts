import { NextRequest } from "next/server";
import { env } from "./env";

export const ADMIN_COOKIE = "admin_token";

/**
 * Prüft die Admin-Autorisierung. Akzeptiert entweder den Bearer-Token
 * (programmatisch / curl) ODER das Admin-Cookie (Web-Oberfläche, inkl. QR-<img>).
 */
export function isAdmin(req: NextRequest): boolean {
  const expected = env.adminApiToken();

  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (bearer && bearer === expected) return true;

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value ?? "";
  return cookie.length > 0 && cookie === expected;
}

/** Server-Component-Variante: prüft nur das Cookie. */
export function isAdminCookie(cookieValue: string | undefined): boolean {
  return !!cookieValue && cookieValue === env.adminApiToken();
}
