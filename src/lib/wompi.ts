import crypto from "node:crypto";

type BuildWompiCheckoutInput = {
  amountInCents: number;
  customerEmail: string;
  reference: string;
  redirectUrl: string;
};

const WOMPI_CHECKOUT_URL = process.env.WOMPI_CHECKOUT_URL ?? "https://checkout.wompi.co/p/";

export function buildWompiSignature(reference: string, amountInCents: number, currency: string) {
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!integritySecret) {
    throw new Error("Payment integrity configuration is missing");
  }

  const raw = `${reference}${amountInCents}${currency}${integritySecret}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function buildWompiCheckoutUrl(input: BuildWompiCheckoutInput) {
  const publicKey = process.env.WOMPI_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("Payment gateway configuration is missing");
  }

  const signature = buildWompiSignature(input.reference, input.amountInCents, "COP");

  const params = new URLSearchParams({
    "public-key": publicKey,
    currency: "COP",
    "amount-in-cents": String(input.amountInCents),
    reference: input.reference,
    "redirect-url": input.redirectUrl,
    "customer-data:email": input.customerEmail,
    "signature:integrity": signature,
  });
  return `${WOMPI_CHECKOUT_URL}?${params.toString()}`;
}
