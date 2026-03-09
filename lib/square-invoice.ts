import { getSquare, LOCATION_ID } from "./square";
import { randomUUID } from "crypto";

interface InvoiceData {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  eventDate: string;
  guestCount: number;
  packageType: string;
  totalAmount: number; // cents
  items: { itemName: string; quantity: number; unitPrice?: number | null }[];
  deliveryFee: number;
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

function buildOrderNote(data: InvoiceData): string {
  const parts: string[] = [
    `${data.packageType} style - ${data.guestCount} guests`,
    `Event Date: ${data.eventDate}`,
  ];

  if (data.customizations?.bases?.length) {
    const baseStr = data.customizations.bases
      .map((b) => `${b.name} x${b.quantity}`)
      .join(", ");
    parts.push(`Bases: ${baseStr}`);
  }

  if (data.customizations?.sides?.length) {
    const sideStr = data.customizations.sides
      .map((s) => `${s.name} x${s.quantity}`)
      .join(", ");
    parts.push(`Sides: ${sideStr}`);
  }

  if (data.customizations?.bigUpActive) parts.push("Big Up: Yes");
  if (data.customizations?.noPeanuts) parts.push("No Peanuts: Yes");
  if (
    data.customizations?.eggRollCut &&
    data.customizations.eggRollCut !== "Uncut"
  ) {
    parts.push(`Egg Roll Cut: ${data.customizations.eggRollCut}`);
  }

  if (data.customizations?.utensils) {
    const selected = Object.entries(data.customizations.utensils)
      .filter(([, v]) => v)
      .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));
    if (selected.length > 0) {
      parts.push(`Utensils: ${selected.join(", ")}`);
    }
  }

  if (data.notes) parts.push(`Notes: ${data.notes}`);

  return parts.join("\n");
}

async function findOrCreateCustomer(data: {
  name: string;
  email: string;
  phone: string;
}): Promise<string> {
  const square = getSquare();

  // Search by email first
  const searchResult = await square.customers.search({
    query: {
      filter: {
        emailAddress: { exact: data.email },
      },
    },
  });

  if (searchResult.customers && searchResult.customers.length > 0) {
    return searchResult.customers[0].id!;
  }

  // Create new customer
  const createResult = await square.customers.create({
    idempotencyKey: randomUUID(),
    givenName: data.name.split(" ")[0],
    familyName: data.name.split(" ").slice(1).join(" ") || undefined,
    emailAddress: data.email,
    phoneNumber: data.phone,
  });

  return createResult.customer!.id!;
}

export async function createDraftInvoice(
  data: InvoiceData
): Promise<{ invoiceId: string; orderId: string; customerId: string }> {
  const square = getSquare();

  // 1. Find or create customer
  const customerId = await findOrCreateCustomer({
    name: data.contactName,
    email: data.contactEmail,
    phone: data.contactPhone,
  });

  // 2. Build line items for the order
  const lineItems: {
    name: string;
    quantity: string;
    basePriceMoney: { amount: bigint; currency: "USD" };
  }[] = [];

  if (data.items.length > 0) {
    for (const item of data.items) {
      lineItems.push({
        name: `${item.itemName} (${data.packageType})`,
        quantity: String(item.quantity),
        basePriceMoney: {
          amount: BigInt(item.unitPrice ?? 2000),
          currency: "USD" as const,
        },
      });
    }
  } else {
    // Fallback: single line item for the whole order
    lineItems.push({
      name: `${data.packageType} Catering (${data.guestCount} guests)`,
      quantity: "1",
      basePriceMoney: {
        amount: BigInt(data.totalAmount),
        currency: "USD" as const,
      },
    });
  }

  // Add delivery fee as separate line item
  if (data.deliveryFee > 0) {
    lineItems.push({
      name: "Delivery Fee",
      quantity: "1",
      basePriceMoney: {
        amount: BigInt(data.deliveryFee),
        currency: "USD" as const,
      },
    });
  }

  // 3. Create Square order
  const orderResult = await square.orders.create({
    order: {
      locationId: LOCATION_ID,
      customerId,
      lineItems,
      metadata: {
        source: "catering_inquiry",
        guestCount: String(data.guestCount),
        eventDate: data.eventDate,
      },
    },
    idempotencyKey: randomUUID(),
  });

  const orderId = orderResult.order!.id!;
  const orderNote = buildOrderNote(data);

  // 4. Create draft invoice
  const invoiceResult = await square.invoices.create({
    invoice: {
      orderId,
      locationId: LOCATION_ID,
      primaryRecipient: {
        customerId,
      },
      paymentRequests: [
        {
          requestType: "BALANCE",
          dueDate: data.eventDate,
        },
      ],
      deliveryMethod: "EMAIL",
      title: `Vietnoms Catering - ${data.packageType} (${data.guestCount} guests)`,
      description: orderNote,
      acceptedPaymentMethods: {
        card: true,
        bankAccount: false,
        squareGiftCard: false,
        buyNowPayLater: false,
        cashAppPay: true,
      },
    },
    idempotencyKey: randomUUID(),
  });

  const invoiceId = invoiceResult.invoice!.id!;

  console.log(
    `Draft invoice created: invoiceId=${invoiceId}, orderId=${orderId}, customerId=${customerId}`
  );

  return { invoiceId, orderId, customerId };
}
