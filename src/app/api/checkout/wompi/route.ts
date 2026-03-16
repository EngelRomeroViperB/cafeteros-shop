import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildWompiCheckoutUrl } from "@/lib/wompi";
import type { CartItem } from "@/types/store";

type CheckoutBody = {
  customerEmail: string;
  items: CartItem[];
};

function makeReference() {
  return `tricolor-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;

    if (!body.customerEmail || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const amountInCents = body.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0) * 100;
    if (amountInCents <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const reference = makeReference();
    const supabase = createAdminSupabaseClient();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_email: body.customerEmail,
        status: "pending",
        reference,
        total_cop: amountInCents / 100,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message ?? "Could not create order");
    }

    const orderItems = body.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId,
      quantity: item.qty,
      unit_price_cop: item.unitPrice,
      line_total_cop: item.unitPrice * item.qty,
      title: item.name,
      selected_size: item.size,
      selected_color: item.gender,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) {
      throw new Error(itemsError.message);
    }

    const redirectBase = process.env.NEXT_PUBLIC_APP_URL;
    if (!redirectBase) {
      throw new Error("Missing NEXT_PUBLIC_APP_URL");
    }

    const checkoutUrl = buildWompiCheckoutUrl({
      amountInCents,
      customerEmail: body.customerEmail,
      reference,
      redirectUrl: `${redirectBase}/checkout/result?reference=${reference}`,
    });

    return NextResponse.json({
      checkoutUrl,
      orderId: order.id,
      reference,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected checkout error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
