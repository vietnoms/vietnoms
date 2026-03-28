import { NextResponse } from "next/server";
import { getSquare, LOCATION_ID } from "@/lib/square";
import { getSession } from "@/lib/auth";
import { accumulateLoyaltyPoints, getLoyaltyAccount, createReward } from "@/lib/loyalty";
import { createPurchase, updatePurchasePayment, updatePurchaseStatus } from "@/lib/db/purchases";
import { findCustomerByPhone, createSquareCustomer } from "@/lib/square-customers";
import { normalizePhone, sendSms } from "@/lib/twilio";
import { sendOrderReceiptLink } from "@/lib/email";
import { MAX_ADVANCE_DAYS } from "@/lib/restaurant-hours";
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
  tipAmount?: number;
  receiptPreference?: "email" | "text" | "both";
  optInText?: boolean;
  optInEmail?: boolean;
}

function getSquareErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    // Square SDK errors have an `errors` array
    const sqErr = error as { errors?: { detail?: string; code?: string }[] };
    if (sqErr.errors?.length) {
      const first = sqErr.errors[0];
      if (first.code === "CARD_DECLINED") return "Your card was declined. Please try a different payment method.";
      if (first.code === "INSUFFICIENT_FUNDS") return "Insufficient funds. Please try a different payment method.";
      if (first.code === "INVALID_CARD") return "Invalid card details. Please check and try again.";
      if (first.code === "CVV_FAILURE") return "CVV check failed. Please verify your card details.";
      if (first.code === "INVALID_EXPIRATION") return "Card expiration is invalid. Please check and try again.";
      if (first.detail) return first.detail;
    }
    if ("message" in error && typeof (error as { message: string }).message === "string") {
      return (error as { message: string }).message;
    }
  }
  return "An unexpected error occurred. Please try again.";
}

