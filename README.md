# immada – Erinnerungskugeln

Menschen nehmen persönliche Sprach-Erinnerungen (≤ 120 s) auf, die an eine
physische Kugel gebunden sind, und hören sie jederzeit wieder an.

- **Aufnahme:** QR-Code scannen → mobile Web-App → aufnehmen → vorhören → **bestätigen**.
- **Unveränderlichkeit:** Vor der Bestätigung beliebig überschreibbar, **nach** der
  Bestätigung dauerhaft gesperrt.
- **Wiedergabe:** per QR-Scan (Web) **oder** durch Auflegen auf eine Schale (NFC/RFID).

Vollständiger Plan: [`plans/wild-bubbling-cherny.md`](plans/wild-bubbling-cherny.md).
Hardware-Box / Firmware: [`docs/hardware-box.md`](docs/hardware-box.md).

## Stack

Next.js (App Router, TypeScript) · Prisma + PostgreSQL · Browser-`MediaRecorder`.
Storage über eine Treiber-Abstraktion: **MinIO/S3** lokal, **Vercel Blob** in Produktion.
Deployment: **Vercel** (Postgres via **Supabase**).

## Lokales Setup (Docker)

```bash
npm install
cp .env.example .env          # lokale Defaults passen bereits (MinIO + Postgres)
docker compose up -d          # Postgres (Port 5433) + MinIO (9000/9001)
npm run db:migrate            # Schema anlegen
npm run seed                  # optional: Test-Box + 3 Demo-Kugeln
npm run dev                   # http://localhost:3000
```

Lokal läuft der Storage-Treiber `s3` (MinIO). Der Audio-Upload geht **über die
Server-Route** (`POST /api/stones/:token/recording`, Binary-Body) – es sind daher
keine presigned URLs und keine Browser-CORS-Konfiguration am Bucket nötig.
MinIO-Konsole: http://localhost:9001 (`minioadmin` / `minioadmin`).

## Datenmodell

| Tabelle       | Zweck                                                            |
| ------------- | ---------------------------------------------------------------- |
| `stones`      | Stein-Registry: `qr_token` (QR), `tag_uid` (NFC), `status`       |
| `recordings`  | Audio-Metadaten + Storage-Key, `state` draft/confirmed           |
| `box_devices` | Hardware-Boxen mit `device_token` (Bearer-Auth)                  |

`StoneStatus`: `empty → recorded → confirmed`. Die Regeln stehen testbar in
[`src/lib/stoneRules.ts`](src/lib/stoneRules.ts) (Unit-Tests daneben).

## API

| Methode & Route                                | Zweck                                            |
| ---------------------------------------------- | ------------------------------------------------ |
| `POST /api/stones/:token/upload-url`           | presigned PUT-URL (nur wenn nicht bestätigt)     |
| `POST /api/stones/:token/recording`            | hochgeladenes Audio als Entwurf registrieren     |
| `POST /api/stones/:token/confirm`              | bestätigen → **sperren** (immutable)             |
| `GET  /api/stones/:token/playback`             | signierte Audio-URL (QR-Wiedergabe)              |
| `POST /api/box/playback`                       | Box: Bearer device_token + `tagUid` → Audio-URL  |
| `POST /api/admin/stones/provision`             | Batch-Anlage (Bearer ADMIN_API_TOKEN)            |
| `POST /api/admin/stones/pair`                  | `tagUid` ↔ Stein verknüpfen (Bearer)             |
| `GET  /api/admin/stones/:token/qr.png`         | QR-Code-PNG für Druck/Gravur (Bearer)            |

## Aufnahme-Flow (Client)

`MediaRecorder` nimmt auf, **Hard-Stop bei genau 120 s**. Der Blob geht per
presigned URL direkt zum Storage; danach registriert der Client den Entwurf.
„Neu aufnehmen" überschreibt den Entwurf, „Bestätigen" sperrt ihn nach einer
zweiten Sicherheitsabfrage endgültig.

Server-seitig wird zusätzlich validiert: Existenz des Objekts (HEAD), Dauer
≤ 120 s (+Toleranz), Dateigröße, und jeder Schreibzugriff prüft den Stein-Status
(`canRecord`). Bestätigte Steine lehnen Upload/Recording **hart** ab.

## Verifikation

```bash
npm run typecheck     # TypeScript
npm test              # Unit-Tests der Immutability-/Dauer-Regeln
npm run build         # Produktions-Build
```

End-to-End (manuell, nach `npm run seed`):

1. Aufnahme-URL aus dem Seed-Output im Browser öffnen, aufnehmen (Stop greift bei 2:00),
   vorhören, „Neu aufnehmen" testen, dann bestätigen.
2. Seite neu laden → nur noch Wiedergabe, keine Aufnahme-UI.
3. Erneuter Upload-Versuch auf denselben Stein → Server antwortet `409 locked`.
4. Box simulieren mit dem im Seed ausgegebenen `Invoke-RestMethod`-Befehl.

## Deployment auf Vercel

Produktion: **Vercel** (Hosting) + **Supabase** (Postgres) + **Vercel Blob** (Audio).

**1. Supabase-Datenbank anlegen** (EU-Region wählen). Aus den Connection-Strings:
- `DATABASE_URL` = **Connection Pooler** (Port `6543`), mit `?pgbouncer=true` am Ende
- `DIRECT_URL` = **Direktverbindung** (Port `5432`) – nur für Migrationen

**2. Git-Repo zu GitHub pushen** (siehe unten), dann auf **vercel.com** „New Project" →
Repo importieren. Framework wird als Next.js erkannt.

**3. Vercel Blob verbinden:** im Vercel-Projekt → *Storage* → *Blob* → erstellen.
Vercel setzt dann automatisch `BLOB_READ_WRITE_TOKEN`. Dadurch wählt der Storage-Treiber
selbsttätig `blob`.

**4. Environment-Variablen** im Vercel-Projekt setzen (Production + Preview):

| Variable             | Wert                                                        |
| -------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`       | Supabase Pooler-URL (`…:6543/…?pgbouncer=true`)             |
| `DIRECT_URL`         | Supabase Direkt-URL (`…:5432/…`)                            |
| `ADMIN_API_TOKEN`    | langes Zufallsgeheimnis                                     |
| `APP_BASE_URL`       | optional (sonst aus der Vercel-Domain abgeleitet)           |
| `BLOB_READ_WRITE_TOKEN` | wird durch den verbundenen Blob-Store automatisch gesetzt |

`STORAGE_DRIVER` muss nicht gesetzt werden (Auto-Erkennung über den Blob-Token).

**5. Migration gegen Supabase ausführen** (einmalig bzw. bei Schemaänderungen), lokal
mit den Supabase-Strings in der Umgebung:

```bash
# DATABASE_URL/DIRECT_URL temporär auf Supabase zeigen lassen, dann:
npm run db:deploy        # prisma migrate deploy
```

Der `build`-Schritt auf Vercel führt über `postinstall` automatisch `prisma generate` aus.
`MediaRecorder` benötigt HTTPS – das liefert Vercel automatisch (QR-Codes funktionieren
damit auch auf dem Smartphone).

## Datenschutz

Sprachaufnahmen sind personenbezogene Daten. DB (Supabase) und Storage (Vercel Blob)
in **EU-Region** betreiben, Verschlüsselung at-rest/in-transit, Einwilligung im Flow,
AVV mit den Providern. Details im Plan.
