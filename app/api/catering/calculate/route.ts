import { NextResponse } from "next/server";
import { getSquare, LOCATION_ID, getSquareErrorMessage, toNumber } from "@/lib/square";
import { buildCateringLineItems, type CateringCustomizations } from "@/lib/catering-order";
import { MIN_GUESTS } from "@/lib/catering-pricing";

interface RawItem {
  itemName?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
}

/**
 * POST — public: exact catering totals (with sales tax) computed by Square, without
 * creating an order. The wizard shows these figures so the amount displayed is the
 * amount that will be charged at checkout.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const guestCount = Number(body?.guestCount);
    if (!Number.isInteger(guestCount) || guestCount < MIN_GUESTS) {
      return NextResponse.json({ error: `Minimum ${MIN_GUESTS} guests required` }, { status: 400 });
    }
    if (body?.packageType !== "buffet" && body?.packageType !== "premade") {
      return NextResponse.json({ error: "Please select a catering style" }, { status: 400 });
    }

    const isDelivery = body.deliveryType === "delivery";
    const rawItems: RawItem[] = Array.isArray(body.items) ? body.items : [];

    const { lineItems, taxes, deliveryFee } = buildCateringLineItems({
      guestCount,
      packageType: body.packageType,
      items: rawItems.map((i) => ({
        itemName: String(i.itemName ?? ""),
        quantity: Number(i.quantity) || 0,
        unitPrice: i.unitPrice != null ? Number(i.unitPrice) : undefined,
      })),
      deliveryType: isDelivery ? "delivery" : "pickup",
      deliveryDistance:
        isDelivery && body.deliveryDistance != null ? Number(body.deliveryDistance) : undefined,
      deliveryFee: isDelivery ? Number(body.deliveryFee) || 0 : 0,
      customizations: (body.customizations ?? undefined) as CateringCustomizations | undefined,
    });

    const square = getSquare();
    const result = await square.orders.calculate({
      order: { locationId: LOCATION_ID, lineItems, taxes },
    });

    const total = toNumber(result.order?.totalMoney?.amount);
    const tax = toNumber(result.order?.totalTaxMoney?.amount);

    return NextResponse.json({
      subtotal: total - tax - deliveryFee,
      deliveryFee,
      tax,
      total,
    });
  } catch (error) {
    console.error("Catering calculate error:", getSquareErrorMessage(error));
    return NextResponse.json(
      { error: "Unable to calculate your total right now. Please try again." },
      { status: 500 }
    );
  }
}
