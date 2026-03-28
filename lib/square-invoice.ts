import { getSquare, LOCATION_ID } from "./square";
import { randomUUID } from "crypto";
import { PROTEINS } from "./catering-pricing";

// Square catalog variation IDs for catering items
const CATALOG = {
  cateringPerPerson: "HEH3EO77DNTOZAVXUHCVRF3A",    // $20.00/person
  beefUpcharge: "N5K45MBM5FFW7Q2ZMW4PAH32",          // $1.00/person
  shrimpUpcharge: "EA6PSWLG2VD2XJXDI2D4TYB6",        // $2.50/person
  bigUp: "Q4UFIOE53WKVYUONJVKL2MK2",                 // $4.00/person
  extraProtein: "FT2WV4NDNEZEONNAOYRJWC3O",           // $4.00/serving
  extraSide: "O6LUWLSKRVFGZNCTGO6SOIRC",              // $3.00/serving
  deliveryFee: "36UE7H2ZZ37JXWD5NLNKMLK5",            // variable
};

// Map protein names to their upcharge catalog items
const PROTEIN_UPCHARGE_MAP: Record<string, string> = {
  "Red Hot Beef": CATALOG.beefUpcharge,
  "Grilled Shrimp": CATALOG.shrimpUpcharge,
};

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

  // 2. Build line items using catalog items
  type LineItem = {
    catalogObjectId?: string;
    name?: string;
    quantity: string;
    basePriceMoney?: { amount: bigint; currency: "USD" };
    note?: string;
  };
  const lineItems: LineItem[] = [];

  // Base catering per person
  const proteinDescriptions: string[] = [];
  for (const item of data.items) {
    if (item.quantity > 0) {
      proteinDescriptions.push(`${item.itemName} x${item.quantity}`);
    }
  }

  const baseNote = [
    `${data.packageType} style`,
    proteinDescriptions.length > 0 ? `Proteins: ${proteinDescriptions.join(", ")}` : null,
    data.customizations?.bases?.length
      ? `Bases: ${data.customizations.bases.map((b) => `${b.name} x${b.quantity}`).join(", ")}`
      : null,
    data.customizations?.sides?.length
      ? `Sides: ${data.customizations.sides.map((s) => `${s.name} x${s.quantity}`).join(", ")}`
      : null,
    data.customizations?.noPeanuts ? "No Peanuts" : null,
    data.customizations?.eggRollCut && data.customizations.eggRollCut !== "Uncut"
      ? `Egg Roll Cut: ${data.customizations.eggRollCut}`
      : null,
  ].filter(Boolean).join(" | ");

  lineItems.push({
    catalogObjectId: CATALOG.cateringPerPerson,
    quantity: String(data.guestCount),
    note: baseNote || undefined,
  });

  // Protein upcharges (per person with that protein)
  for (const item of data.items) {
    const protein = PROTEINS.find((p) => p.name === item.itemName);
    const catalogId = PROTEIN_UPCHARGE_MAP[item.itemName];
    if (protein && protein.upcharge > 0 && item.quantity > 0 && catalogId) {
      lineItems.push({
        catalogObjectId: catalogId,
        quantity: String(item.quantity),
      });
    } else if (protein && protein.upcharge > 0 && item.quantity > 0) {
      // Fallback for proteins without a catalog item
      lineItems.push({
        name: `${item.itemName} Upcharge`,
        quantity: String(item.quantity),
        basePriceMoney: {
          amount: BigInt(protein.upcharge),
          currency: "USD",
        },
      });
    }
  }

  // Big Up surcharge
  if (data.customizations?.bigUpActive) {
    lineItems.push({
      catalogObjectId: CATALOG.bigUp,
      quantity: String(data.guestCount),
    });
  }

  // Extra protein servings (beyond baseline)
  const totalProtein = data.items.reduce((s, i) => s + i.quantity, 0);
  const proteinBaseline = data.customizations?.bigUpActive
    ? Math.ceil(1.5 * data.guestCount)
    : data.guestCount;
  const extraProteinCount = Math.max(0, totalProtein - proteinBaseline);
  if (extraProteinCount > 0) {
    lineItems.push({
      catalogObjectId: CATALOG.extraProtein,
      quantity: String(extraProteinCount),
    });
  }

  // Extra side servings (beyond baseline, buffet only)
  if (data.customizations?.sides?.length) {
    const totalSides = data.customizations.sides.reduce((s, sd) => s + sd.quantity, 0);
    const extraSideCount = Math.max(0, totalSides - data.guestCount);
    if (extraSideCount > 0) {
      lineItems.push({
        catalogObjectId: CATALOG.extraSide,
        quantity: String(extraSideCount),
      });
    }
  }

  // Delivery fee (variable pricing)
  if (data.deliveryFee > 0) {
    lineItems.push({
      catalogObjectId: CATALOG.deliveryFee,
      quantity: "1",
      basePriceMoney: {
        amount: BigInt(data.deliveryFee),
        currency: "USD",
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
