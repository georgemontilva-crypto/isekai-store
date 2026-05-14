/**
 * Storage helpers — Cloudflare R2
 *
 * Usa el SDK de AWS S3 (ya instalado) apuntando al endpoint de R2.
 * Variables necesarias en Railway:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_BUCKET_NAME, R2_PUBLIC_URL
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

function getR2Client(): S3Client {
  if (!ENV.r2AccountId || !ENV.r2AccessKeyId || !ENV.r2SecretAccessKey) {
    throw new Error(
      "Cloudflare R2 no configurado. Agrega R2_ACCOUNT_ID, R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY en Railway."
    );
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${ENV.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     ENV.r2AccessKeyId,
      secretAccessKey: ENV.r2SecretAccessKey,
    },
  });
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

/**
 * Sube un archivo a R2 y devuelve la clave y URL pública.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const client = getR2Client();
  const key = appendHashSuffix(normalizeKey(relKey));

  const body = typeof data === "string" ? Buffer.from(data) : data;

  await client.send(
    new PutObjectCommand({
      Bucket:      ENV.r2BucketName,
      Key:         key,
      Body:        body,
      ContentType: contentType,
    })
  );

  const publicUrl = ENV.r2PublicUrl.replace(/\/+$/, "");
  return { key, url: `${publicUrl}/${key}` };
}

/**
 * Devuelve la URL pública de un objeto en R2.
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const publicUrl = ENV.r2PublicUrl.replace(/\/+$/, "");
  return { key, url: `${publicUrl}/${key}` };
}

/**
 * Genera una URL prefirmada para descarga privada (si el bucket no es público).
 */
export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const client = getR2Client();
  const key = normalizeKey(relKey);

  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: ENV.r2BucketName, Key: key }),
    { expiresIn: 3600 }
  );
}

/**
 * Elimina un objeto de R2.
 */
export async function storageDelete(relKey: string): Promise<void> {
  const client = getR2Client();
  const key = normalizeKey(relKey);
  await client.send(
    new DeleteObjectCommand({ Bucket: ENV.r2BucketName, Key: key })
  );
}
