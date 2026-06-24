// Storage-Abstraktion mit zwei Treibern:
//  - "s3":   lokale Entwicklung (MinIO) bzw. AWS S3 / R2 – Server-Upload + presigned GET
//  - "blob": Produktion auf Vercel (Vercel Blob) – öffentlicher, nicht erratbarer URL
//
// Treiberwahl: STORAGE_DRIVER (explizit) oder automatisch:
//   BLOB_READ_WRITE_TOKEN gesetzt -> "blob", sonst "s3".

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { put as blobPut, del as blobDel } from "@vercel/blob";
import { env } from "./env";

export type StorageDriver = "s3" | "blob";

export function storageDriver(): StorageDriver {
  const explicit = process.env.STORAGE_DRIVER as StorageDriver | undefined;
  if (explicit === "s3" || explicit === "blob") return explicit;
  return process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "s3";
}

/** Object Key / Blob-Pfad für die Aufnahme eines Steins/Recordings. */
export function audioKey(stoneId: string, recordingId: string): string {
  return `stones/${stoneId}/recordings/${recordingId}.audio`;
}

export type SavedAudio = {
  key: string; // Object-Key (s3) bzw. Blob-Pfad
  url: string | null; // öffentlicher URL (blob) bzw. null (s3 -> presigned bei Bedarf)
  sizeBytes: number;
};

/** Repräsentation, wie sie aus der DB kommt (für Wiedergabe/Löschen). */
export type StoredRef = { storageKey: string; publicUrl: string | null };

// --- S3-Client (lazy) ---
let s3Client: S3Client | null = null;
function s3(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.s3.region,
      endpoint: env.s3.endpoint || undefined,
      forcePathStyle: env.s3.forcePathStyle,
      credentials: {
        accessKeyId: env.s3.accessKeyId(),
        secretAccessKey: env.s3.secretAccessKey(),
      },
    });
  }
  return s3Client;
}

/** Lädt die Audiodaten in den Storage (serverseitig). */
export async function putAudio(
  key: string,
  data: Buffer,
  contentType: string,
): Promise<SavedAudio> {
  if (storageDriver() === "blob") {
    const res = await blobPut(key, data, {
      access: "public",
      contentType,
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return { key: res.pathname, url: res.url, sizeBytes: data.byteLength };
  }
  await s3().send(
    new PutObjectCommand({
      Bucket: env.s3.bucket(),
      Key: key,
      Body: data,
      ContentType: contentType,
    }),
  );
  return { key, url: null, sizeBytes: data.byteLength };
}

/** Löscht eine Aufnahme aus dem Storage. */
export async function deleteAudio(ref: StoredRef): Promise<void> {
  if (storageDriver() === "blob") {
    if (ref.publicUrl) {
      await blobDel(ref.publicUrl, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
    }
    return;
  }
  await s3().send(
    new DeleteObjectCommand({ Bucket: env.s3.bucket(), Key: ref.storageKey }),
  );
}

/** Liefert eine abspielbare URL: öffentlicher Blob-URL bzw. kurzlebig signierter S3-URL. */
export async function playbackUrl(ref: StoredRef): Promise<string> {
  if (storageDriver() === "blob") {
    if (!ref.publicUrl) throw new Error("Blob-URL fehlt");
    return ref.publicUrl;
  }
  return getSignedUrl(
    s3(),
    new GetObjectCommand({ Bucket: env.s3.bucket(), Key: ref.storageKey }),
    { expiresIn: env.signedUrlTtlSeconds },
  );
}
