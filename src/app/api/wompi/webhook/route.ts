import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkRate } from "@/lib/rate-limit";

type WompiWebhookEvent = {
  event: string;
  data: {
    transaction?: {
      id: string;
      reference: string;
      status: string;
      amount_in_cents: number;
      currency: string;
    };
  };
  signature?: {
    checksum: string;
    properties: string[];
  };
  timestamp: number;
};

function verifyWompiEvent(payload: WompiWebhookEvent): boolean {
  const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
  if (!eventsSecret || !payload.signature?.checksum || !payload.data.transaction) {
    console.log("[WEBHOOK] Verification failed: missing secret, checksum, or transaction", {
      hasSecret: !!eventsSecret,
      hasChecksum: !!payload.signature?.checksum,
      hasTx: !!payload.data.transaction,
    });
    return false;
  }

  const tx = payload.data.transaction;

  // Build hash per Wompi docs:
  // 1. Concatenate values from signature.properties (pointing to fields in data.transaction)
  // 2. Concatenate the timestamp field (UNIX timestamp integer)
  // 3. Concatenate the events secret
  const properties = payload.signature.properties ?? [];
  let concatenated = "";

  for (const prop of properties) {
    const key = prop.replace("transaction.", "");
    const value = (tx as Record<string, unknown>)[key];
    concatenated += String(value ?? "");
  }

  const base = `${concatenated}${payload.timestamp}${eventsSecret}`;
  const hash = crypto.createHash("sha256").update(base).digest("hex");

  console.log("[WEBHOOK] Signature verification:", {
    properties,
    concatenated,
    timestamp: payload.timestamp,
    computed: hash,
    received: payload.signature.checksum,
    match: hash === payload.signature.checksum,
  });

  return hash === payload.signature.checksum;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRate(`webhook:${ip}`, 30, 60_000)) {
    console.log("[WEBHOOK] Rate limited:", ip);
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const payload = (await request.json()) as WompiWebhookEvent;
    console.log("[WEBHOOK] Received event:", JSON.stringify(payload, null, 2));

    if (payload.event !== "transaction.updated" || !payload.data.transaction) {
      console.log("[WEBHOOK] Ignoring event:", payload.event);
      return NextResponse.json({ ok: true });
    }

    if (!verifyWompiEvent(payload)) {
      console.error("[WEBHOOK] Invalid signature for reference:", payload.data.transaction?.reference);
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const tx = payload.data.transaction;
    const supabase = createAdminSupabaseClient();

    const statusMap: Record<string, string> = {
      APPROVED: "paid",
      DECLINED: "declined",
      VOIDED: "canceled",
      ERROR: "error",
      PENDING: "pending",
    };

    console.log("[WEBHOOK] Updating order:", { reference: tx.reference, wompiStatus: tx.status, mappedStatus: statusMap[tx.status] });

    // Update order status
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .update({
        wompi_status: tx.status,
        status: statusMap[tx.status] ?? "pending",
      })
      .eq("reference", tx.reference)
      .select("id")
      .single();

    if (orderError) {
      console.error("[WEBHOOK] Order update error:", orderError.message, "reference:", tx.reference);
    } else {
      console.log("[WEBHOOK] Order updated:", orderData?.id);
    }

    // Decrement stock when payment is approved
    if (tx.status === "APPROVED" && orderData?.id) {
      const { data: items } = await supabase
        .from("order_items")
        .select("variant_id, quantity")
        .eq("order_id", orderData.id);

      console.log("[WEBHOOK] Decrementing stock for", items?.length ?? 0, "items");

      if (items && items.length > 0) {
        for (const item of items) {
          if (!item.variant_id) continue;
          await supabase.rpc("decrement_stock", {
            p_variant_id: item.variant_id,
            p_qty: item.quantity,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[WEBHOOK ERROR]", error);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
