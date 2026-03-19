import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildWompiCheckoutUrl } from "@/lib/wompi";
import { checkRate } from "@/lib/rate-limit";
import type { CartItem } from "@/types/store";

type ShippingData = {
  name: string;
  phone: string;
  address: string;
  city: string;
  department: string;
  notes?: string;
};

type CheckoutBody = {
  customerEmail: string;
  userId?: string | null;
  items: CartItem[];
  shipping: ShippingData;
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
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    if (!body.shipping?.name || !body.shipping?.phone || !body.shipping?.address || !body.shipping?.city || !body.shipping?.department) {
      return NextResponse.json({ error: "Datos de envío incompletos" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.customerEmail)) {
      return NextResponse.json({ error: "Formato de correo inv\u00e1lido" }, { status: 400 });
    }

    // Validate qty is a positive integer for every item
    for (const item of body.items) {
      if (!Number.isInteger(item.qty) || item.qty <= 0) {
        return NextResponse.json({ error: "Cantidad debe ser un entero positivo" }, { status: 400 });
      }
    }

    const supabase = createAdminSupabaseClient();

    // --- Server-side stock + price validation ---
    const variantIds = body.items.map((item) => item.variantId);
    const { data: variants, error: variantsErr } = await supabase
      .from("product_variants")
      .select("id, stock, price_cop")
      .in("id", variantIds);

    if (variantsErr) {
      return NextResponse.json({ error: "No se pudo verificar el inventario" }, { status: 500 });
    }

    const variantMap = new Map(
      (variants ?? []).map((v) => [v.id, { stock: v.stock as number, price: v.price_cop as number }]),
    );
    const errors: string[] = [];

    for (const item of body.items) {
      const variant = variantMap.get(item.variantId);
      if (!variant) {
        errors.push(`Variante no encontrada: ${item.name}`);
        continue;
      }
      if (item.qty > variant.stock) {
        errors.push(`${item.name} (${item.size}/${item.gender}): pediste ${item.qty}, disponible ${variant.stock}`);
      }
      if (item.unitPrice !== variant.price) {
        errors.push(`Precio incorrecto para ${item.name}: recibido ${item.unitPrice}, real ${variant.price}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors.join("; ") },
        { status: 400 },
      );
    }

    // Recalculate amount from DB prices (never trust client)
    const amountInCents = body.items.reduce((sum, item) => {
      const dbPrice = variantMap.get(item.variantId)!.price;
      return sum + dbPrice * item.qty;
    }, 0) * 100;

    const reference = makeReference();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_email: body.customerEmail,
        user_id: body.userId ?? null,
        status: "pending",
        reference,
        total_cop: amountInCents / 100,
        shipping_name: body.shipping.name,
        shipping_phone: body.shipping.phone,
        shipping_address: body.shipping.address,
        shipping_city: body.shipping.city,
        shipping_department: body.shipping.department,
        shipping_notes: body.shipping.notes ?? "",
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
      unit_price_cop: variantMap.get(item.variantId)!.price,
      line_total_cop: variantMap.get(item.variantId)!.price * item.qty,
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
      return NextResponse.json({ error: "Configuraci\u00f3n del servidor incompleta" }, { status: 500 });
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
    console.error("[CHECKOUT ERROR]", error);
    return NextResponse.json({ error: "Error inesperado al procesar el checkout" }, { status: 500 });
  }
}
