import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";
import { env } from "@/lib/env";

// Erzeugt das QR-Code-Bild (PNG) für einen Stein – Eingang für Druck/Gravur.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { token } = await params;

  const stone = await prisma.stone.findUnique({ where: { qrToken: token } });
  if (!stone) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const url = `${env.appBaseUrl}/s/${stone.qrToken}`;
  const png = await QRCode.toBuffer(url, {
    type: "png",
    width: 600,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
