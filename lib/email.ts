import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

const FROM_CATERING = "Vietnoms Catering <catering@vietnoms.com>";
const FROM_ORDERS = "Vietnoms <orders@vietnoms.com>";
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
    utensils?: { napkins: boolean; forks: boolean; chopsticks: boolean };
  } | null;
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatGan(gan: string): string {
  return gan.replace(/(.{4})(?=.)/g, "$1 ");
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

  if (data.customizations?.utensils) {
    const selected = Object.entries(data.customizations.utensils)
      .filter(([, v]) => v)
      .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));
    if (selected.length > 0) {
      lines.push(`Utensils: ${selected.join(", ")}`);
    }
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
      from: FROM_CATERING,
      to: ADMIN_EMAIL,
      subject: `New Catering Order - ${data.contactName}`,
      text: `A new catering order has been placed and paid.\n\n${details}`,
    }),
    // Customer confirmation
    resend.emails.send({
      from: FROM_CATERING,
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
      from: FROM_CATERING,
      to: ADMIN_EMAIL,
      subject: `New Catering Inquiry - ${data.contactName}`,
      text: `A new catering inquiry has been submitted.\n\n${details}`,
    }),
    resend.emails.send({
      from: FROM_CATERING,
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

// ---------- Order Receipt Link ----------

export async function sendOrderReceiptLink(data: {
  customerEmail: string;
  customerName: string;
  receiptUrl: string;
  orderTotal: string;
}) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM_ORDERS,
    to: data.customerEmail,
    subject: "Your Vietnoms Receipt",
    text: [
      `Hi ${data.customerName},`,
      "",
      `Thanks for your order! Your total was ${data.orderTotal}.`,
      "",
      `View your receipt: ${data.receiptUrl}`,
      "",
      "Thanks,",
      "Vietnoms",
    ].join("\n"),
  });
}

// ---------- Gift Card Emails ----------

interface GiftCardEmailData {
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  recipientName: string;
  recipientEmail: string;
  amount: number; // cents
  gan: string; // 16-digit gift card number
  message?: string;
  sendToSelf?: boolean;
}

export async function sendGiftCardEmails(data: GiftCardEmailData) {
  const resend = getResend();
  const amountStr = formatMoney(data.amount);
  const ganFormatted = formatGan(data.gan);
  const isSelf = data.sendToSelf || data.senderEmail === data.recipientEmail;

  const emails: Parameters<typeof resend.emails.send>[0][] = [
    // Admin notification (always)
    {
      from: FROM_ORDERS,
      to: ADMIN_EMAIL,
      subject: `Gift Card Purchase - ${data.senderName} (${amountStr})`,
      text: [
        `New gift card purchase:`,
        "",
        `Sender: ${data.senderName}`,
        `Email: ${data.senderEmail}`,
        `Phone: ${data.senderPhone}`,
        `Amount: ${amountStr}`,
        `Gift Card #: ${ganFormatted}`,
        ...(isSelf
          ? [`Type: Self-purchase`]
          : [`Recipient: ${data.recipientName} (${data.recipientEmail})`]),
        ...(data.message ? [`Message: "${data.message}"`] : []),
      ].join("\n"),
    },
  ];

  if (isSelf) {
    // Self-purchase: single email to buyer
    emails.push({
      from: FROM_ORDERS,
      to: data.senderEmail,
      subject: "Your Vietnoms Gift Card",
      text: [
        `Hi ${data.senderName},`,
        "",
        `Your ${amountStr} Vietnoms gift card is ready!`,
        "",
        `Gift Card Number: ${ganFormatted}`,
        `Amount: ${amountStr}`,
        "",
        "Use this card online at vietnoms.com or in-store at Vietnoms.",
        "",
        "Check your balance anytime at: https://vietnoms.com/gift-cards#balance",
        "",
        "Enjoy!",
        "Vietnoms",
      ].join("\n"),
    });
  } else {
    // Gift to someone else: sender confirmation + recipient notification
    emails.push(
      {
        from: FROM_ORDERS,
        to: data.senderEmail,
        subject: "Your Vietnoms Gift Card Purchase",
        text: [
          `Hi ${data.senderName},`,
          "",
          `Your ${amountStr} Vietnoms gift card has been purchased successfully!`,
          "",
          `Gift Card Number: ${ganFormatted}`,
          `Amount: ${amountStr}`,
          `Recipient: ${data.recipientName} (${data.recipientEmail})`,
          "",
          "The recipient has also been emailed their gift card details.",
          "",
          "Check your balance anytime at: https://vietnoms.com/gift-cards#balance",
          "",
          "Thanks for sharing the love of Vietnamese food!",
          "Vietnoms",
        ].join("\n"),
      },
      {
        from: FROM_ORDERS,
        to: data.recipientEmail,
        subject: "You've Received a Vietnoms Gift Card!",
        text: [
          `Hi ${data.recipientName},`,
          "",
          `${data.senderName} sent you a ${amountStr} Vietnoms gift card!`,
          ...(data.message ? ["", `"${data.message}"`, ""] : [""]),
          `Gift Card Number: ${ganFormatted}`,
          `Amount: ${amountStr}`,
          "",
          "Use this card online at vietnoms.com or in-store at Vietnoms.",
          "",
          "Check your balance anytime at: https://vietnoms.com/gift-cards#balance",
          "",
          "Enjoy!",
          "Vietnoms",
        ].join("\n"),
      }
    );
  }

  await Promise.all(emails.map((e) => resend.emails.send(e)));
}

