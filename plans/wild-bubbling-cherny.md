# Projektplan: "Treasure" – Erinnerungssteine

## Context

Wir bauen ein Produkt, mit dem Menschen persönliche Sprachnachrichten ("Erinnerungen")
auf physische Steine binden und sie später jederzeit wieder anhören können.

**Kernanforderungen (aus dem Briefing):**
- Jeder Stein hat einen eingebetteten **NFC/RFID-Tag** (eindeutige ID) **und** einen
  individuellen **QR-Code**.
- **Aufnahme:** Per QR-Scan öffnet sich eine mobile Web-App (Smartphone/Laptop), auf der
  eine Erinnerung aufgenommen wird. Max. **120 Sekunden**.
- **Unveränderlichkeit:** Solange eine Aufnahme **nicht bestätigt** ist, kann sie beliebig
  überschrieben werden. Nach **Bestätigung** ist sie **endgültig** und nicht mehr änderbar.
- **Wiedergabe:** Entweder durch Auflegen auf eine **eigene Hardware-Box** (NFC/RFID) oder
  durch **QR-Scan** am Smartphone.

**Getroffene Entscheidungen (mit dem Nutzer abgestimmt):**
| Thema | Entscheidung |
|---|---|
| Abspiel-Box | **Eigene Hardware** (NFC-Reader + Lautsprecher + WLAN) |
| Tech-Stack | **Next.js + Node (TypeScript)** |
| Zugang Aufnahme | **Anonym über schwer erratbaren Einmal-Link** (Stein-ID), kein Login |
| Audio-Speicher | **S3-kompatibler Cloud-Storage**, Metadaten in DB |

**Empfohlene Ergänzungen (Begründung unten):** EU-Hosting/Storage (DSGVO), ESP32 als
Box-Mikrocontroller, signierte Kurz-URLs für Audio, Postgres als DB.

---

## Architektur-Überblick

```
                         ┌─────────────────────────────────────┐
                         │   Backend / API (Next.js Route       │
                         │   Handlers, TypeScript)              │
   QR-Scan  ──────────►  │   - Stein-Registry                   │
   (Smartphone Browser)  │   - Aufnahme-Upload (presigned)      │
                         │   - Bestätigen/Sperren (immutable)   │
   Hardware-Box ───────► │   - Wiedergabe-Endpoint (Box-Auth)   │
   (ESP32, NFC-ID)       └───────────┬──────────────┬───────────┘
                                     │              │
                              ┌──────▼─────┐   ┌────▼─────────┐
                              │ Postgres   │   │ S3-Storage   │
                              │ (Metadaten)│   │ (Audio, EU)  │
                              └────────────┘   └──────────────┘
```

**Datenfluss Aufnahme:** QR-Scan → `/s/{token}` → App prüft Status → Mikrofon-Aufnahme
(≤120 s) → Upload via presigned URL → Vorhören → **Bestätigen** → Status `confirmed` (immutable).

**Datenfluss Wiedergabe (Box):** Stein auflegen → ESP32 liest Tag-ID → ruft
`/api/box/playback` mit Geräte-Token + Tag-ID → Server liefert signierte Audio-URL →
Box streamt & spielt ab.

---

## Identifikation: Tag, ID und QR

Jeder Stein bekommt **eine kanonische Stein-ID** (UUID/ULID) im Backend. Daran hängen zwei
physische Zugänge:

1. **NFC/RFID-Tag** (13,56 MHz, NTAG213/215 o. ä.) im Stein: speichert die Stein-ID bzw.
   einen kurzen, mit der ID verknüpften Code. Wird von der Box gelesen.
2. **QR-Code** (aufgedruckt/graviert): kodiert eine URL `https://app.../s/{token}`, wobei
   `token` ein langer, zufälliger, nicht erratbarer Wert ist (≠ interne DB-ID), der serverseitig
   auf die Stein-ID gemappt wird.

> **Hinweis zu "RFID vs. NFC":** NFC ist eine RFID-Variante bei 13,56 MHz. Wir nutzen
> durchgängig **NFC-fähige Tags**, damit derselbe Chip sowohl von der Box (NFC-Reader) als
> auch perspektivisch von NFC-fähigen Smartphones gelesen werden kann. Das vereinheitlicht
> die Hardware.

---

## Datenmodell (Postgres)

