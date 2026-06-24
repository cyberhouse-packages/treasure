// Zentralisierter, validierter Zugriff auf Umgebungsvariablen.
// Wirft beim Start früh und verständlich, wenn etwas fehlt.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Fehlende Umgebungsvariable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

// Öffentliche Basis-URL: explizit gesetzt, sonst die Vercel-Produktions-/Deploy-URL,
// sonst lokal. So funktionieren QR-Links auch ohne manuelle Konfiguration auf Vercel.
function resolveBaseUrl(): string {
  const explicit = process.env.APP_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`.replace(/\/$/, "");
  return "http://localhost:3000";
}

export const env = {
  appBaseUrl: resolveBaseUrl(),

  databaseUrl: () => required("DATABASE_URL"),

  s3: {
    endpoint: optional("S3_ENDPOINT"),
    region: optional("S3_REGION", "eu-central-1"),
    bucket: () => required("S3_BUCKET"),
    accessKeyId: () => required("S3_ACCESS_KEY_ID"),
    secretAccessKey: () => required("S3_SECRET_ACCESS_KEY"),
    forcePathStyle: optional("S3_FORCE_PATH_STYLE", "true") === "true",
  },

  signedUrlTtlSeconds: Number(optional("SIGNED_URL_TTL_SECONDS", "120")),

  adminApiToken: () => required("ADMIN_API_TOKEN"),
};
