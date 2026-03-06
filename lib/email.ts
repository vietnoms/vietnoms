import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

const FROM = "Vietnoms Catering <catering@vietnoms.com>";
const ADMIN_EMAIL = "catering@vietnoms.com";

interface CateringEmailData {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  eventDate: string;
  guestCount: number;
  packageType: string;
  deliveryType: string;
  deliveryAddress?: string | null;
  totalAmount?: number | null; // cents
  items: { itemName: string; quantity: number; unitPrice?: number | null }[];
  notes?: string | null;
  customizations?: {
    bases?: { name: string; quantity: number }[];
    sides?: { name: string; quantity: number }[];
    bigUpActive?: boolean;
    noPeanuts?: boolean;
    eggRollCut?: string;
  } | null;
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function buildDetailsBlock(data: CateringEmailData): string {
  const lines = [
    `Name: ${data.contactName}`,
    `Email: ${data.contactEmail}`,
    `Phone: ${data.contactPhone}`,
    `Event Date: ${data.eventDate}`,
    `Guests: ${data.guestCount}`,
    `Package: ${data.packageType}`,
    `Delivery: ${data.deliveryType}${data.deliveryAddress ? ` — ${data.deliveryAddress}` : ""}`,
  ];
  if (data.items.length > 0) {
    lines.push("", "Proteins:");
    for (const item of data.items) {
      const price = item.unitPrice != null ? ` (${formatMoney(item.unitPrice)} ea)` : "";
      lines.push(`  - ${item.itemName} x${item.quantity}${price}`);
    }
  }
  if (data.customizations?.bases?.length) {
    lines.push("", "Bases:");
    for (const b of data.customizations.bases) {
      lines.push(`  - ${b.name} x${b.quantity}`);
    }
  }
  if (data.customizations?.sides?.length) {
    lines.push("", "Sides:");
    for (const s of data.customizations.sides) {
      lines.push(`  - ${s.name} x${s.quantity}`);
    }
  }

  // Computed sauces from bases
  if (data.customizations?.bases?.length) {
    const riceQty = data.customizations.bases.find((b) => b.name === "Rice")?.quantity ?? 0;
    const vermicelliQty = data.customizations.bases.find((b) => b.name === "Vermicelli Noodles")?.quantity ?? 0;
    const saladQty = data.customizations.bases.find((b) => b.name === "Salad")?.quantity ?? 0;
    const houseSauce = riceQty + vermicelliQty;
    const vinaigrette = saladQty;
    const sauceParts: string[] = [];
    if (houseSauce > 0) sauceParts.push(`House Sauce x${houseSauce}`);
    if (vinaigrette > 0) sauceParts.push(`Vietnoms Vinaigrette x${vinaigrette}`);
    if (sauceParts.length > 0) {
      lines.push("", `Sauces: ${sauceParts.join(", ")}`);
    }
  }

  if (data.customizations?.bigUpActive) {
    lines.push("", "Big Up: Yes");
  }
  if (data.customizations?.noPeanuts) {
    lines.push("No Peanuts: Yes");
  }
  if (data.customizations?.eggRollCut && data.customizations.eggRollCut !== "Uncut") {
    lines.push(`Egg Roll Cut: ${data.customizations.eggRollCut}`);
  }

  if (data.totalAmount != null) {
    lines.push("", `Total: ${formatMoney(data.totalAmount)}`);
  }
  if (data.notes) {
    lines.push("", `Notes: ${data.notes}`);
  }
  return lines.join("\n");
}

export async function sendCateringOrderEmails(data: CateringEmailData) {
  const resend = getResend();
  const details = buildDetailsBlock(data);

  await Promise.all([
    // Admin notification
    resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `New Catering Order - ${data.contactName}`,
      text: `A new catering order has been placed and paid.\n\n${details}`,
    }),
    // Customer confirmation
    resend.emails.send({
      from: FROM,
      to: data.contactEmail,
      subject: "Your Vietnoms Catering Order Confirmation",
      text: [
        `Hi ${data.contactName},`,
        "",
        "Thank you for your catering order! Here are your details:",
        "",
        details,
        "",
        "We'll reach out closer to your event date to confirm logistics.",
        "",
        "Thanks,",
        "Vietnoms Catering",
      ].join("\n"),
    }),
  ]);
}

export async function sendCateringInquiryEmails(data: CateringEmailData) {
  const resend = getResend();
  const details = buildDetailsBlock(data);

  await Promise.all([
    resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `New Catering Inquiry - ${data.contactName}`,
      text: `A new catering inquiry has been submitted.\n\n${details}`,
    }),
    resend.emails.send({
      from: FROM,
      to: data.contactEmail,
      subject: "We Received Your Catering Inquiry",
      text: [
        `Hi ${data.contactName},`,
        "",
        "Thanks for reaching out about catering! We received your inquiry and will get back to you within 24 hours.",
        "",
        details,
        "",
        "Thanks,",
        "Vietnoms Catering",
      ].join("\n"),
    }),
  ]);
}
