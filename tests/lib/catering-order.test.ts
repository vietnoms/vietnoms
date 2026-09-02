import { describe, it, expect } from "vitest";
import {
  buildCateringLineItems,
  buildTicketNote,
  buildCateringFulfillment,
  buildCateringOrder,
  parseFormattedAddress,
  computeSauces,
  CATERING_CATALOG,
  CATERING_SALES_TAX_ID,
  DELIVERY_LINE_UID,
  TICKET_NOTE_MAX,
  type CateringOrderData,
} from "@/lib/catering-order";

const buffetDelivery: CateringOrderData & { eventTime: string } = {
  contactName: "Kate Tu",
  contactEmail: "kate@example.com",
  contactPhone: "(408) 555-0123",
  eventDate: "2026-09-12",
  eventTime: "16:00",
  guestCount: 30,
  packageType: "buffet",
  items: [
    { itemName: "Lemongrass Chicken", quantity: 20, unitPrice: 2000 },
    { itemName: "Grilled Shrimp", quantity: 25, unitPrice: 2250 },
  ],
  deliveryType: "delivery",
  deliveryAddress: "1 Washington Sq, San Jose, CA 95192, USA",
  deliveryDistance: 3.2,
  deliveryFee: 1000,
  notes: "Gate code 1234",
  customizations: {
    eventType: "Office lunch",
    bases: [
      { name: "Rice", quantity: 20 },
      { name: "Vermicelli Noodles", quantity: 10 },
    ],
    sides: [
      { name: "Shredded Pork", quantity: 20 },
      { name: "Pork & Shrimp Egg Roll", quantity: 10 },
    ],
    bigUpActive: true,
    noPeanuts: true,
    eggRollCut: "1/2",
    utensils: { napkins: true, forks: false, chopsticks: true },
  },
};

const premadePickup: CateringOrderData & { eventTime: string } = {
  contactName: "Sam Lee",
  contactEmail: "sam@example.com",
  contactPhone: "4085550100",
  eventDate: "2026-09-14",
  eventTime: "12:00",
  guestCount: 12,
  packageType: "premade",
  items: [{ itemName: "Stir-fried Tofu", quantity: 12, unitPrice: 2000 }],
  deliveryType: "pickup",
  deliveryFee: 0,
  customizations: {
    bases: [
      { name: "Rice", quantity: 8 },
      { name: "Salad", quantity: 4 },
    ],
    sides: [],
    bigUpActive: false,
    noPeanuts: false,
    eggRollCut: "Uncut",
    utensils: { napkins: false, forks: false, chopsticks: false },
  },
};

function line<T extends { catalogObjectId?: string | null }>(items: T[], id: string): T | undefined {
  return items.find((i) => i.catalogObjectId === id);
}

