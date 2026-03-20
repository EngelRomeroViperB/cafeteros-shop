import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { buildWompiSignature, buildWompiCheckoutUrl } from "./wompi";

describe("buildWompiSignature", () => {
  const INTEGRITY_SECRET = "test_integrity_secret";

  beforeEach(() => {
    vi.stubEnv("WOMPI_INTEGRITY_SECRET", INTEGRITY_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("produces a valid sha256 hex hash", () => {
    const sig = buildWompiSignature("ref-123", 5000000, "COP");
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it("matches manual sha256 computation", () => {
    const ref = "ref-abc";
    const amount = 1000000;
    const currency = "COP";
    const raw = `${ref}${amount}${currency}${INTEGRITY_SECRET}`;
    const expected = crypto.createHash("sha256").update(raw).digest("hex");
    expect(buildWompiSignature(ref, amount, currency)).toBe(expected);
  });

  it("throws when integrity secret is not configured", () => {
    vi.stubEnv("WOMPI_INTEGRITY_SECRET", "");
    expect(() => buildWompiSignature("ref", 100, "COP")).toThrow(
      "Payment integrity configuration is missing"
    );
  });

  it("produces different hashes for different references", () => {
    const sig1 = buildWompiSignature("ref-1", 5000000, "COP");
    const sig2 = buildWompiSignature("ref-2", 5000000, "COP");
    expect(sig1).not.toBe(sig2);
  });
});

describe("buildWompiCheckoutUrl", () => {
  beforeEach(() => {
    vi.stubEnv("WOMPI_INTEGRITY_SECRET", "test_integrity");
    vi.stubEnv("WOMPI_PUBLIC_KEY", "pub_test_key");
    vi.stubEnv("WOMPI_CHECKOUT_URL", "https://checkout.wompi.co/p/");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a URL with all required query params", () => {
    const url = buildWompiCheckoutUrl({
      amountInCents: 15000000,
      customerEmail: "test@example.com",
      reference: "cafeteros-123",
      redirectUrl: "https://example.com/checkout/result",
    });

    expect(url).toContain("public-key=pub_test_key");
    expect(url).toContain("currency=COP");
    expect(url).toContain("amount-in-cents=15000000");
    expect(url).toContain("reference=cafeteros-123");
    expect(url).toContain("redirect-url=");
    expect(url).toContain("signature%3Aintegrity=");
    expect(url).toContain("customer-data%3Aemail=test%40example.com");
  });

  it("throws when public key is not configured", () => {
    vi.stubEnv("WOMPI_PUBLIC_KEY", "");
    expect(() =>
      buildWompiCheckoutUrl({
        amountInCents: 100,
        customerEmail: "a@b.com",
        reference: "ref",
        redirectUrl: "https://x.com",
      })
    ).toThrow("Payment gateway configuration is missing");
  });
});
