import { getSquare, LOCATION_ID } from "./square";
import { randomUUID } from "crypto";
import { getDeliveryFee } from "./catering-pricing";

// Square catalog variation IDs for catering items
const CAT = {
  // Base charge
  cateringPerPerson: "HEH3EO77DNTOZAVXUHCVRF3A", // $20.00

  // Proteins (variations under "Catering - Protein")
  lemongrassChicken: "OWOB32R52VVOXIV5VK2M3TYK", // $0
  lemongrassPork: "2UJ64DAJTMVGHSM2XJUUIUCL",    // $0
  redHotBeef: "IDR6GKQRB7YDPSMSGM6G4M2P",         // $1.00
  grilledShrimp: "IKWETMTHSYVMBCEJE7QYIUP4",      // $2.50
  stirFriedTofu: "Q62P4KPCFVAHYCPSMJK47AHA",      // $0

  // Bases (variations under "Catering - Base Tray")
  halfTrayRice: "DVA7YLH76GEYPL4MWXKXXWIC",
  fullTrayRice: "IKM7M72HPIZCCX2HYNTXMCGJ",
  halfTrayVermicelli: "7QGH45CD6N2W57U7T6TCP3EX",
  fullTrayVermicelli: "6CIQ2GJQOFWLDUGKQU2VZYO2",
  halfTraySlaw: "N5SDS7VW2NYLP5E4UCXK5QXV",
  fullTraySlaw: "UR7VTP2UGYD5Y2O7Y6ZX5BR5",

  // Sides (variations under "Catering - Side")
  shreddedPork: "RELZ3LXM65EOGYMY6DA6R5RB",
  porkShrimpEggRoll: "DCFYVY7LVIR65YUK5DMV6XMI",
  veganEggRoll: "NXUXORLABFJTIY45AG2X6MCV",

  // Surcharges
  bigUp: "Q4UFIOE53WKVYUONJVKL2MK2",              // $4.00
  extraProtein: "FT2WV4NDNEZEONNAOYRJWC3O",         // $4.00
  extraSide: "O6LUWLSKRVFGZNCTGO6SOIRC",            // $3.00
  deliveryFee: "36UE7H2ZZ37JXWD5NLNKMLK5",          // variable
};

const SALES_TAX_ID = "KR7SC5SER26A2DI2QS36KSRN"; // 9.375%

const PROTEIN_CATALOG: Record<string, string> = {
  "Lemongrass Chicken": CAT.lemongrassChicken,
  "Lemongrass Pork": CAT.lemongrassPork,
  "Red Hot Beef": CAT.redHotBeef,
  "Grilled Shrimp": CAT.grilledShrimp,
  "Stir-fried Tofu": CAT.stirFriedTofu,
};

const SIDE_CATALOG: Record<string, string> = {
  "Shredded Pork": CAT.shreddedPork,
  "Pork & Shrimp Egg Roll": CAT.porkShrimpEggRoll,
  "Vegan Egg Roll": CAT.veganEggRoll,
};

const BASE_TRAY_CATALOG: Record<string, { half: string; full: string }> = {
  "Rice": { half: CAT.halfTrayRice, full: CAT.fullTrayRice },
  "Vermicelli Noodles": { half: CAT.halfTrayVermicelli, full: CAT.fullTrayVermicelli },
  "Salad": { half: CAT.halfTraySlaw, full: CAT.fullTraySlaw },
};