// ---------- Contribution Invite Emails ----------

interface ContributionInviteEmailData {
  organizerName: string;
  recipientName: string;
  message?: string;
  suggestedAmount?: number; // cents
  contributeUrl: string;
  inviteeEmail: string;
}

export async function sendContributionInviteEmail(data: ContributionInviteEmailData) {
  const resend = getResend();
  const suggestedStr = data.suggestedAmount ? formatMoney(data.suggestedAmount) : null;

  await resend.emails.send({
    from: FROM_ORDERS,
    to: data.inviteeEmail,
    subject: `${data.organizerName} invited you to contribute to a gift card for ${data.recipientName}`,
    text: [
      `Hi there!`,
      "",
      `${data.organizerName} is putting together a group gift card for ${data.recipientName} at Vietnoms and would love your contribution.`,
      ...(data.message ? ["", `"${data.message}"`, ""] : [""]),
      ...(suggestedStr ? [`Suggested contribution: ${suggestedStr}`, ""] : []),
      `Contribute here: ${data.contributeUrl}`,
      "",
      "Thanks!",
      "Vietnoms",
    ].join("\n"),
  });
}

interface ContributionConfirmationEmailData {
  contributorName: string;
  contributorEmail: string;
  amount: number; // cents
  recipientName: string;
  organizerName: string;
  organizerEmail: string;
}

export async function sendContributionConfirmationEmails(data: ContributionConfirmationEmailData) {
  const resend = getResend();
  const amountStr = formatMoney(data.amount);

  await Promise.all([
    // Contributor receipt
    resend.emails.send({
      from: FROM_ORDERS,
      to: data.contributorEmail,
      subject: `Your ${amountStr} contribution to ${data.recipientName}'s gift card`,
      text: [
        `Hi ${data.contributorName},`,
        "",
        `Thank you for contributing ${amountStr} to ${data.recipientName}'s Vietnoms gift card!`,
        "",
        `Organized by: ${data.organizerName}`,
        "",
        "Your contribution has been added to the gift card balance.",
        "",
        "Thanks for sharing the love of Vietnamese food!",
        "Vietnoms",
      ].join("\n"),
    }),
    // Organizer notification
    resend.emails.send({
      from: FROM_ORDERS,
      to: data.organizerEmail,
      subject: `${data.contributorName} contributed ${amountStr} to ${data.recipientName}'s gift card`,
      text: [
        `Hi ${data.organizerName},`,
        "",
        `${data.contributorName} just contributed ${amountStr} to ${data.recipientName}'s Vietnoms gift card!`,
        "",
        "Thanks,",
        "Vietnoms",
      ].join("\n"),
    }),
    // Admin notification
    resend.emails.send({
      from: FROM_ORDERS,
      to: ADMIN_EMAIL,
      subject: `Gift Card Contribution - ${data.contributorName} (${amountStr})`,
      text: [
        `New gift card contribution:`,
        "",
        `Contributor: ${data.contributorName} (${data.contributorEmail})`,
        `Amount: ${amountStr}`,
        `For: ${data.recipientName}`,
        `Organized by: ${data.organizerName} (${data.organizerEmail})`,
      ].join("\n"),
    }),
  ]);
}
