import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  getCateringRequest,
  getCateringItems,
  updateCateringInvoiceId,
  ensureCateringTables,
} from "@/lib/db/catering";
import { createDraftInvoice } from "@/lib/square-invoice";
import { getSquare } from "@/lib/square";

// POST — admin: generate Square invoice for a catering request
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureCateringTables();
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const req = await getCateringRequest(id);
  if (!req) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (req.squareInvoiceId) {
    return NextResponse.json(
      { error: "Invoice already exists", invoiceId: req.squareInvoiceId },
      { status: 409 }
    );
  }

  try {
    const items = await getCateringItems(id);
    const customizations = req.customizations ? JSON.parse(req.customizations) : null;

    const result = await createDraftInvoice({
      contactName: req.contactName,
      contactEmail: req.contactEmail,
      contactPhone: req.contactPhone,
      eventDate: req.eventDate,
      guestCount: req.guestCount,
      packageType: req.packageType,
      totalAmount: req.totalAmount ?? 0,
      items: items.map((i) => ({
        itemName: i.itemName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      deliveryFee: req.deliveryFee ?? 0,
      deliveryDistance: req.deliveryDistance,
      deliveryAddress: req.deliveryAddress,
      deliveryType: req.deliveryType,
      notes: req.notes,
      customizations,
    });

    // Store invoice ID on the catering request
    await updateCateringInvoiceId(id, result.invoiceId);

    return NextResponse.json({
      success: true,
      invoiceId: result.invoiceId,
      orderId: result.orderId,
    });
  } catch (error) {
    console.error("Failed to create invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}

// GET — admin: get invoice status from Square
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureCateringTables();
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const req = await getCateringRequest(id);
  if (!req?.squareInvoiceId) {
    return NextResponse.json({ error: "No invoice" }, { status: 404 });
  }

  try {
    const square = getSquare();
    const response = await square.invoices.get({
      invoiceId: req.squareInvoiceId,
    });

    const invoice = response.invoice;
    return NextResponse.json({
      invoiceId: invoice?.id,
      status: invoice?.status,
      publicUrl: invoice?.publicUrl,
      invoiceNumber: invoice?.invoiceNumber,
      paymentRequests: invoice?.paymentRequests?.map((pr) => ({
        totalMoney: pr.totalCompletedAmountMoney
          ? Number(pr.totalCompletedAmountMoney.amount)
          : 0,
        dueDate: pr.dueDate,
      })),
    });
  } catch (error) {
    console.error("Failed to get invoice:", error);
    return NextResponse.json(
      { error: "Failed to get invoice status" },
      { status: 500 }
    );
  }
}
