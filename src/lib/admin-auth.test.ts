import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isUUID, verifyAdminKey } from "./admin-auth";
import { NextRequest } from "next/server";

describe("isUUID", () => {
  it("accepts a valid UUID v4", () => {
    expect(isUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("accepts uppercase UUID", () => {
    expect(isUUID("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });

  it("rejects null", () => {
    expect(isUUID(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isUUID(undefined)).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isUUID("")).toBe(false);
  });

  it("rejects malformed UUID (missing segment)", () => {
    expect(isUUID("550e8400-e29b-41d4-a716")).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(isUUID("550e8400-e29b-41d4-a716-44665544zzzz")).toBe(false);
  });

  it("rejects UUID without dashes", () => {
    expect(isUUID("550e8400e29b41d4a716446655440000")).toBe(false);
  });
});

describe("verifyAdminKey", () => {
  const REAL_SECRET = "test-secret-key-12345";

  beforeEach(() => {
    vi.stubEnv("ADMIN_SECRET_KEY", REAL_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(key?: string): NextRequest {
    const headers = new Headers();
    if (key !== undefined) headers.set("x-admin-key", key);
    return new NextRequest("http://localhost/api/admin/products", { headers });
  }

  it("returns true for correct key", () => {
    expect(verifyAdminKey(makeReq(REAL_SECRET))).toBe(true);
  });

  it("returns false for wrong key of same length", () => {
    expect(verifyAdminKey(makeReq("wrong-secret-key-12345"))).toBe(false);
  });

  it("returns false for wrong key of different length", () => {
    expect(verifyAdminKey(makeReq("short"))).toBe(false);
  });

  it("returns false when no header is sent", () => {
    expect(verifyAdminKey(makeReq())).toBe(false);
  });

  it("returns false when header is empty string", () => {
    expect(verifyAdminKey(makeReq(""))).toBe(false);
  });

  it("returns false when server secret is not configured", () => {
    vi.stubEnv("ADMIN_SECRET_KEY", "");
    expect(verifyAdminKey(makeReq("any-key"))).toBe(false);
  });
});
