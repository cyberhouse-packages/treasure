import { prisma } from "./prisma";

/** Stein per QR-Token inkl. zuletzt erstelltem Recording laden. */
export function findStoneByToken(qrToken: string) {
  return prisma.stone.findUnique({
    where: { qrToken },
    include: {
      recordings: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

/** Stein per NFC/RFID Tag-UID laden (für die Box). */
export function findStoneByTagUid(tagUid: string) {
  return prisma.stone.findUnique({
    where: { tagUid },
    include: {
      recordings: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export type StoneWithLatest = NonNullable<
  Awaited<ReturnType<typeof findStoneByToken>>
>;

/** Das aktuell relevante Recording (neuester Eintrag) oder null. */
export function latestRecording(stone: StoneWithLatest) {
  return stone.recordings[0] ?? null;
}