```
stones
  id            ULID         (interne kanonische ID)
  tag_uid       text unique  (NFC/RFID Chip-UID, beim Provisioning erfasst)
  qr_token      text unique  (langer Zufallswert für QR-URL)
  status        enum         empty | recorded | confirmed
  created_at    timestamptz

recordings
  id            ULID
  stone_id      ULID  -> stones.id
  storage_key   text         (S3 Object Key)
  duration_ms   int          (<= 120000, serverseitig validiert)
  mime          text         (audio/webm; opus o. ä.)
  state         enum         draft | confirmed
  confirmed_at  timestamptz  null bis Bestätigung
  created_at    timestamptz

box_devices
  id            ULID
  device_token  text unique  (Auth-Secret pro Box)
  label         text
  last_seen_at  timestamptz
```

**Immutability-Regel (Kern der Geschäftslogik):**
- `stones.status = empty` → Aufnahme erlaubt.
- `stones.status = recorded` → Überschreiben erlaubt (alter `draft` wird verworfen/ersetzt).
- Beim **Bestätigen**: in einer DB-Transaktion `recordings.state = confirmed`,
  `stones.status = confirmed`, `confirmed_at = now()`. Danach lehnen alle
  Schreib-/Upload-Endpoints für diesen Stein **hart** ab (Guard auf `status = confirmed`).
- Zusätzlich Storage-seitig absichern: bestätigte Objekte über Bucket-Policy/Object-Lock
  schreibgeschützt (Defense in Depth).

---

## Komponente 1 — Web-App & Backend (Next.js, TypeScript)

**Stack:** Next.js (App Router) · TypeScript · Route Handlers als API · Prisma + Postgres ·
S3-SDK (AWS S3 / Cloudflare R2) · Aufnahme im Browser via `MediaRecorder` API.

**Seiten / Routen:**
- `app/s/[token]/page.tsx` — Aufnahme-Flow (mobile-first):
  1. Status laden. Wenn `confirmed` → Wiedergabe-Ansicht (read-only).
  2. Aufnahme-UI: Aufnahmeknopf, Live-Timer mit **Hard-Stop bei 120 s**, Pegelanzeige.
  3. Vorhören (Play), "Neu aufnehmen" (überschreibt draft), **"Bestätigen"** mit
     deutlicher Warnung *"danach nicht mehr änderbar"* (Doppel-Bestätigung).
- `app/s/[token]/page.tsx` (confirmed-Zustand) — Wiedergabe via QR.

**API Route Handlers:**
- `POST /api/stones/[token]/upload-url` — liefert presigned PUT-URL (nur wenn nicht confirmed).
- `POST /api/stones/[token]/recording` — registriert hochgeladenes Objekt als `draft`,
  validiert `duration_ms <= 120000`.
- `POST /api/stones/[token]/confirm` — transaktionales Sperren (immutable).
- `GET  /api/stones/[token]/playback` — signierte Lese-URL (nur confirmed) für QR-Wiedergabe.
- `POST /api/box/playback` — Box-Auth (device_token) + tag_uid → signierte Audio-URL.
- (Admin/Provisioning) `POST /api/admin/stones/provision` — legt Steine an, mappt tag_uid ↔
  qr_token, erzeugt QR-Code-Bilder (Batch).

**Validierungen/Sicherheit:**
- 120-s-Limit **doppelt**: clientseitig (Hard-Stop) + serverseitig (Dauer aus Datei prüfen).
- `qr_token` lang & zufällig (≥128 bit), Rate-Limiting auf Aufnahme-Endpoints.
- Audio-URLs nur kurzlebig signiert; Bucket nicht öffentlich.

---

## Komponente 2 — Hardware-Box (Firmware)

**Empfohlene Hardware:**
- **ESP32** (WLAN integriert, günstig, I2S-Audio) — *empfohlen* für ein kompaktes,
  serientaugliches Gerät. Alternative: **Raspberry Pi Zero 2 W**, wenn einfacheres
  HTTPS/Audio-Handling und schnellere Prototyp-Entwicklung wichtiger sind als Stückkosten.
- **NFC-Reader:** PN532 (I2C/SPI) — liest NTAG-UID.
- **Audio:** I2S-DAC + Verstärker (z. B. MAX98357A) + kleiner Lautsprecher.
- Status-LED + ggf. Lautstärke-Poti/Taster.

