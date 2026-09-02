import type { Square } from "square";
import { BIG_UP_MULTIPLIER, getDeliveryFee, type ProteinSelection } from "./catering-pricing";
import { formatEventDateTime, restaurantLocalToIso } from "./restaurant-hours";

/**
 * Builds the Square order pieces (line items, taxes, fulfillment, ticket note) for a
 * catering request. Shared by the paid checkout, the total calculator, and draft invoices
 * so every path produces the same itemized order that prints legibly on the POS.
 */

/** Square catalog variation IDs for catering items (production catalog). */
export const CATERING_CATALOG = {
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
} as const;

/** Square catalog tax object applied to food (not to the delivery fee). */
export const CATERING_SALES_TAX_ID = "KR7SC5SER26A2DI2QS36KSRN";
const TAX_UID = "catering-sales-tax";
export const DELIVERY_LINE_UID = "item-delivery";

// Square field limits
export const TICKET_NOTE_MAX = 500; // fulfillment note (prints on the POS ticket)
const LINE_NOTE_MAX = 2000;         // line item note
const TICKET_NAME_MAX = 30;         // order ticket name

const PROTEIN_CATALOG: Record<string, string> = {
  "Lemongrass Chicken": CATERING_CATALOG.lemongrassChicken,
  "Lemongrass Pork": CATERING_CATALOG.lemongrassPork,
  "Red Hot Beef": CATERING_CATALOG.redHotBeef,
  "Grilled Shrimp": CATERING_CATALOG.grilledShrimp,
  "Stir-fried Tofu": CATERING_CATALOG.stirFriedTofu,
};

const SIDE_CATALOG: Record<string, string> = {
  "Shredded Pork": CATERING_CATALOG.shreddedPork,
  "Pork & Shrimp Egg Roll": CATERING_CATALOG.porkShrimpEggRoll,
  "Vegan Egg Roll": CATERING_CATALOG.veganEggRoll,
};

const BASE_TRAY_CATALOG: Record<string, { half: string; full: string }> = {
  "Rice": { half: CATERING_CATALOG.halfTrayRice, full: CATERING_CATALOG.fullTrayRice },
  "Vermicelli Noodles": { half: CATERING_CATALOG.halfTrayVermicelli, full: CATERING_CATALOG.fullTrayVermicelli },
  "Salad": { half: CATERING_CATALOG.halfTraySlaw, full: CATERING_CATALOG.fullTraySlaw },
};

export interface CateringCustomizations {
  eventType?: string;
  proteins?: ProteinSelection[];
  bases?: { name: string; quantity: number }[];
  sides?: { name: string; quantity: number }[];
  bigUpActive?: boolean;
  noPeanuts?: boolean;
  eggRollCut?: string;
  utensils?: { napkins: boolean; forks: boolean; chopsticks: boolean };
}

export interface CateringOrderData {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  eventDate: string;          // YYYY-MM-DD
  eventTime?: string | null;  // HH:MM (24h), restaurant local time
  guestCount: number;
  packageType: string;        // "buffet" | "premade"
  items: { itemName: string; quantity: number; unitPrice?: number | null }[];
  deliveryFee: number;        // cents
  deliveryDistance?: number | null;
  deliveryAddress?: string | null;
  deliveryType?: string;      // "pickup" | "delivery"
  notes?: string | null;
  customizations?: CateringCustomizations | null;
}

/** The subset of order data that affects pricing / line items. */
export type CateringLineItemInput = Pick<
  CateringOrderData,
  | "guestCount"
  | "packageType"
  | "items"
  | "deliveryFee"
  | "deliveryDistance"
  | "deliveryType"
  | "notes"
  | "customizations"
>;

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

export function packageLabel(packageType: string): string {
  if (packageType === "buffet") return "Buffet Style";
  if (packageType === "premade") return "Pre-made Bowls";
  return packageType || "Custom";
}

function selectedUtensils(c?: CateringCustomizations | null): string[] {
  if (!c?.utensils) return [];
  return Object.entries(c.utensils)
    .filter(([, v]) => v)
    .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));
}

function summarizeQuantities(list?: { name: string; quantity: number }[] | null): string {
  return (list ?? [])
    .filter((x) => x.quantity > 0)
    .map((x) => `${x.name} x${x.quantity}`)
    .join(", ");
}

/** Sauces are implied by the bases: rice/vermicelli get House Sauce, salad gets vinaigrette. */
export function computeSauces(
  bases?: { name: string; quantity: number }[] | null
): { name: string; quantity: number }[] {
  const qty = (name: string) => bases?.find((b) => b.name === name)?.quantity ?? 0;
  const house = qty("Rice") + qty("Vermicelli Noodles");
  const vinaigrette = qty("Salad");
  const out: { name: string; quantity: number }[] = [];
  if (house > 0) out.push({ name: "House Sauce", quantity: house });
  if (vinaigrette > 0) out.push({ name: "Vietnoms Vinaigrette", quantity: vinaigrette });
  return out;
}

function eggRollCutLabel(c?: CateringCustomizations | null): string | undefined {
  return c?.eggRollCut && c.eggRollCut !== "Uncut" ? c.eggRollCut : undefined;
}

