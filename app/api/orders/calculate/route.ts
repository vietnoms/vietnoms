import { NextResponse } from "next/server";
import { getSquare, LOCATION_ID, toNumber } from "@/lib/square";

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
    const totalTax = toNumber(order?.totalTaxMoney?.amount);
    const totalMoney = toNumber(order?.totalMoney?.amount);

    return NextResponse.json({
      subtotal: totalMoney - totalTax,
      tax: totalTax,
      total: totalMoney,
    });
  } catch (error) {
    console.error("Calculate order error:", error);
    return NextResponse.json(
      { error: "Failed to calculate order" },
      { status: 500 }
    );
  }
}
