import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Supabase before importing the route
const mockFrom = vi.fn();
const mockRpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

// Mock Wompi
vi.mock("@/lib/wompi", () => ({
  buildWompiCheckoutUrl: vi.fn(() => "https://checkout.wompi.co/p/?mock=true"),
}));

// Mock rate limiter (allow everything by default)
vi.mock("@/lib/rate-limit", () => ({
  checkRate: vi.fn(() => true),
}));

import { POST } from "./route";
import { checkRate } from "@/lib/rate-limit";

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/checkout/wompi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validItem = {
  productId: "prod-1",
  variantId: "var-1",
  name: "Camiseta",
  size: "M",
  gender: "Caballero",
  unitPrice: 150000,
  qty: 1,
  imageUrl: null,
};

function mockVariantsQuery(variants: { id: string; stock: number; price_cop: number }[]) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "product_variants") {
      return {
        select: () => ({
          in: () => ({
            data: variants,
            error: null,
          }),
        }),
      };
    }
    if (table === "orders") {
      return {
        insert: () => ({
          select: () => ({
            single: () => ({ data: { id: "order-1" }, error: null }),
          }),
        }),
      };
    }
    if (table === "order_items") {
      return {
        insert: () => ({ error: null }),
      };
    }
    return {};
  });
}

describe("POST /api/checkout/wompi", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com");
    vi.stubEnv("WOMPI_INTEGRITY_SECRET", "secret");
    vi.stubEnv("WOMPI_PUBLIC_KEY", "pub_key");
    vi.mocked(checkRate).mockReturnValue(true);
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ─── Validation edge cases ───

  it("rejects empty items array", async () => {
    const res = await POST(makeRequest({ customerEmail: "a@b.com", items: [] }));
    expect(res.status).toBe(400);
  });

  it("rejects missing customerEmail", async () => {
    const res = await POST(makeRequest({ items: [validItem] }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid email format", async () => {
    const res = await POST(makeRequest({ customerEmail: "not-an-email", items: [validItem] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("correo");
  });

  it("rejects qty of 0", async () => {
    const res = await POST(
      makeRequest({ customerEmail: "a@b.com", items: [{ ...validItem, qty: 0 }] })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("entero positivo");
  });

  it("rejects negative qty", async () => {
    const res = await POST(
      makeRequest({ customerEmail: "a@b.com", items: [{ ...validItem, qty: -1 }] })
    );
    expect(res.status).toBe(400);
  });

  it("rejects fractional qty", async () => {
    const res = await POST(
      makeRequest({ customerEmail: "a@b.com", items: [{ ...validItem, qty: 1.5 }] })
    );
    expect(res.status).toBe(400);
  });

  // ─── Rate limiting ───

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRate).mockReturnValue(false);
    const res = await POST(makeRequest({ customerEmail: "a@b.com", items: [validItem] }));
    expect(res.status).toBe(429);
  });

  // ─── Stock validation ───

  it("rejects when variant not found in DB", async () => {
    mockVariantsQuery([]); // no variants returned
    const res = await POST(makeRequest({ customerEmail: "a@b.com", items: [validItem] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("no encontrada");
  });

  it("rejects when requested qty exceeds stock", async () => {
    mockVariantsQuery([{ id: "var-1", stock: 0, price_cop: 150000 }]);
    const res = await POST(
      makeRequest({ customerEmail: "a@b.com", items: [{ ...validItem, qty: 1 }] })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("disponible");
  });

  // ─── Price tampering ───

  it("rejects when client price does not match DB price", async () => {
    mockVariantsQuery([{ id: "var-1", stock: 10, price_cop: 150000 }]);
    const res = await POST(
      makeRequest({
        customerEmail: "a@b.com",
        items: [{ ...validItem, unitPrice: 1 }], // tampered price
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Precio incorrecto");
  });

  // ─── Happy path ───

  it("returns checkoutUrl on valid request", async () => {
    mockVariantsQuery([{ id: "var-1", stock: 10, price_cop: 150000 }]);
    const res = await POST(makeRequest({ customerEmail: "a@b.com", items: [validItem] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checkoutUrl).toBeDefined();
    expect(body.orderId).toBe("order-1");
    expect(body.reference).toMatch(/^cafeteros-/);
  });

  // ─── Missing server config ───

  it("returns 500 when NEXT_PUBLIC_APP_URL is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    mockVariantsQuery([{ id: "var-1", stock: 10, price_cop: 150000 }]);
    const res = await POST(makeRequest({ customerEmail: "a@b.com", items: [validItem] }));
    expect(res.status).toBe(500);
  });

  // ─── DB errors ───

  it("returns 500 when variant query fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "product_variants") {
        return {
          select: () => ({
            in: () => ({ data: null, error: { message: "DB down" } }),
          }),
        };
      }
      return {};
    });
    const res = await POST(makeRequest({ customerEmail: "a@b.com", items: [validItem] }));
    expect(res.status).toBe(500);
  });
});
