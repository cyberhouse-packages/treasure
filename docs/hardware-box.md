# Hardware-Box (NFC-Wiedergabe)

Die Box erkennt einen aufgelegten Stein über dessen NFC/RFID-Tag, fragt beim
Server die zugehörige bestätigte Erinnerung an und spielt sie über einen
Lautsprecher ab.

## Empfohlene Komponenten (v1)

| Teil          | Vorschlag                         | Zweck                          |
| ------------- | --------------------------------- | ------------------------------ |
| MCU + WLAN    | **ESP32** (WROOM/WROVER)          | Logik, WLAN, I2S-Audio         |
| NFC-Reader    | **PN532** (I2C oder SPI)          | liest NTAG-UID des Steins      |
| Audio-DAC/Amp | **MAX98357A** (I2S)               | digitale Audioausgabe + Verst. |
| Lautsprecher  | 3 W / 4 Ω                         | Wiedergabe                     |
| Status-LED    | WS2812 oder einfache LED          | Feedback (bereit/spielt/Fehler)|

> **Tags:** NTAG213/215 (13,56 MHz). NFC ist eine RFID-Variante bei 13,56 MHz –
> dieselben Tags lassen sich perspektivisch auch von NFC-Smartphones lesen.

Alternative für v1-Prototyp: **Raspberry Pi Zero 2 W** (einfacheres HTTPS und
Audio über ALSA), falls TLS/Streaming auf dem ESP32 zu aufwändig wird.

## Server-Schnittstelle

Die Box authentifiziert sich pro Gerät mit einem `device_token` (Bearer) und
sendet die gelesene Tag-UID:

```
POST /api/box/playback
Authorization: Bearer <device_token>
Content-Type: application/json

{ "tagUid": "04A1B2C3D4E5F6" }
```

Antworten:

- `200 { url, mime, durationMs }` → signierte, kurzlebige Audio-URL → streamen & abspielen.
- `409 { error: "empty" }` → Stein noch nicht bestätigt/leer → neutrales Feedback.
- `404 { error: "stone_unknown" }` → unbekannter Tag → Fehler-LED.
- `401` → Geräte-Token ungültig.

Ein `device_token` wird per Seed (`npm run seed`) oder manuell in `box_devices`
angelegt und sicher auf der Box hinterlegt (z. B. NVS-Flash).

## Firmware-Ablauf

```
setup():
  WLAN verbinden (Captive Portal beim Erststart)
  device_token aus NVS laden
  PN532 init, I2S/DAC init, LED = bereit

loop():
  tagUid = PN532.readPassiveTargetID()      // blockierend/poll
  if (tagUid):
     LED = arbeiten
     resp = HTTPS POST /api/box/playback  (Bearer device_token, {tagUid})
     switch resp.status:
        200 -> streamAudio(resp.url) über I2S; LED = spielt
        409 -> kurzer "leer"-Ton; LED = neutral
        sonst -> Fehler-Ton; LED = rot
     warte bis Stein entfernt wird (Entprellen), dann LED = bereit
```

## Hinweise

- **TLS:** Root-CA der App-Domain im Flash hinterlegen (`WiFiClientSecure`).
  Bei Streaming-Problemen mit großen Dateien: in Häppchen lesen und direkt in den
  I2S-Puffer schreiben.
- **Codec:** Für ESP32-Decoding ist **MP3** am robustesten (`libhelix`/`ESP8266Audio`).
  Browser nehmen i. d. R. **Opus/WebM** auf → ein serverseitiger Transcode-Schritt
  (Opus→MP3 beim Bestätigen) ist für die Box empfehlenswert. Offener Punkt aus dem
  Plan – im Phase-0-Spike entscheiden.
- **Offline/Cache:** optional die zuletzt gespielte Datei cachen, um kurze
  WLAN-Aussetzer zu überbrücken.
- **Sicherheit:** `device_token` niemals im Klartext loggen; serverseitig
  perspektivisch gehasht speichern und Rotation ermöglichen.
