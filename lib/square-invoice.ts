import { getSquare, LOCATION_ID } from "./square";
import { randomUUID } from "crypto";
import { findOrCreateCustomerByEmail } from "./square-customers";
import { buildCateringLineItems, type CateringOrderData } from "./catering-order";
import { formatTime12 } from "./restaurant-hours";

export type InvoiceData = CateringOrderData & { totalAmount?: number | null };

function formatInvoiceTitle(data: InvoiceData): string {
  const date = new Date(data.eventDate + "T12:00:00");
  const dayName = date.toLocaleDateString("en-US", { weekday: "long", timeZone: "America/Los_Angeles" });
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = String(date.getFullYear()).slice(2);
  const dateStr = `${month}/${day}/${year}`;
  const time = data.eventTime ? ` ${formatTime12(data.eventTime)}` : "";

  const location = data.deliveryType === "delivery" && data.deliveryAddress
    ? data.deliveryAddress
    : "Pickup at Vietnoms";

  return `${dayName}, ${dateStr}${time} Catering - ${location}`;
}

/**
 * Creates an itemized Square order + draft invoice for an email inquiry (unpaid request).
 * Paid online checkouts do NOT use this — they already have a paid Square order.
 */
export async function createDraftInvoice(
  data: InvoiceData
): Promise<{ invoiceId: string; orderId: string; customerId: string }> {
  const square = getSquare();

  // 1. Find or create customer
  const customerId = await findOrCreateCustomerByEmail({
    name: data.contactName,
    email: data.contactEmail,
    phone: data.contactPhone,
  });

  // 2. Itemized line items with line-item tax (delivery fee excluded from tax)
  const { lineItems, taxes } = buildCateringLineItems(data);

  // 3. Create Square order
  const orderResult = await square.orders.create({
    order: {
      locationId: LOCATION_ID,
      customerId,
      lineItems,
      taxes,
      metadata: {
        source: "catering_inquiry",
        guestCount: String(data.guestCount),
        eventDate: data.eventDate,
        ...(data.eventTime ? { eventTime: data.eventTime } : {}),
      },
    },
    idempotencyKey: randomUUID(),
  });

  const orderId = orderResult.order!.id!;

  // 4. Create draft invoice
  const title = formatInvoiceTitle(data);

  // Due date: 1 week before event, or upon receipt if under 1 week away
  const eventMs = new Date(data.eventDate + "T00:00:00").getTime();
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const oneWeekBefore = new Date(eventMs - oneWeekMs);
  const now = new Date();
  const isUnderOneWeek = oneWeekBefore <= now;
  const dueDate = isUnderOneWeek
    ? new Date().toISOString().split("T")[0] // today (upon receipt)
    : oneWeekBefore.toISOString().split("T")[0];

  const invoiceResult = await square.invoices.create({
    invoice: {
      orderId,
      locationId: LOCATION_ID,
      primaryRecipient: { customerId },
      paymentRequests: [{
        requestType: "BALANCE",
        dueDate,
        tippingEnabled: true,
      }],
      deliveryMethod: "EMAIL",
      title,
      description: "Thanks for picking Vietnoms to cater for you. We hope we can cater again for you soon!",
      acceptedPaymentMethods: {
        card: true,
        bankAccount: true,
        squareGiftCard: true,
        buyNowPayLater: false,
        cashAppPay: true,
      },
      storePaymentMethodEnabled: true,
      scheduledAt: undefined,
      saleOrServiceDate: data.eventDate,
    },
    idempotencyKey: randomUUID(),
  });

  const invoiceId = invoiceResult.invoice!.id!;
  console.log(`Draft invoice created: invoiceId=${invoiceId}, orderId=${orderId}, customerId=${customerId}`);

  return { invoiceId, orderId, customerId };
}
