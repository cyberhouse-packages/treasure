import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";
import { newId, newQrToken } from "@/lib/ids";
import { env } from "@/lib/env";

const Body = z.object({
  count: z.number().int().min(1).max(1000),
  labelPrefix: z.string().max(80).optional(),
});

// Batch-Anlage von Steinen: erzeugt qr_token + Datensatz und liefert die QR-URLs zurück.
// Das Tag-Pairing (tagUid) erfolgt separat beim Einbau des NFC-Chips.
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { count, labelPrefix } = parsed.data;

  const rows = Array.from({ length: count }, (_, i) => ({
    id: newId(),
    qrToken: newQrToken(),
    label: labelPrefix ? `${labelPrefix}-${i + 1}` : null,
  }));

  await prisma.stone.createMany({ data: rows });

  const stones = rows.map((r) => ({
    id: r.id,
    qrToken: r.qrToken,
    label: r.label,
    recordUrl: `${env.appBaseUrl}/s/${r.qrToken}`,
    qrPngUrl: `${env.appBaseUrl}/api/admin/stones/${r.qrToken}/qr.png`,
  }));

  return NextResponse.json({ created: stones.length, stones });
}
