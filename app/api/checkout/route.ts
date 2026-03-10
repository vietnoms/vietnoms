import { NextResponse } from "next/server";
import { getSquare, LOCATION_ID } from "@/lib/square";
import { getSession } from "@/lib/auth";
import { accumulateLoyaltyPoints } from "@/lib/loyalty";
import { createPurchase, updatePurchasePayment, updatePurchaseStatus } from "@/lib/db/purchases";
import crypto from "crypto";

interface CheckoutLineItem {
  catalogObjectId: string;
  quantity: number;
  modifiers?: { catalogObjectId: string }[];
  note?: string;
}

interface CheckoutRequest {
  lineItems: CheckoutLineItem[];
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    pickupTime?: string;
    pickupDate?: string;
    notes?: string;
  };
  paymentToken: string;
  rewardId?: string;
}

export async function POST(request: Request) {
  try {
    const body: CheckoutRequest = await request.json();
    const { lineItems, customerInfo, paymentToken, rewardId } = body;

    if (!lineItems?.length) {
      return NextResponse.json({ error: "No items in order" }, { status: 400 });
    }

    if (!paymentToken) {
      return NextResponse.json({ error: "Payment token required" }, { status: 400 });
    }

    const square = getSquare();
    const session = await getSession();

    // Log purchase attempt
    const { id: purchaseId } = await createPurchase({
      type: "order",
      status: "pending",
      amount: 0, // Will be updated after order creation
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
    });

    // Build pickup time
    let pickupAt: string | undefined;
    if (customerInfo.pickupTime) {
      let date: Date;
      if (customerInfo.pickupDate) {
        const [year, month, day] = customerInfo.pickupDate.split("-").map(Number);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date();
      }
      const [hours, minutes] = customerInfo.pickupTime.split(":");
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      // Safety fallback: bump to tomorrow if time has passed
      if (date < new Date()) {
        date.setDate(date.getDate() + 1);
      }
      pickupAt = date.toISOString();
    }

    // Step 1: Create the order
    const orderResponse = await square.orders.create({
      order: {
        locationId: LOCATION_ID,
        lineItems: lineItems.map((item) => ({
          catalogObjectId: item.catalogObjectId,
          quantity: String(item.quantity),
          modifiers: item.modifiers?.map((m) => ({
            catalogObjectId: m.catalogObjectId,
          })),
          note: item.note,
        })),
        fulfillments: [
          {
            type: "PICKUP",
            pickupDetails: {
              recipient: {
                displayName: customerInfo.name,
                phoneNumber: customerInfo.phone,
                emailAddress: customerInfo.email,
              },
              pickupAt,
              note: customerInfo.notes || undefined,
              scheduleType: pickupAt ? "SCHEDULED" : "ASAP",
            },
          },
        ],
        ...(session?.customerId ? { customerId: session.customerId } : {}),
        ...(rewardId ? { rewards: [{ id: rewardId, rewardTierId: rewardId }] } : {}),
      },
      idempotencyKey: crypto.randomUUID(),
    });

    const order = orderResponse?.order;
    if (!order?.id) {
      console.error("Failed to create order:", orderResponse);
      await updatePurchaseStatus(purchaseId, "failed", "Failed to create Square order");
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // Step 2: Process payment
    const paymentResponse = await square.payments.create({
      sourceId: paymentToken,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: {
        amount: order.totalMoney?.amount ?? BigInt(0),
        currency: "USD",
      },
      orderId: order.id,
      locationId: LOCATION_ID,
      ...(session?.customerId ? { customerId: session.customerId } : {}),
      autocomplete: true,
    });

    const payment = paymentResponse?.payment;
    if (!payment?.id || payment.status !== "COMPLETED") {
      console.error("Payment failed:", paymentResponse);
      await updatePurchaseStatus(purchaseId, "failed", "Payment failed");
      return NextResponse.json({ error: "Payment failed" }, { status: 500 });
    }

    // Step 3: Log completed purchase
    await updatePurchasePayment(purchaseId, payment.id, order.id);

    // Step 4: Accumulate loyalty points (if authenticated, non-blocking)
    if (session?.customerId) {
      accumulateLoyaltyPoints(session.customerId, order.id).catch((err) =>
        console.error("Loyalty points accumulation failed:", err)
      );
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