describe("buildCateringLineItems", () => {
  it("itemizes a buffet order with catalog IDs, trays, sides, surcharges and an untaxed delivery fee", () => {
    const { lineItems, taxes, deliveryFee } = buildCateringLineItems(buffetDelivery);

    expect(line(lineItems, CATERING_CATALOG.cateringPerPerson)?.quantity).toBe("30");
    expect(line(lineItems, CATERING_CATALOG.lemongrassChicken)?.quantity).toBe("20");
    expect(line(lineItems, CATERING_CATALOG.grilledShrimp)?.quantity).toBe("25");
    expect(line(lineItems, CATERING_CATALOG.fullTrayRice)?.quantity).toBe("1");
    expect(line(lineItems, CATERING_CATALOG.halfTrayRice)).toBeUndefined();
    expect(line(lineItems, CATERING_CATALOG.halfTrayVermicelli)?.quantity).toBe("1");
    expect(line(lineItems, CATERING_CATALOG.shreddedPork)?.quantity).toBe("20");
    expect(line(lineItems, CATERING_CATALOG.porkShrimpEggRoll)?.quantity).toBe("10");
    expect(line(lineItems, CATERING_CATALOG.bigUp)?.quantity).toBe("30");
    // 45 protein servings == Big Up baseline of ceil(1.5 * 30), so no extra protein charge
    expect(line(lineItems, CATERING_CATALOG.extraProtein)).toBeUndefined();
    expect(line(lineItems, CATERING_CATALOG.extraSide)).toBeUndefined();

    const delivery = lineItems.find((i) => i.uid === DELIVERY_LINE_UID);
    expect(delivery?.basePriceMoney?.amount).toBe(BigInt(1000));
    expect(delivery?.appliedTaxes).toBeUndefined();
    expect(deliveryFee).toBe(1000);

    // Every food line is taxed via the catalog tax object
    for (const item of lineItems) {
      if (item.uid === DELIVERY_LINE_UID) continue;
      expect(item.appliedTaxes?.[0]?.taxUid).toBe("catering-sales-tax");
    }
    expect(taxes).toEqual([
      { uid: "catering-sales-tax", catalogObjectId: CATERING_SALES_TAX_ID, scope: "LINE_ITEM" },
    ]);
  });

  it("puts kitchen instructions on the relevant lines", () => {
    const { lineItems } = buildCateringLineItems(buffetDelivery);
    const base = line(lineItems, CATERING_CATALOG.cateringPerPerson);
    expect(base?.note).toContain("NO PEANUTS");
    expect(base?.note).toContain("Egg rolls cut 1/2");
    expect(base?.note).toContain("Utensils: Napkins, Chopsticks");
    expect(base?.note).toContain("Gate code 1234");
    expect(line(lineItems, CATERING_CATALOG.porkShrimpEggRoll)?.note).toBe("Cut 1/2");
    expect(line(lineItems, CATERING_CATALOG.shreddedPork)?.note).toBeUndefined();
  });

  it("describes pre-made bowls on the base line instead of tray items", () => {
    const { lineItems, deliveryFee } = buildCateringLineItems(premadePickup);
    expect(line(lineItems, CATERING_CATALOG.cateringPerPerson)?.note).toBe("Bowls: Rice x8, Salad x4");
    expect(line(lineItems, CATERING_CATALOG.fullTrayRice)).toBeUndefined();
    expect(line(lineItems, CATERING_CATALOG.halfTraySlaw)).toBeUndefined();
    expect(lineItems.find((i) => i.uid === DELIVERY_LINE_UID)).toBeUndefined();
    expect(deliveryFee).toBe(0);
  });

  it("charges for protein and sides beyond the included amounts", () => {
    const { lineItems } = buildCateringLineItems({
      ...premadePickup,
      packageType: "buffet",
      items: [{ itemName: "Lemongrass Pork", quantity: 15 }],
      customizations: {
        bases: [{ name: "Rice", quantity: 12 }],
        sides: [{ name: "Shredded Pork", quantity: 14 }],
      },
    });
    expect(line(lineItems, CATERING_CATALOG.extraProtein)?.quantity).toBe("3");
    expect(line(lineItems, CATERING_CATALOG.extraSide)?.quantity).toBe("2");
  });

  it("ignores delivery distance for pickup orders", () => {
    const { deliveryFee, lineItems } = buildCateringLineItems({
      ...premadePickup,
      deliveryDistance: 4,
      deliveryFee: 1000,
    });
    expect(deliveryFee).toBe(0);
    expect(lineItems.find((i) => i.uid === DELIVERY_LINE_UID)).toBeUndefined();
  });
});

describe("buildTicketNote", () => {
  it("leads with style, headcount, time and destination", () => {
    const note = buildTicketNote(buffetDelivery);
    expect(note.startsWith("CATERING Buffet Style for 30 | Sat 9/12 4:00 PM | DELIVER TO 1 Washington Sq")).toBe(true);
    expect(note).toContain("Office lunch");
    expect(note).toContain("Bases: Rice x20, Vermicelli Noodles x10");
    expect(note).toContain("Sauces: House Sauce x30");
    expect(note).toContain("BIG UP");
    expect(note).toContain("NO PEANUTS");
    expect(note).toContain("Egg rolls cut 1/2");
    expect(note).toContain("Utensils: Napkins, Chopsticks");
    expect(note).toContain("Gate code 1234");
  });

  it("marks pickup orders and bowls for pre-made", () => {
    const note = buildTicketNote(premadePickup);
    expect(note).toContain("| PICKUP");
    expect(note).toContain("Bowls: Rice x8, Salad x4");
    expect(note).toContain("Sauces: House Sauce x8, Vietnoms Vinaigrette x4");
    expect(note).not.toContain("NO PEANUTS");
  });

  it("stays within the Square note limit", () => {
    const note = buildTicketNote({ ...buffetDelivery, notes: "x".repeat(2000) });
    expect(note.length).toBeLessThanOrEqual(TICKET_NOTE_MAX);
    expect(note.endsWith("...")).toBe(true);
  });
});

