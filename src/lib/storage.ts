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
import { put as blobPut, del as blobDel, get as blobGet } from "@vercel/blob";
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
    // Private Blobs: kein öffentlicher URL; Wiedergabe läuft über die gated Audio-Route.
    const res = await blobPut(key, data, {
      access: "private",
      contentType,
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return { key: res.pathname, url: null, sizeBytes: data.byteLength };
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
    await blobDel(ref.storageKey, { token: process.env.BLOB_READ_WRITE_TOKEN });
    return;
  }
  await s3().send(
    new DeleteObjectCommand({ Bucket: env.s3.bucket(), Key: ref.storageKey }),
  );
}

export type AudioResult =
  | { kind: "stream"; stream: ReadableStream; contentType?: string }
  | { kind: "redirect"; url: string };

/**
 * Liefert die Audiodaten zum Ausspielen:
 *  - blob: privater Server-Stream (über unsere gated Route weitergereicht)
 *  - s3:   kurzlebig signierte URL (Redirect)
 */
export async function fetchAudio(ref: StoredRef): Promise<AudioResult> {
  if (storageDriver() === "blob") {
    const res = await blobGet(ref.storageKey, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!res || !res.stream) throw new Error("Blob nicht gefunden");
    return {
      kind: "stream",
      stream: res.stream,
      contentType: res.headers?.get("content-type") ?? undefined,
    };
  }
  const url = await getSignedUrl(
    s3(),
    new GetObjectCommand({ Bucket: env.s3.bucket(), Key: ref.storageKey }),
    { expiresIn: env.signedUrlTtlSeconds },
  );
  return { kind: "redirect", url };
}
