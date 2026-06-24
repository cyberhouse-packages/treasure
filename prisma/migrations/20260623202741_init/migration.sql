-- CreateEnum
CREATE TYPE "StoneStatus" AS ENUM ('empty', 'recorded', 'confirmed');

-- CreateEnum
CREATE TYPE "RecordingState" AS ENUM ('draft', 'confirmed');

-- CreateTable
CREATE TABLE "stones" (
    "id" TEXT NOT NULL,
    "tag_uid" TEXT,
    "qr_token" TEXT NOT NULL,
    "status" "StoneStatus" NOT NULL DEFAULT 'empty',
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recordings" (
    "id" TEXT NOT NULL,
    "stone_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "mime" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "state" "RecordingState" NOT NULL DEFAULT 'draft',
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "box_devices" (
    "id" TEXT NOT NULL,
    "device_token" TEXT NOT NULL,
    "label" TEXT,
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "box_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stones_tag_uid_key" ON "stones"("tag_uid");

-- CreateIndex
CREATE UNIQUE INDEX "stones_qr_token_key" ON "stones"("qr_token");

-- CreateIndex
CREATE INDEX "recordings_stone_id_idx" ON "recordings"("stone_id");

-- CreateIndex
CREATE UNIQUE INDEX "box_devices_device_token_key" ON "box_devices"("device_token");

-- AddForeignKey
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_stone_id_fkey" FOREIGN KEY ("stone_id") REFERENCES "stones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