**Firmware-Ablauf:**
1. Beim Start: WLAN verbinden (Provisioning via Captive Portal/WPS), `device_token` geladen.
2. Loop: PN532 pollt auf Tag. Tag erkannt → `tag_uid` lesen.
3. HTTPS `POST /api/box/playback` mit `device_token` + `tag_uid`.
4. Server antwortet mit signierter Audio-URL (oder 404, falls leer/nicht confirmed).
5. Box streamt Audio (Opus/MP3) und gibt es über I2S/Lautsprecher aus; LED-Feedback.
6. Fehler-/Offline-Handling: Status-LED, optional kurzes Cache der zuletzt gespielten Datei.

**Hinweis:** TLS auf ESP32 ist machbar (Root-CA im Flash). Wenn das zu fragil wird, ist der
Raspberry Pi die robustere Wahl für v1 — Entscheidung im Hardware-Spike (siehe Phasen).

---

## Komponente 3 — Provisioning / Produktion

- **Batch-Anlage** von Steinen: erzeugt `qr_token` + Platzhalter, druckt QR-Codes.
- **Tag-Pairing:** beim Einbau des NFC-Chips wird die `tag_uid` gescannt und dem Stein
  (bzw. dessen `qr_token`) zugeordnet (kleines Admin-Tool / Web-Scan).
- Export der QR-Code-Grafiken für den Druck/Gravur.

---

## Datenschutz (DSGVO / Österreich)

Sprachaufnahmen = **personenbezogene Daten** (Stimme). Daher:
- **EU-Region** für Storage & DB (z. B. Cloudflare R2 EU / AWS eu-central-1).
- Verschlüsselung at-rest (Storage) und in-transit (TLS).
- Klarer Hinweis/Einwilligung im Aufnahme-Flow; Datenschutzerklärung.
- Aufbewahrung: dauerhaft (Produktzweck), aber dokumentierter Lösch-/Auskunftsprozess.
- Auftragsverarbeitungsvertrag (AVV) mit Storage-Provider.

---

## Umsetzungsphasen

**Phase 0 — Setup & Spikes**
- Next.js + TS + Prisma + Postgres Grundgerüst, S3/R2-Bucket (EU).
- Hardware-Spike: ESP32 + PN532 + I2S-Audio — verifizieren, dass NFC-Lesen, HTTPS und
  Audio-Wiedergabe zusammen funktionieren. *Geht-/Geht-nicht-Entscheidung ESP32 vs. Pi.*

**Phase 1 — Aufnahme-MVP (Web)**
- Datenmodell + Migrationen, `app/s/[token]` Aufnahme-Flow, presigned Upload,
  120-s-Limit (client + server), Bestätigen/Immutability, QR-Wiedergabe.

**Phase 2 — Hardware-Box v1**
- Firmware: Tag-Lesen → Playback-API → Audio-Ausgabe, `box_devices`-Auth, WLAN-Provisioning.

**Phase 3 — Provisioning & Produktion**
- Batch-Anlage, QR-Generierung, Tag-Pairing-Tool, Druck-Export.

**Phase 4 — Härtung**
- Rate-Limiting, Storage-Object-Lock, Monitoring, DSGVO-Texte, Tests, Deployment.

---

## Verifikation (End-to-End)

1. **Aufnahme-Flow:** `qr_token`-URL im Mobile-Browser öffnen → 130 s aufnehmen wollen →
   Stop bei 120 s greift. Aufnahme vorhören, "neu aufnehmen" überschreibt. Bestätigen →
   erneuter Upload-Versuch wird vom Server **abgelehnt** (Immutability bewiesen).
2. **QR-Wiedergabe:** Bestätigten Stein erneut scannen → Audio spielt, keine Aufnahme-UI.
3. **Box-Wiedergabe:** Stein auf Box legen → korrektes Audio spielt; leerer Stein → kein/Default-Feedback.
4. **Sicherheit:** Direkter Zugriff auf Audio-URL ohne Signatur schlägt fehl; Box ohne
   gültigen `device_token` wird abgewiesen.
5. **Automatisierte Tests:** Unit-Tests für die Status-/Immutability-Logik, Integrationstest
   für Upload→Confirm→Lock.

---

## Offene Punkte (vor/während Umsetzung zu klären)

- Endgültige Box-Plattform (ESP32 vs. Raspberry Pi) — nach Phase-0-Spike.
- Audio-Format/Codec für Box-Wiedergabe (Opus vs. MP3) je nach Decoder-Support.
- Branding/Design der Web-App (separater Design-Schritt).
- Skalierung Stückzahlen / Serienfertigung der Box (außerhalb dieses Software-Plans).