describe("computeSauces", () => {
  it("maps bases to sauces", () => {
    expect(computeSauces([{ name: "Rice", quantity: 5 }, { name: "Vermicelli Noodles", quantity: 5 }, { name: "Salad", quantity: 2 }]))
      .toEqual([{ name: "House Sauce", quantity: 10 }, { name: "Vietnoms Vinaigrette", quantity: 2 }]);
    expect(computeSauces(undefined)).toEqual([]);
  });
});

describe("parseFormattedAddress", () => {
  it("splits a Google-formatted US address", () => {
    expect(parseFormattedAddress("1 Washington Sq, San Jose, CA 95192, USA")).toEqual({
      addressLine1: "1 Washington Sq",
      locality: "San Jose",
      administrativeDistrictLevel1: "CA",
      postalCode: "95192",
      country: "US",
    });
  });

  it("keeps extra leading parts on line 1", () => {
    expect(parseFormattedAddress("Building A, 123 Main St, San Jose, CA 95112, USA").addressLine1).toBe("Building A, 123 Main St");
  });

  it("falls back to the whole string when the shape is unfamiliar", () => {
    expect(parseFormattedAddress("Somewhere unusual")).toEqual({ addressLine1: "Somewhere unusual", country: "US" });
  });
});

describe("buildCateringFulfillment", () => {
  it("creates a scheduled DELIVERY fulfillment with the time in UTC", () => {
    const f = buildCateringFulfillment(buffetDelivery, { customerId: "CUST1" });
    expect(f.type).toBe("DELIVERY");
    expect(f.deliveryDetails?.scheduleType).toBe("SCHEDULED");
    expect(f.deliveryDetails?.deliverAt).toBe("2026-09-12T23:00:00.000Z");
    expect(f.deliveryDetails?.recipient?.displayName).toBe("Kate Tu");
    expect(f.deliveryDetails?.recipient?.customerId).toBe("CUST1");
    expect(f.deliveryDetails?.recipient?.address?.postalCode).toBe("95192");
    expect(f.deliveryDetails?.note).toContain("DELIVER TO");
  });

  it("creates a scheduled PICKUP fulfillment in Pacific time", () => {
    const f = buildCateringFulfillment(premadePickup);
    expect(f.type).toBe("PICKUP");
    expect(f.pickupDetails?.scheduleType).toBe("SCHEDULED");
    expect(f.pickupDetails?.pickupAt).toBe("2026-09-14T19:00:00.000Z"); // noon PDT
    expect(f.pickupDetails?.recipient?.phoneNumber).toBe("4085550100");
    expect(f.pickupDetails?.recipient?.customerId).toBeUndefined();
  });

  it("can force a pickup ticket for a delivery order (fallback path)", () => {
    const f = buildCateringFulfillment(buffetDelivery, { forcePickup: true });
    expect(f.type).toBe("PICKUP");
    expect(f.pickupDetails?.note).toContain("DELIVER TO 1 Washington Sq");
  });
});

describe("buildCateringOrder", () => {
  it("assembles a complete order for Square", () => {
    const order = buildCateringOrder({
      data: buffetDelivery,
      locationId: "LOC123",
      source: "catering_checkout",
      customerId: "CUST1",
      referenceId: "catering-42",
    });
    expect(order.locationId).toBe("LOC123");
    expect(order.customerId).toBe("CUST1");
    expect(order.referenceId).toBe("catering-42");
    expect(order.ticketName).toBe("Catering Kate Tu");
    expect(order.ticketName!.length).toBeLessThanOrEqual(30);
    expect(order.fulfillments).toHaveLength(1);
    expect(order.fulfillments?.[0].type).toBe("DELIVERY");
    expect(order.taxes?.[0].catalogObjectId).toBe(CATERING_SALES_TAX_ID);
    expect(order.metadata).toMatchObject({
      source: "catering_checkout",
      guestCount: "30",
      eventDate: "2026-09-12",
      eventTime: "16:00",
      packageType: "buffet",
      deliveryType: "delivery",
    });
  });

  it("truncates long names for the ticket", () => {
    const order = buildCateringOrder({
      data: { ...premadePickup, contactName: "Bartholomew Montgomery-Fitzgerald III" },
      locationId: "LOC123",
      source: "catering_checkout",
    });
    expect(order.ticketName!.length).toBeLessThanOrEqual(30);
  });
});
