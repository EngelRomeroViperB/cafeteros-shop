import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkRate } from "@/lib/rate-limit";
import { sendOrderNotification } from "@/lib/telegram";

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
      .select("id, reference, total_cop, customer_email, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_department, shipping_notes")
      .single();

    if (orderError) {
      console.error("[WEBHOOK] Order update error:", orderError.message, "reference:", tx.reference);
    } else {
      console.log("[WEBHOOK] Order updated:", orderData?.id);
    }

    // Decrement stock and send Telegram notification when payment is approved
    if (tx.status === "APPROVED" && orderData?.id) {
      const { data: items } = await supabase
        .from("order_items")
        .select("variant_id, quantity, title, selected_size, selected_gender, unit_price_cop")
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

      // Send Telegram notification to admin
      await sendOrderNotification({
        reference: orderData.reference,
        totalCop: orderData.total_cop,
        customerEmail: orderData.customer_email,
        shippingName: orderData.shipping_name ?? "",
        shippingPhone: orderData.shipping_phone ?? "",
        shippingAddress: orderData.shipping_address ?? "",
        shippingCity: orderData.shipping_city ?? "",
        shippingDepartment: orderData.shipping_department ?? "",
        shippingNotes: orderData.shipping_notes ?? "",
        items: (items ?? []).map((i) => ({
          title: i.title,
          size: i.selected_size ?? "",
          gender: i.selected_gender ?? "",
          quantity: i.quantity,
          unitPrice: i.unit_price_cop,
        })),
      }).catch((err) => console.error("[WEBHOOK] Telegram error:", err));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[WEBHOOK ERROR]", error);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
