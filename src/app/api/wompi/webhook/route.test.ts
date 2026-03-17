import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";

// Mock Supabase
const mockFrom = vi.fn();
const mockRpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

// Mock rate limiter
vi.mock("@/lib/rate-limit", () => ({
  checkRate: vi.fn(() => true),
}));

import { POST } from "./route";
import { checkRate } from "@/lib/rate-limit";

const EVENTS_SECRET = "test_events_secret";

function makeSignature(tx: { id: string; status: string; amount_in_cents: number; currency: string }) {
  const base = `${tx.id}${tx.status}${tx.amount_in_cents}${tx.currency}${EVENTS_SECRET}`;
  return crypto.createHash("sha256").update(base).digest("hex");
}

function makeWebhookRequest(payload: Record<string, unknown>): Request {
  return new Request("http://localhost/api/wompi/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function validTx() {
  return { id: "tx-1", reference: "tricolor-123", status: "APPROVED", amount_in_cents: 15000000, currency: "COP" };
}

function validPayload() {
  const tx = validTx();
  return {
    event: "transaction.updated",
    data: { transaction: tx },
    signature: { checksum: makeSignature(tx), properties: [] },
  };
}

describe("POST /api/wompi/webhook", () => {
  beforeEach(() => {
    vi.stubEnv("WOMPI_EVENTS_SECRET", EVENTS_SECRET);
    vi.mocked(checkRate).mockReturnValue(true);
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ─── Ignored events ───

  it("returns ok for non-transaction.updated events", async () => {
    const res = await POST(makeWebhookRequest({ event: "noop", data: {} }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns ok for transaction.updated without transaction data", async () => {
    const res = await POST(makeWebhookRequest({ event: "transaction.updated", data: {} }));
    expect(res.status).toBe(200);
  });

  // ─── Signature verification ───

  it("rejects invalid signature", async () => {
    const payload = validPayload();
    payload.signature!.checksum = "invalid_checksum";
    const res = await POST(makeWebhookRequest(payload));
    expect(res.status).toBe(401);
  });

  it("rejects missing signature", async () => {
    const tx = validTx();
    const res = await POST(
      makeWebhookRequest({ event: "transaction.updated", data: { transaction: tx } })
    );
    expect(res.status).toBe(401);
  });

  // ─── Rate limiting ───

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRate).mockReturnValue(false);
    const res = await POST(makeWebhookRequest(validPayload()));
    expect(res.status).toBe(429);
  });

  // ─── APPROVED flow ───

  it("updates order and decrements stock on APPROVED", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") {
        return {
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => ({ data: { id: "order-1" }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "order_items") {
        return {
          select: () => ({
            eq: () => ({
              data: [
                { variant_id: "var-1", quantity: 2 },
                { variant_id: "var-2", quantity: 1 },
              ],
              error: null,
            }),
          }),
        };
      }
      return {};
    });
    mockRpc.mockResolvedValue({ data: null, error: null });

    const res = await POST(makeWebhookRequest(validPayload()));
    expect(res.status).toBe(200);

    // Should have called decrement_stock for each item
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(mockRpc).toHaveBeenCalledWith("decrement_stock", { p_variant_id: "var-1", p_qty: 2 });
    expect(mockRpc).toHaveBeenCalledWith("decrement_stock", { p_variant_id: "var-2", p_qty: 1 });
  });

  // ─── DECLINED flow ───

  it("updates order status to declined without decrementing stock", async () => {
    const tx = { ...validTx(), status: "DECLINED" };
    const payload = {
      event: "transaction.updated",
      data: { transaction: tx },
      signature: { checksum: makeSignature(tx), properties: [] },
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") {
        return {
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => ({ data: { id: "order-1" }, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await POST(makeWebhookRequest(payload));
    expect(res.status).toBe(200);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  // ─── Missing env secret ───

  it("rejects when events secret is missing", async () => {
    vi.stubEnv("WOMPI_EVENTS_SECRET", "");
    const res = await POST(makeWebhookRequest(validPayload()));
    expect(res.status).toBe(401);
  });
});
