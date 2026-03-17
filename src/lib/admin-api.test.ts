import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { guardAdmin, unauthorized, tooMany, badRequest } from "./admin-api";

describe("response helpers", () => {
  it("unauthorized returns 401", async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("No autorizado");
  });

  it("tooMany returns 429", async () => {
    const res = tooMany();
    expect(res.status).toBe(429);
  });

  it("badRequest returns 400 with custom message", async () => {
    const res = badRequest("Campo requerido");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Campo requerido");
  });
});

describe("guardAdmin", () => {
  const SECRET = "my-admin-secret";

  beforeEach(() => {
    vi.stubEnv("ADMIN_SECRET_KEY", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(key?: string, ip?: string): NextRequest {
    const headers = new Headers();
    if (key) headers.set("x-admin-key", key);
    if (ip) headers.set("x-forwarded-for", ip);
    return new NextRequest("http://localhost/api/admin/products", { headers });
  }

  it("returns null (allowed) for valid admin key", () => {
    const result = guardAdmin(makeReq(SECRET, "1.2.3.4"), "TEST");
    expect(result).toBeNull();
  });

  it("returns 401 for invalid admin key", async () => {
    const result = guardAdmin(makeReq("wrong-key", "1.2.3.4"), "TEST");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it("returns 401 for missing admin key", async () => {
    const result = guardAdmin(makeReq(undefined, "1.2.3.4"), "TEST");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it("returns 429 after exceeding rate limit", () => {
    const ip = `rate-test-${Date.now()}`;
    // Exhaust the 30 req/min limit
    for (let i = 0; i < 30; i++) {
      guardAdmin(makeReq(SECRET, ip), "TEST");
    }
    const result = guardAdmin(makeReq(SECRET, ip), "TEST");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });
});