/** Delivery fee in cents for this request (0 for pickup). */
export function resolveDeliveryFee(data: CateringLineItemInput): number {
  if (data.deliveryType !== "delivery") return 0;
  if (data.deliveryDistance) {
    return getDeliveryFee(data.deliveryDistance) ?? 2000; // $20 min for over-max distance
  }
  return data.deliveryFee > 0 ? data.deliveryFee : 0;
}

/**
 * Itemized Square line items using the catering catalog, with sales tax applied per
 * line (delivery fee excluded from tax).
 */
export function buildCateringLineItems(data: CateringLineItemInput): {
  lineItems: Square.OrderLineItem[];
  taxes: Square.OrderLineItemTax[];
  deliveryFee: number;
} {
  const c = data.customizations;
  const items: Square.OrderLineItem[] = [];

  // Per-person base charge carries the order-wide kitchen notes
  const baseNotes: string[] = [];
  if (data.packageType === "premade" && c?.bases?.length) {
    baseNotes.push(`Bowls: ${summarizeQuantities(c.bases)}`);
  }
  if (c?.noPeanuts) baseNotes.push("NO PEANUTS");
  const cut = eggRollCutLabel(c);
  if (cut) baseNotes.push(`Egg rolls cut ${cut}`);
  const utensils = selectedUtensils(c);
  if (utensils.length > 0) baseNotes.push(`Utensils: ${utensils.join(", ")}`);
  if (data.notes?.trim()) baseNotes.push(data.notes.trim());

  items.push({
    catalogObjectId: CATERING_CATALOG.cateringPerPerson,
    quantity: String(data.guestCount),
    note: baseNotes.length > 0 ? truncate(baseNotes.join(" | "), LINE_NOTE_MAX) : undefined,
  });

  // Proteins
  for (const item of data.items) {
    if (item.quantity <= 0) continue;
    const catId = PROTEIN_CATALOG[item.itemName];
    if (catId) {
      items.push({ catalogObjectId: catId, quantity: String(item.quantity) });
    } else {
      items.push({
        name: `Catering - ${item.itemName}`,
        quantity: String(item.quantity),
        basePriceMoney: { amount: BigInt(item.unitPrice ?? 0), currency: "USD" },
      });
    }
  }

  // Buffet bases as half/full trays (10 servings = half tray, 20 = full tray)
  if (data.packageType === "buffet" && c?.bases?.length) {
    for (const base of c.bases) {
      if (base.quantity <= 0) continue;
      const trayIds = BASE_TRAY_CATALOG[base.name];
      if (!trayIds) continue;
      const fullTrays = Math.floor(base.quantity / 20);
      const halfTrays = base.quantity % 20 > 0 ? 1 : 0;
      if (fullTrays > 0) items.push({ catalogObjectId: trayIds.full, quantity: String(fullTrays) });
      if (halfTrays > 0) items.push({ catalogObjectId: trayIds.half, quantity: String(halfTrays) });
    }
  }

  // Sides (egg roll lines carry the cut instruction so the kitchen sees it on the item)
  if (c?.sides?.length) {
    for (const side of c.sides) {
      if (side.quantity <= 0) continue;
      const catId = SIDE_CATALOG[side.name];
      if (!catId) continue;
      const isEggRoll = /egg roll/i.test(side.name);
      items.push({
        catalogObjectId: catId,
        quantity: String(side.quantity),
        note: isEggRoll && cut ? `Cut ${cut}` : undefined,
      });
    }
  }

  // Big Up surcharge (+50% protein), per guest
  if (c?.bigUpActive) {
    items.push({ catalogObjectId: CATERING_CATALOG.bigUp, quantity: String(data.guestCount) });
  }

  // Extra protein servings beyond the included baseline
  const totalProtein = data.items.reduce((s, i) => s + Math.max(0, i.quantity), 0);
  const proteinBaseline = c?.bigUpActive
    ? Math.ceil(BIG_UP_MULTIPLIER * data.guestCount)
    : data.guestCount;
  const extraProteinCount = Math.max(0, totalProtein - proteinBaseline);
  if (extraProteinCount > 0) {
    items.push({ catalogObjectId: CATERING_CATALOG.extraProtein, quantity: String(extraProteinCount) });
  }

  // Extra side servings beyond one per guest
  if (c?.sides?.length) {
    const totalSides = c.sides.reduce((s, sd) => s + Math.max(0, sd.quantity), 0);
    const extraSideCount = Math.max(0, totalSides - data.guestCount);
    if (extraSideCount > 0) {
      items.push({ catalogObjectId: CATERING_CATALOG.extraSide, quantity: String(extraSideCount) });
    }
  }

  // Tax every food line; the delivery fee is added below untaxed
  const lineItems: Square.OrderLineItem[] = items.map((item, i) => ({
    ...item,
    uid: `item-${i}`,
    appliedTaxes: [{ taxUid: TAX_UID }],
  }));

  const deliveryFee = resolveDeliveryFee(data);
  if (deliveryFee > 0) {
    lineItems.push({
      uid: DELIVERY_LINE_UID,
      name: "Delivery Fee",
      quantity: "1",
      basePriceMoney: { amount: BigInt(deliveryFee), currency: "USD" },
    });
  }

  const taxes: Square.OrderLineItemTax[] = [
    { uid: TAX_UID, catalogObjectId: CATERING_SALES_TAX_ID, scope: "LINE_ITEM" },
  ];

  return { lineItems, taxes, deliveryFee };
}

