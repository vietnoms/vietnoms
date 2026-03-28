import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  createCateringRequest,
  createCateringItems,
  listCateringRequests,
  ensureCateringTables,
} from "@/lib/db/catering";
import { sendCateringInquiryEmails } from "@/lib/email";
import { createDraftInvoice } from "@/lib/square-invoice";

// GET — admin: list all catering requests
export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureCateringTables();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const requests = await listCateringRequests(status);
  return NextResponse.json({ requests });
}

// POST — public: create a catering request (email inquiry path)
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
      status: "submitted",
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

    // Send emails (non-blocking)
    sendCateringInquiryEmails({
      contactName,
      contactEmail,
      contactPhone,
      eventDate,
      guestCount,
      packageType,
      deliveryType: deliveryType || "pickup",
      deliveryAddress,
      totalAmount,
      items: items || [],
      notes,
      customizations: customizations ?? undefined,
    }).catch((err) => console.error("Failed to send catering inquiry emails:", err));

    // Create draft Square invoice (non-blocking) and store invoice ID
    createDraftInvoice({
      contactName,
      contactEmail,
      contactPhone,
      eventDate,
      guestCount,
      packageType,
      totalAmount,
      items: items || [],
      deliveryFee: deliveryFee ?? 0,
      deliveryDistance: deliveryDistance,
      deliveryAddress: deliveryAddress,
      deliveryType: deliveryType || "pickup",
      notes,
      customizations: customizations ?? undefined,
    }).then(async (result) => {
      const { updateCateringInvoiceId } = await import("@/lib/db/catering");
      await updateCateringInvoiceId(id, result.invoiceId);
    }).catch((err) => console.error("Failed to create draft invoice:", err));

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Catering request error:", error);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}
