import { NextRequest, NextResponse } from "next/server";
import { checkRate } from "@/lib/rate-limit";
import { verifyAdminKey } from "@/lib/admin-auth";

export function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export function tooMany() {
  return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
}

export function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

/**
 * Shared admin guard: rate-limit + admin key verification.
 * Returns a NextResponse (error) if the request is denied, or null if allowed.
 */
export function guardAdmin(req: NextRequest, label: string): NextResponse | null {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRate(`admin:${ip}`, 30, 60_000)) return tooMany();
  if (!verifyAdminKey(req)) {
    console.warn(`[ADMIN AUTH FAIL] ${label} — IP: ${ip}`);
    return unauthorized();
  }
  return null;
}
