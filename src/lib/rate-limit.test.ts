import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRate } from "./rate-limit";

describe("checkRate", () => {
  beforeEach(() => {
    // Use unique keys per test to avoid cross-test pollution
  });

  it("allows requests under the limit", () => {
    const key = `test-allow-${Date.now()}`;
    expect(checkRate(key, 3, 60_000)).toBe(true);
    expect(checkRate(key, 3, 60_000)).toBe(true);
    expect(checkRate(key, 3, 60_000)).toBe(true);
  });

  it("blocks requests at the limit", () => {
    const key = `test-block-${Date.now()}`;
    checkRate(key, 2, 60_000);
    checkRate(key, 2, 60_000);
    expect(checkRate(key, 2, 60_000)).toBe(false);
  });

  it("allows requests again after the window expires", () => {
    const key = `test-expire-${Date.now()}`;
    vi.useFakeTimers();

    checkRate(key, 1, 1000);
    expect(checkRate(key, 1, 1000)).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(checkRate(key, 1, 1000)).toBe(true);

    vi.useRealTimers();
  });

  it("tracks different keys independently", () => {
    const keyA = `test-a-${Date.now()}`;
    const keyB = `test-b-${Date.now()}`;

    checkRate(keyA, 1, 60_000);
    expect(checkRate(keyA, 1, 60_000)).toBe(false);
    expect(checkRate(keyB, 1, 60_000)).toBe(true);
  });

  it("handles limit of 0", () => {
    const key = `test-zero-${Date.now()}`;
    expect(checkRate(key, 0, 60_000)).toBe(false);
  });
});
