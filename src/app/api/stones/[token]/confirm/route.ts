import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findStoneByToken, latestRecording } from "@/lib/stoneRepo";
import { canConfirm, type StoneStatus } from "@/lib/stoneRules";

// Bestätigt den aktuellen Entwurf und sperrt den Stein dauerhaft (Immutability).
// Transaktional, damit Stein-Status und Recording-Zustand konsistent bleiben.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const stone = await findStoneByToken(token);
  if (!stone) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (stone.status === "confirmed") {
    return NextResponse.json({ error: "locked" }, { status: 409 });
  }
  if (!canConfirm(stone.status as StoneStatus)) {
    return NextResponse.json({ error: "nothing_to_confirm" }, { status: 409 });
  }

  const draft = latestRecording(stone);
  if (!draft || draft.state !== "draft") {
    return NextResponse.json({ error: "nothing_to_confirm" }, { status: 409 });
  }

  try {
    // Guard erneut in der Transaktion (Schutz gegen parallele Confirms / Race).
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.stone.findUnique({ where: { id: stone.id } });
      if (!fresh || fresh.status !== "recorded") {
        throw new Error("conflict");
      }
      await tx.recording.update({
        where: { id: draft.id },
        data: { state: "confirmed", confirmedAt: new Date() },
      });
      // Etwaige verbliebene Alt-Entwürfe verwerfen.
      await tx.recording.deleteMany({
        where: { stoneId: stone.id, state: "draft", id: { not: draft.id } },
      });
      await tx.stone.update({
        where: { id: stone.id },
        data: { status: "confirmed" },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "conflict") {
      return NextResponse.json({ error: "conflict" }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true, status: "confirmed" });
}
