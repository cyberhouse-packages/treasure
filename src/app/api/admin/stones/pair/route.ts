import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";

const Body = z.object({
  qrToken: z.string().min(1),
  tagUid: z.string().min(1),
});

// Tag-Pairing: verknüpft die beim Einbau gescannte NFC/RFID Tag-UID mit dem Stein.
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { qrToken, tagUid } = parsed.data;

  const stone = await prisma.stone.findUnique({ where: { qrToken } });
  if (!stone) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    await prisma.stone.update({
      where: { id: stone.id },
      data: { tagUid },
    });
  } catch (e) {
    // tagUid ist unique – Kollision sauber melden.
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json({ error: "tag_already_paired" }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true, stoneId: stone.id, tagUid });
}
