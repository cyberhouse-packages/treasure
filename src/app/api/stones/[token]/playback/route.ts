import { NextRequest, NextResponse } from "next/server";
import { findStoneByToken, latestRecording } from "@/lib/stoneRepo";
import { playbackUrl } from "@/lib/storage";

// Liefert eine kurzlebige signierte Audio-URL für die QR-Wiedergabe.
// Nur für bestätigte Steine; Entwürfe werden hier nicht ausgeliefert.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const stone = await findStoneByToken(token);
  if (!stone) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (stone.status !== "confirmed") {
    return NextResponse.json({ error: "not_confirmed" }, { status: 409 });
  }

  const rec = latestRecording(stone);
  if (!rec || rec.state !== "confirmed") {
    return NextResponse.json({ error: "no_recording" }, { status: 404 });
  }

  const url = await playbackUrl({
    storageKey: rec.storageKey,
    publicUrl: rec.publicUrl,
  });
  return NextResponse.json({ url, mime: rec.mime, durationMs: rec.durationMs });
}
