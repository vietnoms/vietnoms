import { NextResponse } from "next/server";
import { getSquare, LOCATION_ID, toNumber } from "@/lib/square";

const FALLBACK_TAX_RATE = 0.09375;

export async function POST(request: Request) {
  try {
    const { lineItems } = await request.json();

    if (!lineItems?.length) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }

    const square = getSquare();

    const response = await square.orders.calculate({
      order: {
        locationId: LOCATION_ID,
        lineItems: lineItems.map((item: any) => ({
          catalogObjectId: item.catalogObjectId,
          quantity: String(item.quantity),
          modifiers: item.modifiers?.map((m: any) => ({
            catalogObjectId: m.catalogObjectId,
          })),
        })),
      },
    });

    const order = response?.order;
    const squareTax = toNumber(order?.totalTaxMoney?.amount);
    const totalMoney = toNumber(order?.totalMoney?.amount);
    const subtotal = totalMoney - squareTax;

    console.log("[calculate] Square raw — totalMoney:", totalMoney, "tax:", squareTax, "subtotal:", subtotal);

    let tax = squareTax;
    let taxSource: "square" | "fallback" = "square";

    if (squareTax === 0 && subtotal > 0) {
      tax = Math.round(subtotal * FALLBACK_TAX_RATE);
      taxSource = "fallback";
      console.log("[calculate] Using fallback tax:", tax, "(", FALLBACK_TAX_RATE * 100, "%)");
    }

    return NextResponse.json({
      subtotal,
      tax,
      total: subtotal + tax,
      taxSource,
    });
  } catch (error) {
    console.error("Calculate order error:", error);
    return NextResponse.json(
      { error: "Failed to calculate order" },
      { status: 500 }
    );
  }
}
