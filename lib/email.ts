import { Resend } from "resend";
import { RESTAURANT } from "./constants";
import { formatEventDateTime } from "./restaurant-hours";
import { computeSauces, packageLabel, type CateringCustomizations } from "./catering-order";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

const FROM_CATERING = "Vietnoms Catering <catering@updates.vietnoms.com>";
const FROM_ORDERS = "Vietnoms <orders@updates.vietnoms.com>";
const ADMIN_EMAIL = "catering@vietnoms.com";

interface CateringEmailData {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  eventDate: string;
  eventTime?: string | null; // HH:MM, restaurant local time
  guestCount: number;
  packageType: string;
  deliveryType: string;
  deliveryAddress?: string | null;
  /** Inquiries: pre-tax estimate in cents. Ignored when `totals` is present. */
  totalAmount?: number | null;
  /** Paid orders: the exact amounts charged, in cents. */
  totals?: { subtotal: number; deliveryFee: number; tax: number; total: number } | null;
  /** Square receipt link for paid orders. */
  receiptUrl?: string | null;
  items: { itemName: string; quantity: number; unitPrice?: number | null }[];
  notes?: string | null;
  customizations?: CateringCustomizations | null;
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatGan(gan: string): string {
  return gan.replace(/(.{4})(?=.)/g, "$1 ");
}

function buildDetailsBlock(data: CateringEmailData): string {
  const c = data.customizations;
  const isDelivery = data.deliveryType === "delivery";
  const when = formatEventDateTime(data.eventDate, data.eventTime);

  const lines = [
    `Name: ${data.contactName}`,
    `Email: ${data.contactEmail}`,
    `Phone: ${data.contactPhone}`,
    "",
    `${isDelivery ? "Delivery" : "Pickup"}: ${when}`,
    isDelivery
      ? `Deliver to: ${data.deliveryAddress || "(address not provided)"}`
      : `Pickup at: ${RESTAURANT.address.full}`,
    `Guests: ${data.guestCount}`,
    `Style: ${packageLabel(data.packageType)}`,
  ];
  if (c?.eventType) lines.push(`Event: ${c.eventType}`);

  if (data.items.length > 0) {
    lines.push("", "Proteins:");
    for (const item of data.items) {
      lines.push(`  - ${item.itemName} x${item.quantity}`);
    }
  }
  if (data.packageType === "premade" && c?.bowls?.length) {
    lines.push("", "Bowls:");
    for (const b of c.bowls) {
      if (b.quantity > 0) lines.push(`  - ${b.base} + ${b.protein} x${b.quantity}`);
    }
  } else if (c?.bases?.length) {
    lines.push("", data.packageType === "premade" ? "Bowls:" : "Bases:");
    for (const b of c.bases) {
      lines.push(`  - ${b.name} x${b.quantity}`);
    }
  }
  if (c?.sides?.length) {
    lines.push("", "Sides:");
    for (const s of c.sides) {
      lines.push(`  - ${s.name} x${s.quantity}`);
    }
  }
  const sauces = computeSauces(c?.bases);
  if (sauces.length > 0) {
    lines.push("", `Sauces: ${sauces.map((s) => `${s.name} x${s.quantity}`).join(", ")}`);
  }

  const options: string[] = [];
  if (c?.bigUpActive) options.push("Big Up: +50% protein");
  if (c?.noPeanuts) options.push("No Peanuts");
  if (c?.eggRollCut && c.eggRollCut !== "Uncut") options.push(`Egg Roll Cut: ${c.eggRollCut}`);
  if (c?.utensils) {
    const selected = Object.entries(c.utensils)
      .filter(([, v]) => v)
      .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));
    if (selected.length > 0) options.push(`Utensils: ${selected.join(", ")}`);
  }
  if (options.length > 0) lines.push("", ...options);

  if (data.totals) {
    lines.push("", `Subtotal: ${formatMoney(data.totals.subtotal)}`);
    if (data.totals.deliveryFee > 0) lines.push(`Delivery fee: ${formatMoney(data.totals.deliveryFee)}`);
    lines.push(`Sales tax: ${formatMoney(data.totals.tax)}`);
    lines.push(`Total paid: ${formatMoney(data.totals.total)}`);
  } else if (data.totalAmount != null) {
    lines.push("", `Estimated total (before tax): ${formatMoney(data.totalAmount)}`);
  }
  if (data.notes) {
    lines.push("", `Notes: ${data.notes}`);
  }
  if (data.receiptUrl) {
    lines.push("", `Receipt: ${data.receiptUrl}`);
  }
  return lines.join("\n");
}

