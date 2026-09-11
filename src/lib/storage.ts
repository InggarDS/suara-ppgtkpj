import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Object storage (Cloudflare R2, S3-compatible) for participant/candidate
 * photos and the event banner — Phase 1 of moving media out of Postgres.
 *
 * Every write goes through `uploadImage()`, which is a strict upgrade over the
 * old behaviour, never a regression: without R2 configured (`storageEnabled()`
 * false) or on any upload error, it returns the original `data:image/...`
 * string unchanged — exactly what used to be written straight to the DB. A
 * storage hiccup must never block a registration or photo save.
 *
 * Keys are deterministic per entity (`participants/<eventId>/<id>.jpg`,
 * `banners/<eventId>.jpg`) so a re-upload overwrites instead of accumulating
 * orphaned objects. The returned URL carries a `?v=<timestamp>` so a later
 * re-upload is never served stale from a CDN/browser cache even though the
 * underlying key is unchanged.
 */

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

const ACCOUNT_ID = env("R2_ACCOUNT_ID");
const ACCESS_KEY_ID = env("R2_ACCESS_KEY_ID");
const SECRET_ACCESS_KEY = env("R2_SECRET_ACCESS_KEY");
const BUCKET = env("R2_BUCKET");
const PUBLIC_BASE = env("R2_PUBLIC_URL")?.replace(/\/+$/, "");

export function storageEnabled(): boolean {
  return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET && PUBLIC_BASE);
}

type G = typeof globalThis & { __suaraR2?: S3Client | null };
const g = globalThis as G;

function client(): S3Client | null {
  if (!storageEnabled()) return null;
  if (g.__suaraR2 === undefined) {
    g.__suaraR2 = new S3Client({
      region: "auto",
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: ACCESS_KEY_ID!, secretAccessKey: SECRET_ACCESS_KEY! },
    });
  }
  return g.__suaraR2;
}

function parseDataUrl(dataUrl: string): { contentType: string; buffer: Buffer } | null {
  const m = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!m) return null;
  try {
    return { contentType: m[1] || "image/jpeg", buffer: Buffer.from(m[2], "base64") };
  } catch {
    return null;
  }
}

/**
 * Upload a compressed `data:image/...;base64,...` string to R2 under `key`
 * and return a versioned public URL. Returns the input unchanged when R2 is
 * not configured, the string isn't a data URL (e.g. already an R2 URL from a
 * previous upload), or the upload fails.
 */
export async function uploadImage(dataUrl: string, key: string): Promise<string> {
  const c = client();
  if (!c) return dataUrl;
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return dataUrl;

  try {
    await c.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: parsed.buffer,
        ContentType: parsed.contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    return `${PUBLIC_BASE}/${key}?v=${Date.now()}`;
  } catch (err) {
    console.error("[storage] upload failed, keeping inline image:", err instanceof Error ? err.message : err);
    return dataUrl;
  }
}

/** Best-effort delete (e.g. banner removed). Never throws. No-op without R2. */
export async function deleteImage(key: string): Promise<void> {
  const c = client();
  if (!c) return;
  try {
    await c.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    /* ignore */
  }
}
