import { getSquare, LOCATION_ID } from "./square";
import { randomUUID } from "crypto";
import { getDeliveryFee } from "./catering-pricing";

// Square catalog variation IDs for catering items
const CAT = {
  // Base
  cateringPerPerson: "HEH3EO77DNTOZAVXUHCVRF3A", // $20.00

  // Proteins (free ones at $0, upcharge ones at their price)
  lemongrassChicken: "M6UFOEYPKT3KJ4YD2H6MHCTB", // $0
  lemongrassPork: "64BQBSU6ACX4WLGTSWIEUKLW",     // $0
  redHotBeef: "3FZDEAN54FMPTBT2D422CBBT",          // $1.00
  grilledShrimp: "VIJAJGVDK5JVBV37BW6CV4ZG",       // $2.50
  stirFriedTofu: "I4W7TJRQDMFQKDPX4MCYDMWY",      // $0

  // Bases (half/full trays, $0)
  halfTrayRice: "EPNP3R77J4PC2MA4VZ54SI2I",
  fullTrayRice: "EAZYUXZJSQMXAMJ4RYABKMIT",
  halfTrayVermicelli: "6R2V4SGHCREFUZMYDT563TTD",
  fullTrayVermicelli: "PSGUEMEA5ZPOWSKFHGI4QOFG",
  halfTraySlaw: "OXKQBY3OPBJDKSLO7GCLSE6Y",
  fullTraySlaw: "WWYUOWC3LER2BRE7UFL3DZTK",

  // Sides ($0)
  shreddedPork: "DW54NALP2E4BURMDDKYYLHWM",
  porkShrimpEggRoll: "P5RXK7F4RADKO5FXQVFQEK7L",
  veganEggRoll: "PF6AW2YNK6KPFANQWAHWI7ZL",

  // Surcharges
  bigUp: "Q4UFIOE53WKVYUONJVKL2MK2",              // $4.00
  extraProtein: "FT2WV4NDNEZEONNAOYRJWC3O",         // $4.00
  extraSide: "O6LUWLSKRVFGZNCTGO6SOIRC",            // $3.00
  deliveryFee: "36UE7H2ZZ37JXWD5NLNKMLK5",          // variable
};

// Map protein names to catalog variation IDs
const PROTEIN_CATALOG: Record<string, string> = {
  "Lemongrass Chicken": CAT.lemongrassChicken,
  "Lemongrass Pork": CAT.lemongrassPork,
  "Red Hot Beef": CAT.redHotBeef,
  "Grilled Shrimp": CAT.grilledShrimp,
  "Stir-fried Tofu": CAT.stirFriedTofu,
};

// Map side names to catalog variation IDs
const SIDE_CATALOG: Record<string, string> = {
  "Shredded Pork": CAT.shreddedPork,
  "Pork & Shrimp Egg Roll": CAT.porkShrimpEggRoll,
  "Vegan Egg Roll": CAT.veganEggRoll,
};

// Map base names to half/full tray catalog IDs
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

  // Proteins (each listed separately at their price — $0 for free, upcharge for premium)
  for (const item of data.items) {
    if (item.quantity <= 0) continue;
    const catId = PROTEIN_CATALOG[item.itemName];
    if (catId) {
      lineItems.push({
        catalogObjectId: catId,
        quantity: String(item.quantity),
      });
    } else {
      // Fallback for unknown proteins
      lineItems.push({
        name: `Catering - ${item.itemName}`,
        quantity: String(item.quantity),
        basePriceMoney: { amount: BigInt(item.unitPrice ?? 0), currency: "USD" },
      });
    }
  }

  // Bases as half/full trays (buffet style: 10 = half tray, 20 = full tray)
  if (data.customizations?.bases?.length && data.packageType === "buffet") {
    for (const base of data.customizations.bases) {
      if (base.quantity <= 0) continue;
      const trayIds = BASE_TRAY_CATALOG[base.name];
      if (!trayIds) continue;

      const fullTrays = Math.floor(base.quantity / 20);
      const remaining = base.quantity % 20;
      const halfTrays = Math.ceil(remaining / 10);

      if (fullTrays > 0) {
        lineItems.push({ catalogObjectId: trayIds.full, quantity: String(fullTrays) });
      }
      if (halfTrays > 0) {
        lineItems.push({ catalogObjectId: trayIds.half, quantity: String(halfTrays) });
      }
    }
  }

  // Sides (listed at $0)
  if (data.customizations?.sides?.length) {
    for (const side of data.customizations.sides) {
      if (side.quantity <= 0) continue;
      const catId = SIDE_CATALOG[side.name];
      if (catId) {
        lineItems.push({ catalogObjectId: catId, quantity: String(side.quantity) });
      } else {
        lineItems.push({
          name: `Catering - ${side.name}`,
          quantity: String(side.quantity),
          basePriceMoney: { amount: BigInt(0), currency: "USD" },
        });
      }
    }
  }

  // Big Up surcharge ($4/person)
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

  // Delivery fee (calculated from distance)
  const deliveryFeeAmount = data.deliveryDistance
    ? getDeliveryFee(data.deliveryDistance)
    : data.deliveryFee > 0 ? data.deliveryFee : null;

  if (deliveryFeeAmount && deliveryFeeAmount > 0) {
    lineItems.push({
      catalogObjectId: CAT.deliveryFee,
      quantity: "1",
      basePriceMoney: { amount: BigInt(deliveryFeeAmount), currency: "USD" },
    });
  }

  // 3. Create Square order with auto-apply taxes
  const orderResult = await square.orders.create({
    order: {
      locationId: LOCATION_ID,
      customerId,
      lineItems,
      pricingOptions: { autoApplyTaxes: true },
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
  const invoiceResult = await square.invoices.create({
    invoice: {
      orderId,
      locationId: LOCATION_ID,
      primaryRecipient: { customerId },
      paymentRequests: [{
        requestType: "BALANCE",
        dueDate: data.eventDate,
      }],
      deliveryMethod: "EMAIL",
      title,
      description: "Thanks for picking Vietnoms to cater for you. We hope we can cater again for you soon!",
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
  console.log(`Draft invoice created: invoiceId=${invoiceId}, orderId=${orderId}, customerId=${customerId}`);

  return { invoiceId, orderId, customerId };
}
