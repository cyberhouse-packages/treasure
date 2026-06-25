import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findStoneByTagUid, latestRecording } from "@/lib/stoneRepo";
import { env } from "@/lib/env";

const Body = z.object({
  tagUid: z.string().min(1),
});

// Endpoint für die Hardware-Box: authentifiziert per device_token (Bearer),
// liest die NFC/RFID Tag-UID und liefert eine signierte Audio-URL.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const deviceToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!deviceToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const device = await prisma.boxDevice.findUnique({
    where: { deviceToken },
  });
  if (!device) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // Heartbeat / Telemetrie aktualisieren.
  await prisma.boxDevice.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date() },
  });

  const stone = await findStoneByTagUid(parsed.data.tagUid);
  if (!stone) {
    return NextResponse.json({ error: "stone_unknown" }, { status: 404 });
  }
  if (stone.status !== "confirmed") {
    // Leerer / noch nicht bestätigter Stein: Box gibt z.B. Default-Feedback.
    return NextResponse.json({ error: "empty" }, { status: 409 });
  }

  const rec = latestRecording(stone);
  if (!rec || rec.state !== "confirmed") {
    return NextResponse.json({ error: "empty" }, { status: 409 });
  }

  // Absolute URL zur gated Audio-Stream-Route (die Box streamt diese direkt).
  const url = `${env.appBaseUrl}/api/stones/${stone.qrToken}/audio`;
  return NextResponse.json({ url, mime: rec.mime, durationMs: rec.durationMs });
}
