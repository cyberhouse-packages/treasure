import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findStoneByToken } from "@/lib/stoneRepo";
import { canRecord, isDurationValid, type StoneStatus } from "@/lib/stoneRules";
import { newId } from "@/lib/ids";
import { audioKey, putAudio, deleteAudio, storageDriver } from "@/lib/storage";
import { ALLOWED_AUDIO_MIME, MAX_UPLOAD_BYTES } from "@/lib/constants";

// Nimmt die Audiodaten direkt entgegen (Binary-Body), legt sie im Storage ab und
// registriert sie als Entwurf. Überschreibt dabei einen vorhandenen Entwurf des Steins.
//
// Header:  Content-Type = MIME der Aufnahme, X-Duration-Ms = Dauer in ms
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const contentType = (req.headers.get("content-type") || "").split(",")[0].trim();
  const durationMs = Number(req.headers.get("x-duration-ms"));

  if (!ALLOWED_AUDIO_MIME.includes(contentType as (typeof ALLOWED_AUDIO_MIME)[number])) {
    return NextResponse.json({ error: "invalid_mime" }, { status: 415 });
  }
  if (!isDurationValid(durationMs)) {
    return NextResponse.json({ error: "duration_invalid" }, { status: 422 });
  }

  const stone = await findStoneByToken(token);
  if (!stone) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!canRecord(stone.status as StoneStatus)) {
    return NextResponse.json({ error: "locked" }, { status: 409 });
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.byteLength === 0) {
    return NextResponse.json({ error: "empty_body" }, { status: 422 });
  }
  if (buf.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  // Vorherige Entwürfe (DB + Storage) zum Überschreiben einsammeln.
  const oldDrafts = await prisma.recording.findMany({
    where: { stoneId: stone.id, state: "draft" },
    select: { id: true, storageKey: true, publicUrl: true },
  });

  const recordingId = newId();
  const key = audioKey(stone.id, recordingId);
  try {
    const saved = await putAudio(key, buf, contentType);

    await prisma.$transaction([
      prisma.recording.deleteMany({
        where: { stoneId: stone.id, state: "draft" },
      }),
      prisma.recording.create({
        data: {
          id: recordingId,
          stoneId: stone.id,
          storageKey: saved.key,
          publicUrl: saved.url,
          durationMs,
          mime: contentType,
          sizeBytes: saved.sizeBytes,
          state: "draft",
        },
      }),
      prisma.stone.update({
        where: { id: stone.id },
        data: { status: "recorded" },
      }),
    ]);
  } catch (e) {
    // Klarer Fehler statt generischem 500, damit Speicherprobleme sichtbar werden.
    const detail = e instanceof Error ? e.message : String(e);
    console.error("recording save failed:", detail);
    return NextResponse.json(
      { error: "save_failed", driver: storageDriver(), detail },
      { status: 500 },
    );
  }

  // Alte Storage-Objekte erst nach erfolgreichem DB-Update entfernen (best effort).
  await Promise.all(
    oldDrafts.map((d) =>
      deleteAudio({ storageKey: d.storageKey, publicUrl: d.publicUrl }).catch(
        () => {},
      ),
    ),
  );

  return NextResponse.json({ ok: true, recordingId, status: "recorded" });
}