export async function POST(request: Request) {
  try {
    const body: CheckoutRequest = await request.json();
    const { lineItems, customerInfo, paymentToken, rewardTierId, tipAmount, receiptPreference, optInText, optInEmail } = body;

    if (!lineItems?.length) {
      return NextResponse.json({ error: "No items in order" }, { status: 400 });
    }

    if (!paymentToken) {
      return NextResponse.json({ error: "Payment token required" }, { status: 400 });
    }

    // Validate line item quantities
    for (const item of lineItems) {
      if (!item.quantity || item.quantity < 1 || item.quantity > 99) {
        return NextResponse.json({ error: "Invalid item quantity" }, { status: 400 });
      }
    }

    const square = getSquare();

    // Pre-checkout inventory validation — check stock before creating order
    if (LOCATION_ID) {
      try {
        const variationIds = Array.from(new Set(lineItems.map((item) => item.catalogObjectId)));
        const countsPage = await square.inventory.batchGetCounts({
          catalogObjectIds: variationIds,
          locationIds: [LOCATION_ID],
          states: ["IN_STOCK"],
        });

        // Aggregate requested quantities per variation
        const requestedQty = new Map<string, number>();
        for (const item of lineItems) {
          requestedQty.set(
            item.catalogObjectId,
            (requestedQty.get(item.catalogObjectId) || 0) + item.quantity
          );
        }

        // Build available stock map (only tracked variations appear in response)
        const availableStock = new Map<string, number>();
        for await (const count of countsPage) {
          if (count.catalogObjectId) {
            availableStock.set(
              count.catalogObjectId,
              parseFloat(count.quantity || "0")
            );
          }
        }

        // Check each tracked variation
        const overStockItems: string[] = [];
        requestedQty.forEach((requested, varId) => {
          const available = availableStock.get(varId);
          // If variation is not in response, it's untracked (unlimited) — skip
          if (available !== undefined && requested > available) {
            overStockItems.push(
              `requested ${requested} but only ${Math.max(0, Math.floor(available))} available`
            );
          }
        });

        if (overStockItems.length > 0) {
          return NextResponse.json(
            { error: `Insufficient stock: ${overStockItems.join("; ")}. Please reduce quantities.` },
            { status: 400 }
          );
        }
      } catch (invErr) {
        // Fail-open: if inventory API is down, proceed — Square will reject at order creation if truly out
        console.warn("Pre-checkout inventory check failed:", invErr);
      }
    }

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

    // Validate and build pickup time (restaurant is in America/Los_Angeles)
    const RESTAURANT_TZ = "America/Los_Angeles";
    let pickupAt: string | undefined;
    if (customerInfo.pickupTime) {
      const dateStr = customerInfo.pickupDate || new Date().toLocaleDateString("en-CA", { timeZone: RESTAURANT_TZ });
      const [year, month, day] = dateStr.split("-").map(Number);

      // Backend validation: pickup date must be within allowed range
      const nowInTz = new Date(new Date().toLocaleString("en-US", { timeZone: RESTAURANT_TZ }));
      const todayInTz = new Date(nowInTz.getFullYear(), nowInTz.getMonth(), nowInTz.getDate());
      const requestedDate = new Date(year, month - 1, day);
      const maxDate = new Date(todayInTz);
      maxDate.setDate(maxDate.getDate() + MAX_ADVANCE_DAYS);
      if (requestedDate < todayInTz) {
        return NextResponse.json({ error: "Pickup date cannot be in the past" }, { status: 400 });
      }
      if (requestedDate > maxDate) {
        return NextResponse.json({ error: `Pickup date cannot be more than ${MAX_ADVANCE_DAYS} days in advance` }, { status: 400 });
      }

      // Build the pickup time in the restaurant's timezone, then convert to UTC
      // Determine the UTC offset for this specific date in the restaurant timezone
      const localIso = `${dateStr}T${customerInfo.pickupTime}:00`;
      const offsetParts = new Intl.DateTimeFormat("en-US", {
        timeZone: RESTAURANT_TZ,
        timeZoneName: "shortOffset",
      }).formatToParts(new Date(localIso));
      const gmtOffset = offsetParts.find((p) => p.type === "timeZoneName")?.value || "GMT-7";
      // Convert "GMT-7" → "-07:00", "GMT-8" → "-08:00"
      const offsetMatch = gmtOffset.match(/GMT([+-])(\d+)/);
      const tzOffset = offsetMatch
        ? `${offsetMatch[1]}${offsetMatch[2].padStart(2, "0")}:00`
        : "-07:00";
      const pickupDate = new Date(`${localIso}${tzOffset}`);

      // Reject pickup times in the past
      if (pickupDate < new Date()) {
        return NextResponse.json({ error: "Pickup time has already passed. Please select a later time." }, { status: 400 });
      }
      pickupAt = pickupDate.toISOString();
    }

    // Generate stable idempotency keys from request data to prevent duplicates on retry
    const idempotencySeed = `${customerInfo.phone}-${customerInfo.name}-${paymentToken.slice(0, 16)}-${lineItems.length}`;
    const orderIdempotencyKey = crypto.createHash("sha256").update(`order-${idempotencySeed}`).digest("hex").slice(0, 45);
    const paymentIdempotencyKey = crypto.createHash("sha256").update(`payment-${idempotencySeed}`).digest("hex").slice(0, 45);

    // Log purchase attempt
    const { id: purchaseId } = await createPurchase({
      type: "order",
      status: "pending",
      amount: 0,
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
    });

    // Step 1: Create the order (WITHOUT reward — reward is applied after payment)
    let orderResponse;
    try {
      orderResponse = await square.orders.create({
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
          pricingOptions: { autoApplyTaxes: true },
          ...(customerId ? { customerId } : {}),
        },
        idempotencyKey: orderIdempotencyKey,
      });
    } catch (err) {
      console.error("Failed to create order:", err);
      await updatePurchaseStatus(purchaseId, "failed", "Failed to create Square order");
      return NextResponse.json({ error: getSquareErrorMessage(err) }, { status: 500 });
    }

    const order = orderResponse?.order;
    if (!order?.id) {
      console.error("Failed to create order:", orderResponse);
      await updatePurchaseStatus(purchaseId, "failed", "Failed to create Square order");
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // Step 2: Process payment
    let paymentResponse;
    try {
      paymentResponse = await square.payments.create({
        sourceId: paymentToken,
        idempotencyKey: paymentIdempotencyKey,
        amountMoney: {
          amount: order.totalMoney?.amount ?? BigInt(0),
          currency: "USD",
        },
        ...(tipAmount ? {
          tipMoney: { amount: BigInt(tipAmount), currency: "USD" },
        } : {}),
        orderId: order.id,
        locationId: LOCATION_ID,
        ...(customerId ? { customerId } : {}),
        autocomplete: true,
      });
    } catch (err) {
      console.error("Payment failed:", err);
      await updatePurchaseStatus(purchaseId, "failed", getSquareErrorMessage(err));
      return NextResponse.json({ error: getSquareErrorMessage(err) }, { status: 500 });
    }

    const payment = paymentResponse?.payment;
    if (!payment?.id || payment.status !== "COMPLETED") {
      console.error("Payment failed:", paymentResponse);
      await updatePurchaseStatus(purchaseId, "failed", "Payment not completed");
      return NextResponse.json({ error: "Payment was not completed. Please try again." }, { status: 500 });
    }

    // Step 3: Log completed purchase with actual amount
    const totalAmount = Number(order.totalMoney?.amount ?? 0);
    await updatePurchasePayment(purchaseId, payment.id, order.id, totalAmount);

    // Step 4: Post-payment tasks (non-blocking)
    const postPaymentTasks: Promise<unknown>[] = [];

    // Apply reward AFTER payment succeeds (so points aren't lost on payment failure)
    if (rewardTierId && customerId) {
      postPaymentTasks.push(
        (async () => {
          try {
            const loyaltyAccount = await getLoyaltyAccount(customerId!);
            if (loyaltyAccount?.id) {
              const reward = await createReward(loyaltyAccount.id, rewardTierId);
              if (reward?.id) {
                // Update the order to apply the reward discount
                await square.orders.update({
                  orderId: order.id!,
                  order: {
                    locationId: LOCATION_ID,
                    version: order.version,
                    rewards: [{ id: reward.id, rewardTierId }],
                  },
                });
              }
            }
          } catch (err) {
            console.error("Post-payment reward application failed:", err);
          }
        })()
      );
    }

    // Accumulate loyalty points (auto-enrolls new customers if phone is available)
    if (customerId) {
      postPaymentTasks.push(
        accumulateLoyaltyPoints(customerId, order.id, customerInfo.phone).catch((err) =>
          console.error("Loyalty points accumulation failed:", err)
        )
      );
    }

    // Update Square customer with email and name if provided
    if (customerId && (customerInfo.email || customerInfo.name)) {
      const nameParts = customerInfo.name?.includes(" ")
        ? {
            givenName: customerInfo.name.split(" ")[0],
            familyName: customerInfo.name.split(" ").slice(1).join(" "),
          }
        : {};
      postPaymentTasks.push(
        square.customers.update({
          customerId,
          ...(customerInfo.email ? { emailAddress: customerInfo.email } : {}),
          ...nameParts,
        }).catch((err) => console.error("Customer update failed:", err))
      );
    }

    // Store SMS/email consent in local database
    if (customerId && (optInText || optInEmail)) {
      postPaymentTasks.push(
        (async () => {
          const { upsertCustomer } = await import("@/lib/db/customers");
          await upsertCustomer({
            id: customerId!,
            phone: customerInfo.phone,
            givenName: customerInfo.name.split(" ")[0],
            familyName: customerInfo.name.split(" ").slice(1).join(" ") || undefined,
            email: customerInfo.email || undefined,
            smsOptIn: !!optInText,
            emailOptIn: !!optInEmail,
          });
        })().catch((err) => console.error("Consent storage failed:", err))
      );
    }

    // Send receipt based on preference
    const receiptUrl = payment.receiptUrl;
    const totalStr = order.totalMoney?.amount
      ? `$${(Number(order.totalMoney.amount) / 100).toFixed(2)}`
      : "";

    if (receiptUrl) {
      // Always send email receipt when email is provided
      if (customerInfo.email) {
        postPaymentTasks.push(
          sendOrderReceiptLink({
            customerEmail: customerInfo.email,
            customerName: customerInfo.name,
            receiptUrl,
            orderTotal: totalStr,
          }).catch((err) => console.error("Receipt email failed:", err))
        );
      }
      // Send text receipt if preference includes text
      if ((receiptPreference === "text" || receiptPreference === "both") && customerInfo.phone) {
        postPaymentTasks.push(
          sendSms(
            customerInfo.phone,
            `Thanks for your Vietnoms order! Total: ${totalStr}. View your receipt: ${receiptUrl}`
          ).then((result) => {
            if (!result.success) console.error("Receipt SMS failed:", result.error);
          }).catch((err) => console.error("Receipt SMS error:", err))
        );
      }
    }

    // Await post-payment tasks before returning (prevents Vercel from killing in-flight tasks)
    await Promise.all(postPaymentTasks).catch((err) =>
      console.error("Post-payment tasks error:", err)
    );

    // Store receipt URL and tip in purchase metadata
    {
      const meta: Record<string, unknown> = {};
      if (receiptUrl) meta.receiptUrl = receiptUrl;
      if (tipAmount) meta.tipAmount = tipAmount;
      if (Object.keys(meta).length > 0) {
        const db = (await import("@/lib/turso")).getTurso();
        await db.execute({
          sql: `UPDATE purchases SET metadata = ? WHERE id = ?`,
          args: [JSON.stringify(meta), purchaseId],
        }).catch((err) => console.error("Failed to store purchase metadata:", err));
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentId: payment.id,
      receiptUrl: receiptUrl || null,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: getSquareErrorMessage(error) }, { status: 500 });
  }
}
