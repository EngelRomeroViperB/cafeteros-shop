import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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
};

function verifyWompiEvent(payload: WompiWebhookEvent): boolean {
  const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
  if (!eventsSecret || !payload.signature?.checksum || !payload.data.transaction) {
    return false;
  }

  const tx = payload.data.transaction;
  const base = `${tx.id}${tx.status}${tx.amount_in_cents}${tx.currency}${eventsSecret}`;
  const hash = crypto.createHash("sha256").update(base).digest("hex");
  return hash === payload.signature.checksum;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as WompiWebhookEvent;

    if (payload.event !== "transaction.updated" || !payload.data.transaction) {
      return NextResponse.json({ ok: true });
    }

    if (!verifyWompiEvent(payload)) {
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

    await supabase
      .from("orders")
      .update({
        wompi_status: tx.status,
        status: statusMap[tx.status] ?? "pending",
      })
      .eq("reference", tx.reference);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