interface InvoiceData {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  eventDate: string;
  guestCount: number;
  packageType: string;
  totalAmount: number;
  items: { itemName: string; quantity: number; unitPrice?: number | null }[];
  deliveryFee: number;
  deliveryDistance?: number | null;
  deliveryAddress?: string | null;
  deliveryType?: string;
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

function formatInvoiceTitle(data: InvoiceData): string {
  const date = new Date(data.eventDate + "T12:00:00");
  const dayName = date.toLocaleDateString("en-US", { weekday: "long", timeZone: "America/Los_Angeles" });
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = String(date.getFullYear()).slice(2);
  const dateStr = `${month}/${day}/${year}`;

  const location = data.deliveryType === "delivery" && data.deliveryAddress
    ? data.deliveryAddress
    : "Pickup at Vietnoms";

  return `${dayName}, ${dateStr} Catering - ${location}`;
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

  // 2. Build line items
  type LineItem = {
    catalogObjectId?: string;
    name?: string;
    quantity: string;
    basePriceMoney?: { amount: bigint; currency: "USD" };
    note?: string;
  };
  const lineItems: LineItem[] = [];

  // Catering per person (base charge) with customer notes
  const noteLines: string[] = [];
  if (data.customizations?.noPeanuts) noteLines.push("No Peanuts");
  if (data.customizations?.eggRollCut && data.customizations.eggRollCut !== "Uncut") {
    noteLines.push(`Egg Roll Cut: ${data.customizations.eggRollCut}`);
  }
  if (data.customizations?.utensils) {
    const selected = Object.entries(data.customizations.utensils)
      .filter(([, v]) => v)
      .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));
    if (selected.length > 0) noteLines.push(`Utensils: ${selected.join(", ")}`);
  }
  if (data.notes) noteLines.push(data.notes);

  lineItems.push({
    catalogObjectId: CAT.cateringPerPerson,
    quantity: String(data.guestCount),
    note: noteLines.length > 0 ? noteLines.join(" | ") : undefined,
  });

  // Proteins
  for (const item of data.items) {
    if (item.quantity <= 0) continue;
    const catId = PROTEIN_CATALOG[item.itemName];
    if (catId) {
      lineItems.push({ catalogObjectId: catId, quantity: String(item.quantity) });
    } else {
      lineItems.push({
        name: `Catering - ${item.itemName}`,
        quantity: String(item.quantity),
        basePriceMoney: { amount: BigInt(item.unitPrice ?? 0), currency: "USD" },
      });
    }
  }

  // Bases as half/full trays (buffet: 10 = half tray, 20 = full tray)
  if (data.customizations?.bases?.length && data.packageType === "buffet") {
    for (const base of data.customizations.bases) {
      if (base.quantity <= 0) continue;
      const trayIds = BASE_TRAY_CATALOG[base.name];
      if (!trayIds) continue;

      const fullTrays = Math.floor(base.quantity / 20);
      const remaining = base.quantity % 20;
      const halfTrays = remaining > 0 ? 1 : 0;

      if (fullTrays > 0) {
        lineItems.push({ catalogObjectId: trayIds.full, quantity: String(fullTrays) });
      }
      if (halfTrays > 0) {
        lineItems.push({ catalogObjectId: trayIds.half, quantity: String(halfTrays) });
      }
    }
  }

  // Sides
  if (data.customizations?.sides?.length) {
    for (const side of data.customizations.sides) {
      if (side.quantity <= 0) continue;
      const catId = SIDE_CATALOG[side.name];
      if (catId) {
        lineItems.push({ catalogObjectId: catId, quantity: String(side.quantity) });
      }
    }
  }

  // Big Up surcharge
  if (data.customizations?.bigUpActive) {
    lineItems.push({ catalogObjectId: CAT.bigUp, quantity: String(data.guestCount) });
  }

  // Extra protein servings
  const totalProtein = data.items.reduce((s, i) => s + i.quantity, 0);
  const proteinBaseline = data.customizations?.bigUpActive
    ? Math.ceil(1.5 * data.guestCount)
    : data.guestCount;
  const extraProteinCount = Math.max(0, totalProtein - proteinBaseline);
  if (extraProteinCount > 0) {
    lineItems.push({ catalogObjectId: CAT.extraProtein, quantity: String(extraProteinCount) });
  }

  // Extra side servings
  if (data.customizations?.sides?.length) {
    const totalSides = data.customizations.sides.reduce((s, sd) => s + sd.quantity, 0);
    const extraSideCount = Math.max(0, totalSides - data.guestCount);
    if (extraSideCount > 0) {
      lineItems.push({ catalogObjectId: CAT.extraSide, quantity: String(extraSideCount) });
    }
  }

  // Delivery fee
  let deliveryFeeAmount = 0;
  if (data.deliveryType === "delivery") {
    if (data.deliveryDistance) {
      const calculated = getDeliveryFee(data.deliveryDistance);
      deliveryFeeAmount = calculated ?? 2000; // $20 min for over-max distance
    }
    if (!deliveryFeeAmount && data.deliveryFee > 0) {
      deliveryFeeAmount = data.deliveryFee;
    }
  }

  // Apply tax to all line items so far (before delivery fee)
  const taxUid = "catering-sales-tax";
  const taxableItems = lineItems.map((item, i) => ({
    ...item,
    uid: `item-${i}`,
    appliedTaxes: [{ taxUid }],
  }));

  // Delivery fee (NOT taxed — added separately without appliedTaxes)
  if (deliveryFeeAmount > 0) {
    taxableItems.push({
      catalogObjectId: CAT.deliveryFee,
      quantity: "1",
      basePriceMoney: { amount: BigInt(deliveryFeeAmount), currency: "USD" },
      uid: `item-delivery`,
    } as typeof taxableItems[number]);
  }

  // 3. Create Square order with line-item-level tax (excludes delivery fee)
  const orderResult = await square.orders.create({
    order: {
      locationId: LOCATION_ID,
      customerId,
      lineItems: taxableItems,
      taxes: [{
        uid: taxUid,
        catalogObjectId: SALES_TAX_ID,
        scope: "LINE_ITEM",
      }],
      metadata: {
        source: "catering_inquiry",
        guestCount: String(data.guestCount),
        eventDate: data.eventDate,
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
