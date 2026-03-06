import { NextResponse } from "next/server";
import { getSquare, LOCATION_ID } from "@/lib/square";
import {
  createCateringRequest,
  createCateringItems,
  updateCateringRequestPayment,
} from "@/lib/db/catering";
import { sendCateringOrderEmails } from "@/lib/email";
import crypto from "crypto";
import {
  calculateEstimate,
  MAX_DELIVERY_MILES,
  type ProteinSelection,
  type SideSelection,
} from "@/lib/catering-pricing";

interface CateringCheckoutRequest {
  eventDate: string;
  guestCount: number;
  packageType: string;
  customizations?: Record<string, unknown>;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  deliveryType: string;
  deliveryAddress?: string;
  deliveryDistance?: number;
  deliveryFee: number;
  totalAmount: number; // cents
  notes?: string;
  items: { itemName: string; quantity: number; unitPrice?: number; notes?: string }[];
  paymentToken: string;
}

export async function POST(request: Request) {
  try {
    const body: CateringCheckoutRequest = await request.json();

    if (!body.paymentToken) {
      return NextResponse.json({ error: "Payment token required" }, { status: 400 });
    }
    if (!body.contactName || !body.contactEmail || !body.contactPhone) {
      return NextResponse.json({ error: "Contact info required" }, { status: 400 });
    }
    if (!body.totalAmount || body.totalAmount <= 0) {
      return NextResponse.json({ error: "Invalid total" }, { status: 400 });
    }

    // Server-side price verification
    if (body.deliveryDistance != null && body.deliveryDistance > MAX_DELIVERY_MILES) {
      return NextResponse.json(
        { error: "Delivery distance exceeds maximum. Please use the email inquiry option." },
        { status: 400 }
      );
    }

    const proteins: ProteinSelection[] = Array.isArray(body.customizations?.proteins)
      ? (body.customizations!.proteins as ProteinSelection[])
      : [];
    const sides: SideSelection[] = Array.isArray(body.customizations?.sides)
      ? (body.customizations!.sides as SideSelection[])
      : [];

    const serverEstimate = calculateEstimate(
      body.guestCount,
      proteins,
      body.deliveryDistance ?? 0,
      !!body.customizations?.bigUpActive,
      sides,
      body.packageType as "buffet" | "premade" | ""
    );

    if (body.totalAmount !== serverEstimate.total) {
      return NextResponse.json(
        { error: "Price verification failed. Please refresh and try again." },
        { status: 400 }
      );
    }

    // 1. Save to DB as draft first
    const { id } = await createCateringRequest({
      status: "draft",
      eventDate: body.eventDate,
      guestCount: body.guestCount,
      packageType: body.packageType,
      customizations: body.customizations ? JSON.stringify(body.customizations) : undefined,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      deliveryType: body.deliveryType,
      deliveryAddress: body.deliveryAddress,
      deliveryDistance: body.deliveryDistance,
      deliveryFee: body.deliveryFee,
      totalAmount: body.totalAmount,
      notes: body.notes,
      fulfillmentType: "payment",
    });

    if (body.items?.length) {
      await createCateringItems(
        body.items.map((item) => ({ cateringRequestId: id, ...item }))
      );
    }

    // 2. Create Square order with ad-hoc line items
    const square = getSquare();
    const lineItems = [
      {
        name: `Catering - ${body.packageType} (${body.guestCount} guests)`,
        quantity: "1",
        basePriceMoney: {
          amount: BigInt(body.totalAmount),
          currency: "USD" as const,
        },
      },
    ];

    const orderResponse = await square.orders.create({
      order: {
        locationId: LOCATION_ID,
        lineItems,
        fulfillments: [
          {
            type: "PICKUP",
            pickupDetails: {
              recipient: {
                displayName: body.contactName,
                phoneNumber: body.contactPhone,
                emailAddress: body.contactEmail,
              },
              note: `Catering for ${body.guestCount} guests on ${body.eventDate}.${
                body.customizations?.bases
                  ? " Bases: " + (body.customizations.bases as { name: string; quantity: number }[])
                      .filter((b: { quantity: number }) => b.quantity > 0)
                      .map((b: { name: string; quantity: number }) => `${b.name} x${b.quantity}`)
                      .join(", ")
                  : ""
              }${body.notes ? " " + body.notes : ""}`,
              scheduleType: "SCHEDULED",
              pickupAt: new Date(body.eventDate + "T10:00:00").toISOString(),
            },
          },
        ],
      },
      idempotencyKey: crypto.randomUUID(),
    });

    const order = orderResponse?.order;
    if (!order?.id) {
      console.error("Failed to create catering order:", orderResponse);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // 3. Process payment
    const paymentResponse = await square.payments.create({
      sourceId: body.paymentToken,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: {
        amount: order.totalMoney?.amount ?? BigInt(body.totalAmount),
        currency: "USD",
      },
      orderId: order.id,
      locationId: LOCATION_ID,
      autocomplete: true,
    });

    const payment = paymentResponse?.payment;
    if (!payment?.id || payment.status !== "COMPLETED") {
      console.error("Catering payment failed:", paymentResponse);
      return NextResponse.json({ error: "Payment failed" }, { status: 500 });
    }

    // 4. Update DB with payment info
    await updateCateringRequestPayment(id, order.id, payment.id, body.totalAmount);

    // 5. Send emails (non-blocking)
    sendCateringOrderEmails({
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      eventDate: body.eventDate,
      guestCount: body.guestCount,
      packageType: body.packageType,
      deliveryType: body.deliveryType,
      deliveryAddress: body.deliveryAddress,
      totalAmount: body.totalAmount,
      items: body.items || [],
      notes: body.notes,
      customizations: body.customizations ?? undefined,
    }).catch((err) => console.error("Failed to send catering order emails:", err));

    return NextResponse.json({
      success: true,
      requestId: id,
      orderId: order.id,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error("Catering checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
