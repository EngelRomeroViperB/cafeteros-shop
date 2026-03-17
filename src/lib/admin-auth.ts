import crypto from "node:crypto";
import type { NextRequest } from "next/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns true if the string is a valid UUID v4 format */
export function isUUID(value: string | null | undefined): boolean {
  return !!value && UUID_RE.test(value);
}

/**
 * Timing-safe comparison of the admin key header against the server secret.
 * Returns true if the key is valid, false otherwise.
 */
export function verifyAdminKey(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key") ?? "";
  const secret = process.env.ADMIN_SECRET_KEY ?? "";

  if (!secret || !key) return false;
  if (key.length !== secret.length) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(key), Buffer.from(secret));
  } catch {
    return false;
  }
}
