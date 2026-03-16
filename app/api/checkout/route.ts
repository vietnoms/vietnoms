import { NextResponse } from "next/server";
import { getSquare, LOCATION_ID } from "@/lib/square";
import { getSession } from "@/lib/auth";
import { accumulateLoyaltyPoints, getLoyaltyAccount, createReward } from "@/lib/loyalty";
import { createPurchase, updatePurchasePayment, updatePurchaseStatus } from "@/lib/db/purchases";
import { findCustomerByPhone, createSquareCustomer } from "@/lib/square-customers";
import { normalizePhone, sendSms } from "@/lib/twilio";
import { sendOrderReceiptLink } from "@/lib/email";
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
  rewardTierId?: string;
  receiptPreference?: "email" | "text" | "both" | "none";
  optInText?: boolean;
  optInEmail?: boolean;
}

export async function POST(request: Request) {
  try {
    const body: CheckoutRequest = await request.json();
    const { lineItems, customerInfo, paymentToken, rewardTierId, receiptPreference, optInText, optInEmail } = body;

    if (!lineItems?.length) {
      return NextResponse.json({ error: "No items in order" }, { status: 400 });
    }

    if (!paymentToken) {
      return NextResponse.json({ error: "Payment token required" }, { status: 400 });
    }

    const square = getSquare();
    const session = await getSession();

    // Resolve customer ID — from session or by phone lookup/creation
    let customerId = session?.customerId || null;
    if (!customerId && customerInfo.phone) {
      try {
        const normalized = normalizePhone(customerInfo.phone);
        const existing = await findCustomerByPhone(normalized);
        const customer = existing ?? await createSquareCustomer({
          phone: normalized,
          givenName: customerInfo.name.split(" ")[0],
        });
        customerId = customer?.id || null;
      } catch (err) {
        console.error("Customer lookup/create failed:", err);
      }
    }

    // Log purchase attempt
    const { id: purchaseId } = await createPurchase({
      type: "order",
      status: "pending",
      amount: 0,
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
      if (date < new Date()) {
        date.setDate(date.getDate() + 1);
      }
      pickupAt = date.toISOString();
    }

    // Handle reward redemption — create an actual Square reward from the tier
    let rewards: { id: string; rewardTierId: string }[] | undefined;
    if (rewardTierId && customerId) {
      try {
        const loyaltyAccount = await getLoyaltyAccount(customerId);
        if (loyaltyAccount?.id) {
          const reward = await createReward(loyaltyAccount.id, rewardTierId);
          if (reward?.id) {
            rewards = [{ id: reward.id, rewardTierId }];
          }
        }
      } catch (err) {
        console.error("Reward redemption failed, proceeding without discount:", err);
      }
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
        ...(customerId ? { customerId } : {}),
        ...(rewards ? { rewards } : {}),
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
      ...(customerId ? { customerId } : {}),
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

    // Step 4: Post-payment tasks (non-blocking)
    const postPaymentTasks: Promise<unknown>[] = [];

    // Accumulate loyalty points
    if (customerId) {
      const phone = customerInfo.phone ? normalizePhone(customerInfo.phone) : undefined;
      postPaymentTasks.push(
        accumulateLoyaltyPoints(customerId, order.id, phone).catch((err) =>
          console.error("Loyalty points accumulation failed:", err)
        )
      );
    }

    // Update Square customer with email if provided
    if (customerId && customerInfo.email) {
      postPaymentTasks.push(
        square.customers.update({
          customerId,
          emailAddress: customerInfo.email,
        }).catch((err) => console.error("Customer email update failed:", err))
      );
    }

    // Send receipt based on preference
    const receiptUrl = payment.receiptUrl;
    const totalStr = order.totalMoney?.amount
      ? `$${(Number(order.totalMoney.amount) / 100).toFixed(2)}`
      : "";

    if (receiptUrl && receiptPreference && receiptPreference !== "none") {
      if ((receiptPreference === "email" || receiptPreference === "both") && customerInfo.email) {
        postPaymentTasks.push(
          sendOrderReceiptLink({
            customerEmail: customerInfo.email,
            customerName: customerInfo.name,
            receiptUrl,
            orderTotal: totalStr,
          }).catch((err) => console.error("Receipt email failed:", err))
        );
      }
      if ((receiptPreference === "text" || receiptPreference === "both") && customerInfo.phone) {
        postPaymentTasks.push(
          sendSms(
            customerInfo.phone,
            `Thanks for your Vietnoms order! Total: ${totalStr}. View your receipt: ${receiptUrl}`
          ).catch((err) => console.error("Receipt SMS failed:", err))
        );
      }
    }

    // Fire all post-payment tasks without blocking response
    Promise.all(postPaymentTasks).catch(() => {});

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
