import { NextRequest, NextResponse } from "next/server";
import { findStoneByToken, latestRecording } from "@/lib/stoneRepo";
import { fetchAudio } from "@/lib/storage";

// Streamt die bestätigte Aufnahme aus (privat). Zugriff über den unerratbaren Token;
// nur für bestätigte Steine. Dient als <audio src> für Web und als Stream für die Box.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const stone = await findStoneByToken(token);
  if (!stone || stone.status !== "confirmed") {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }
  const rec = latestRecording(stone);
  if (!rec || rec.state !== "confirmed") {
    return NextResponse.json({ error: "no_recording" }, { status: 404 });
  }

  const audio = await fetchAudio({
    storageKey: rec.storageKey,
    publicUrl: rec.publicUrl,
  });

  if (audio.kind === "redirect") {
    return NextResponse.redirect(audio.url, 302);
  }

  return new Response(audio.stream, {
    headers: {
      "Content-Type": audio.contentType || rec.mime,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
