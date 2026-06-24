// Lokales Seed-Script: legt eine Test-Box und ein paar Steine an.
// Aufruf:  npm run seed
import { prisma } from "../src/lib/prisma";
import { newId, newQrToken, newDeviceToken } from "../src/lib/ids";

async function main() {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  // Test-Box
  const deviceToken = newDeviceToken();
  const box = await prisma.boxDevice.create({
    data: { id: newId(), deviceToken, label: "Test-Box" },
  });

  // 3 Steine
  const stones = [];
  for (let i = 1; i <= 3; i++) {
    const stone = await prisma.stone.create({
      data: {
        id: newId(),
        qrToken: newQrToken(),
        tagUid: `TEST-TAG-${i}`,
        label: `Demo-${i}`,
      },
    });
    stones.push(stone);
  }

  console.log("\n=== Seed abgeschlossen ===\n");
  console.log("Box device_token (Bearer):", deviceToken, "\n");
  for (const s of stones) {
    console.log(`Stein ${s.label}:`);
    console.log(`  Aufnahme-URL: ${baseUrl}/s/${s.qrToken}`);
    console.log(`  tagUid:       ${s.tagUid}\n`);
  }
  console.log("Box-Test (PowerShell):");
  console.log(
    `  Invoke-RestMethod -Method Post -Uri ${baseUrl}/api/box/playback ` +
      `-Headers @{ Authorization = "Bearer ${deviceToken}" } ` +
      `-ContentType "application/json" -Body '{"tagUid":"${stones[0].tagUid}"}'`,
  );
  void box;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
