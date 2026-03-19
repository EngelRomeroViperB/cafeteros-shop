const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

type OrderNotification = {
  reference: string;
  totalCop: number;
  customerEmail: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingDepartment: string;
  shippingNotes: string;
  items: { title: string; size: string; gender: string; quantity: number; unitPrice: number }[];
};

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(value);
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$1");
}

export async function sendOrderNotification(order: OrderNotification): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("[TELEGRAM] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return false;
  }

  const itemLines = order.items
    .map((i) => `  • ${i.title} (${i.size}, ${i.gender}) x${i.quantity} — ${formatCOP(i.unitPrice * i.quantity)}`)
    .join("\n");

  const message = [
    `🛒 *NUEVO PEDIDO CONFIRMADO*`,
    ``,
    `📋 *Referencia:* ${order.reference}`,
    `💰 *Total:* ${formatCOP(order.totalCop)}`,
    `📧 *Email:* ${order.customerEmail}`,
    ``,
    `📦 *Datos de envío:*`,
    `  👤 ${order.shippingName}`,
    `  📱 ${order.shippingPhone}`,
    `  🏠 ${order.shippingAddress}`,
    `  🌆 ${order.shippingCity}, ${order.shippingDepartment}`,
    order.shippingNotes ? `  📝 ${order.shippingNotes}` : "",
    ``,
    `🧾 *Items:*`,
    itemLines,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[TELEGRAM] Failed to send message:", res.status, body);
      return false;
    }

    console.log("[TELEGRAM] Order notification sent for", order.reference);
    return true;
  } catch (error) {
    console.error("[TELEGRAM] Error sending notification:", error);
    return false;
  }
}
