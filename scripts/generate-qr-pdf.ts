// Erzeugt N bespielbare Steine (DB) und ein druckfertiges PDF mit ihren QR-Codes.
//
// Aufruf:
//   npm run qr:pdf                       -> 10 Steine, PDF in qr-codes.pdf
//   npm run qr:pdf -- 20 Charge-A        -> 20 Steine, Label-Präfix "Charge-A"
//   BASE_URL=https://meine-domain ... npm run qr:pdf   -> QR zeigt auf andere Basis-URL
//
// Hinweis: Die QR-URL nutzt BASE_URL (falls gesetzt) sonst APP_BASE_URL.
// Für das Aufnehmen am Smartphone muss diese URL vom Handy erreichbar und HTTPS
// sein (getUserMedia braucht einen "secure context"; localhost zählt nur am PC).

import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { prisma } from "../src/lib/prisma";
import { newId, newQrToken } from "../src/lib/ids";

async function main() {
  const count = Number(process.argv[2] ?? 10);
  const labelPrefix = process.argv[3] ?? "Stein";
  const baseUrl = (
    process.env.BASE_URL ??
    process.env.APP_BASE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");

  if (!Number.isInteger(count) || count < 1 || count > 200) {
    throw new Error("Anzahl muss zwischen 1 und 200 liegen.");
  }

  // 1) Steine in der DB anlegen (damit sie bespielt werden können).
  const rows = Array.from({ length: count }, (_, i) => ({
    id: newId(),
    qrToken: newQrToken(),
    label: `${labelPrefix}-${i + 1}`,
  }));
  await prisma.stone.createMany({ data: rows });

  // 2) QR-PNG-Buffer für jede Aufnahme-URL erzeugen.
  const items = await Promise.all(
    rows.map(async (r) => {
      const url = `${baseUrl}/s/${r.qrToken}`;
      const png = await QRCode.toBuffer(url, {
        width: 400,
        margin: 1,
        errorCorrectionLevel: "M",
      });
      return { label: r.label, url, png };
    }),
  );

  // 3) PDF-Layout: A4, 2 Spalten x 5 Zeilen = 10 pro Seite.
  const outPath = path.resolve(process.cwd(), "qr-codes.pdf");
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  const margin = 40;
  const cols = 2;
  const rowsPerPage = 5;
  const perPage = cols * rowsPerPage;
  const usableW = doc.page.width - margin * 2;
  const usableH = doc.page.height - margin * 2;
  const cellW = usableW / cols;
  const cellH = usableH / rowsPerPage;
  const qrSize = 120;

  items.forEach((it, i) => {
    if (i > 0 && i % perPage === 0) doc.addPage();
    const idx = i % perPage;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = margin + col * cellW;
    const y = margin + row * cellH;

    doc.image(it.png, x + (cellW - qrSize) / 2, y + 8, { width: qrSize });
    doc
      .fillColor("#111")
      .fontSize(13)
      .text(it.label, x, y + qrSize + 16, { width: cellW, align: "center" });
    doc
      .fillColor("#777")
      .fontSize(7)
      .text(it.url, x + 10, y + qrSize + 34, {
        width: cellW - 20,
        align: "center",
      });
  });

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  console.log(`\n✔ ${count} Steine angelegt, PDF erstellt:`);
  console.log(`  ${outPath}`);
  console.log(`  QR-Basis-URL: ${baseUrl}/s/<token>\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
