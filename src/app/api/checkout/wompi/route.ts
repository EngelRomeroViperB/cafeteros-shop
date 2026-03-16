import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildWompiCheckoutUrl } from "@/lib/wompi";
import { checkRate } from "@/lib/rate-limit";
import type { CartItem } from "@/types/store";

type CheckoutBody = {
  customerEmail: string;
  userId?: string | null;
  items: CartItem[];
};

function makeReference() {
  return `tricolor-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRate(`checkout:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." }, { status: 429 });
  }

  try {
    const body = (await request.json()) as CheckoutBody;

    if (!body.customerEmail || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const amountInCents = body.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0) * 100;
    if (amountInCents <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();

    // --- Server-side stock validation ---
    const variantIds = body.items.map((item) => item.variantId);
    const { data: variants, error: variantsErr } = await supabase
      .from("product_variants")
      .select("id, stock")
      .in("id", variantIds);

    if (variantsErr) {
      throw new Error("No se pudo verificar el stock");
    }

    const stockMap = new Map((variants ?? []).map((v) => [v.id, v.stock as number]));
    const outOfStock: string[] = [];

    for (const item of body.items) {
      const available = stockMap.get(item.variantId) ?? 0;
      if (item.qty > available) {
        outOfStock.push(`${item.name} (${item.size}/${item.gender}): pediste ${item.qty}, disponible ${available}`);
      }
    }

    if (outOfStock.length > 0) {
      return NextResponse.json(
        { error: `Stock insuficiente: ${outOfStock.join("; ")}` },
        { status: 400 },
      );
    }

    const reference = makeReference();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_email: body.customerEmail,
        user_id: body.userId ?? null,
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
      selected_gender: item.gender,
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