/**
 * Short, structured note for the POS ticket. Leads with what the kitchen needs first
 * (style, headcount, when, where) and stays within the 500-character limit.
 */
export function buildTicketNote(data: CateringOrderData): string {
  const c = data.customizations;
  const parts: string[] = [];

  parts.push(`CATERING ${packageLabel(data.packageType)} for ${data.guestCount}`);
  parts.push(formatEventDateTime(data.eventDate, data.eventTime, "short"));
  parts.push(
    data.deliveryType === "delivery" && data.deliveryAddress
      ? `DELIVER TO ${data.deliveryAddress}`
      : "PICKUP"
  );
  if (c?.eventType?.trim()) parts.push(c.eventType.trim());

  const bases = summarizeQuantities(c?.bases);
  if (bases) parts.push(`${data.packageType === "premade" ? "Bowls" : "Bases"}: ${bases}`);
  const sauces = summarizeQuantities(computeSauces(c?.bases));
  if (sauces) parts.push(`Sauces: ${sauces}`);

  if (c?.bigUpActive) parts.push("BIG UP +50% protein");
  if (c?.noPeanuts) parts.push("NO PEANUTS");
  const cut = eggRollCutLabel(c);
  if (cut) parts.push(`Egg rolls cut ${cut}`);
  const utensils = selectedUtensils(c);
  if (utensils.length > 0) parts.push(`Utensils: ${utensils.join(", ")}`);
  if (data.notes?.trim()) parts.push(data.notes.trim());

  return truncate(parts.join(" | "), TICKET_NOTE_MAX);
}

/**
 * Best-effort split of a Google-formatted address ("123 Main St, San Jose, CA 95112, USA")
 * into Square address fields. Falls back to the whole string as line 1.
 */
export function parseFormattedAddress(address: string): Square.Address {
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length > 0 && /^(USA|US|United States)$/i.test(parts[parts.length - 1])) {
    parts.pop();
  }
  if (parts.length >= 3) {
    const stateZip = parts[parts.length - 1].match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (stateZip) {
      return {
        addressLine1: parts.slice(0, -2).join(", "),
        locality: parts[parts.length - 2],
        administrativeDistrictLevel1: stateZip[1].toUpperCase(),
        postalCode: stateZip[2],
        country: "US",
      };
    }
  }
  return { addressLine1: address, country: "US" };
}

/**
 * Scheduled PICKUP or DELIVERY fulfillment with the time expressed correctly in UTC
 * (Square displays it in the location's timezone on the POS).
 */
export function buildCateringFulfillment(
  data: CateringOrderData & { eventTime: string },
  opts: { customerId?: string; forcePickup?: boolean } = {}
): Square.Fulfillment {
  const scheduledAt = restaurantLocalToIso(data.eventDate, data.eventTime);
  const recipient: Square.FulfillmentRecipient = {
    displayName: data.contactName,
    emailAddress: data.contactEmail,
    phoneNumber: data.contactPhone,
    ...(opts.customerId ? { customerId: opts.customerId } : {}),
  };
  const note = buildTicketNote(data);

  if (!opts.forcePickup && data.deliveryType === "delivery" && data.deliveryAddress) {
    return {
      type: "DELIVERY",
      deliveryDetails: {
        recipient: { ...recipient, address: parseFormattedAddress(data.deliveryAddress) },
        scheduleType: "SCHEDULED",
        deliverAt: scheduledAt,
        note,
      },
    };
  }

  return {
    type: "PICKUP",
    pickupDetails: {
      recipient,
      scheduleType: "SCHEDULED",
      pickupAt: scheduledAt,
      note,
    },
  };
}

/** Complete Square order body for a catering request. */
export function buildCateringOrder(opts: {
  data: CateringOrderData & { eventTime: string };
  locationId: string;
  source: string;
  customerId?: string;
  referenceId?: string;
  forcePickup?: boolean;
}): Square.Order {
  const { data } = opts;
  const { lineItems, taxes } = buildCateringLineItems(data);

  return {
    locationId: opts.locationId,
    ...(opts.customerId ? { customerId: opts.customerId } : {}),
    ...(opts.referenceId ? { referenceId: opts.referenceId } : {}),
    ticketName: truncate(`Catering ${data.contactName}`, TICKET_NAME_MAX),
    lineItems,
    taxes,
    fulfillments: [
      buildCateringFulfillment(data, { customerId: opts.customerId, forcePickup: opts.forcePickup }),
    ],
    metadata: {
      source: opts.source,
      guestCount: String(data.guestCount),
      eventDate: data.eventDate,
      eventTime: data.eventTime,
      packageType: data.packageType,
      deliveryType: data.deliveryType ?? "pickup",
    },
  };
}