export async function sendCateringOrderEmails(data: CateringEmailData) {
  const resend = getResend();
  const details = buildDetailsBlock(data);
  const whenShort = formatEventDateTime(data.eventDate, data.eventTime, "short");
  const paid = data.totals ? ` Your payment of ${formatMoney(data.totals.total)} has been received.` : "";

  await Promise.all([
    // Admin notification
    resend.emails.send({
      from: FROM_CATERING,
      to: ADMIN_EMAIL,
      subject: `New Catering Order - ${data.contactName} - ${whenShort}`,
      text: `A new catering order has been placed and paid.\n\n${details}`,
    }),
    // Customer confirmation / receipt
    resend.emails.send({
      from: FROM_CATERING,
      to: data.contactEmail,
      replyTo: ADMIN_EMAIL,
      subject: "Your Vietnoms Catering Order Confirmation",
      text: [
        `Hi ${data.contactName},`,
        "",
        `Thank you for your catering order! Your order is confirmed.${paid}`,
        "",
        details,
        "",
        ...(data.receiptUrl ? [`View your receipt: ${data.receiptUrl}`, ""] : []),
        `We'll reach out closer to your event date to confirm logistics. Questions? Call us at ${RESTAURANT.phone} or reply to this email.`,
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
  const whenShort = formatEventDateTime(data.eventDate, data.eventTime, "short");

  await Promise.all([
    resend.emails.send({
      from: FROM_CATERING,
      to: ADMIN_EMAIL,
      subject: `New Catering Inquiry - ${data.contactName} - ${whenShort}`,
      text: `A new catering inquiry has been submitted.\n\n${details}`,
    }),
    resend.emails.send({
      from: FROM_CATERING,
      to: data.contactEmail,
      replyTo: ADMIN_EMAIL,
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

// ---------- Marketing & Feedback Emails ----------

export async function sendWelcomeEmail(data: {
  email: string;
  name?: string | null;
  unsubscribeUrl: string; // human-facing page link for the email body
  oneClickUnsubscribeUrl: string; // POST endpoint for RFC 8058 one-click
  offerCopy?: string;
}) {
  const resend = getResend();
  const greeting = data.name ? `Hi ${data.name},` : "Hi there,";
  const offerLines =
    data.offerCopy && !data.offerCopy.startsWith("[FILL IN")
      ? ["", data.offerCopy]
      : [];

  await resend.emails.send({
    from: FROM_ORDERS,
    to: data.email,
    subject: "Welcome to the Noms List",
    headers: {
      "List-Unsubscribe": `<${data.oneClickUnsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    text: [
      greeting,
      "",
      "Welcome to the Noms List! You'll be first to hear about new dishes, specials, and events at Vietnoms.",
      ...offerLines,
      "",
      "Order anytime at https://vietnoms.com/order",
      "",
      "Thanks,",
      "Vietnoms",
      "387 S 1st St, Ste 121, San Jose, CA 95113",
      "",
      `Unsubscribe: ${data.unsubscribeUrl}`,
    ].join("\n"),
  });
}

export async function sendReviewRequestEmail(data: {
  email: string;
  name?: string | null;
  feedbackUrl: string;
}) {
  const resend = getResend();
  const greeting = data.name ? `Hi ${data.name},` : "Hi there,";

  await resend.emails.send({
    from: FROM_ORDERS,
    to: data.email,
    subject: "How was your Vietnoms order?",
    text: [
      greeting,
      "",
      "Thanks for ordering from Vietnoms! How did we do?",
      "",
      `Tell us in 30 seconds: ${data.feedbackUrl}`,
      "",
      "Your feedback goes straight to the owners and helps us get better.",
      "",
      "Thanks,",
      "Vietnoms",
    ].join("\n"),
  });
}

export async function sendPrivateFeedbackAlert(data: {
  rating: number;
  feedbackText?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
}) {
  const resend = getResend();

  await resend.emails.send({
    from: FROM_ORDERS,
    to: ADMIN_EMAIL,
    subject: `Private feedback received (${data.rating}/5)`,
    text: [
      `A customer left private feedback after their order.`,
      "",
      `Rating: ${data.rating}/5`,
      ...(data.feedbackText ? ["", `Feedback: ${data.feedbackText}`] : []),
      "",
      `Name: ${data.customerName || "Not provided"}`,
      `Email: ${data.customerEmail || "Not provided"}`,
      `Phone: ${data.customerPhone || "Not provided"}`,
      "",
      "This feedback is private and was not posted publicly. Consider reaching out directly.",
      "",
      "Review all feedback: https://vietnoms.com/admin/reviews",
    ].join("\n"),
  });
}

export async function sendCareersApplicationEmail(data: {
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  message?: string | null;
}) {
  const resend = getResend();

  await resend.emails.send({
    from: FROM_ORDERS,
    to: ADMIN_EMAIL,
    subject: `Job Application - ${data.role} - ${data.name}`,
    text: [
      `New job application from the website:`,
      "",
      `Role: ${data.role}`,
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      `Phone: ${data.phone || "Not provided"}`,
      ...(data.message ? ["", `Message: ${data.message}`] : []),
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
