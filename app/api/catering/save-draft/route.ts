import { NextResponse } from "next/server";
import { createCateringRequest, createCateringItems, ensureCateringTables } from "@/lib/db/catering";

// POST — save partial wizard data as draft for abandoned checkout tracking
export async function POST(request: Request) {
  try {
    await ensureCateringTables();
    const body = await request.json();
    const {
      eventDate,
      guestCount,
      packageType,
      customizations,
      contactName,
      contactEmail,
      contactPhone,
      deliveryType,
      deliveryAddress,
      deliveryDistance,
      deliveryFee,
      totalAmount,
      notes,
      items,
    } = body;

    if (!eventDate || !guestCount || !packageType || !contactName || !contactEmail || !contactPhone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { id } = await createCateringRequest({
      status: "draft",
      eventDate,
      guestCount,
      packageType,
      customizations: customizations ? JSON.stringify(customizations) : undefined,
      contactName,
      contactEmail,
      contactPhone,
      deliveryType: deliveryType || "pickup",
      deliveryAddress,
      deliveryDistance,
      deliveryFee,
      totalAmount,
      notes,
      fulfillmentType: "email",
    });

    if (items?.length) {
      await createCateringItems(
        items.map((item: { itemName: string; quantity: number; unitPrice?: number; notes?: string }) => ({
          cateringRequestId: id,
          ...item,
        }))
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Save draft error:", error);
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }
}
