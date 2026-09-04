import { NextResponse } from "next/server";
import crypto from "crypto";
import type { Square } from "square";
import { getSquare, LOCATION_ID, getSquareErrorMessage, toNumber } from "@/lib/square";
import {
  createCateringRequest,
  createCateringItems,
  updateCateringRequestPayment,
  ensureCateringTables,
} from "@/lib/db/catering";
import { createPurchase, updatePurchasePayment, updatePurchaseStatus } from "@/lib/db/purchases";
import { getTurso } from "@/lib/turso";
import { sendCateringOrderEmails } from "@/lib/email";
import { findOrCreateCustomerByEmail } from "@/lib/square-customers";
import {
  buildCateringOrder,
  deriveFromBowls,
  validateBowls,
  type CateringCustomizations,
  type CateringOrderData,
} from "@/lib/catering-order";
import {
  getHoursForDateString,
  isValidCateringTime,
  restaurantLocalToIso,
  formatEventDateTime,
} from "@/lib/restaurant-hours";
import {
  calculateEstimate,
  BASE_PRICE_PER_PERSON,
  PROTEINS,
  MAX_DELIVERY_MILES,
  MIN_GUESTS,
  MAX_ONLINE_PAY_GUESTS,
  ONLINE_PAY_MIN_LEAD_HOURS,
  type SideSelection,
} from "@/lib/catering-pricing";

interface CateringCheckoutRequest {
  eventDate: string;
  eventTime: string; // HH:MM, restaurant local time
  guestCount: number;
  packageType: string;
  customizations?: CateringCustomizations;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  deliveryType: string;
  deliveryAddress?: string;
  deliveryDistance?: number;
  deliveryFee: number;
  totalAmount: number;   // cents: pre-tax estimate computed client-side (verified below)
  expectedTotal: number; // cents: the total shown to the customer (from /api/catering/calculate)
  notes?: string;
  items: { itemName: string; quantity: number; unitPrice?: number; notes?: string }[];
  paymentToken: string;
  optInEmail?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function POST(request: Request) {
  try {
    const body: CateringCheckoutRequest = await request.json();

    // ---- Validation ----
    if (!body.paymentToken) return bad("Payment token required");
    const contactName = body.contactName?.trim();
    const contactEmail = body.contactEmail?.trim();
    const contactPhone = body.contactPhone?.trim();
    if (!contactName || !contactEmail || !contactPhone) return bad("Contact info required");
    if (!EMAIL_RE.test(contactEmail)) return bad("Please enter a valid email address");

    const guestCount = Number(body.guestCount);
    if (!Number.isInteger(guestCount) || guestCount < MIN_GUESTS) {
      return bad(`Minimum ${MIN_GUESTS} guests required`);
    }
    if (guestCount >= MAX_ONLINE_PAY_GUESTS) {
      return bad(`Orders for ${MAX_ONLINE_PAY_GUESTS}+ guests must be submitted as an inquiry`);
    }
    if (body.packageType !== "buffet" && body.packageType !== "premade") {
      return bad("Please select a catering style");
    }
    const packageType = body.packageType as "buffet" | "premade";

    // Pickup/delivery must fall within the restaurant's hours on that date
    const hours = getHoursForDateString(body.eventDate);
    if (!hours) return bad("Please choose a date when we're open");
    if (!isValidCateringTime(body.eventDate, body.eventTime)) {
      return bad(`Please choose a pickup or delivery time between ${hours.open} and ${hours.close}`);
    }
    const scheduledAt = restaurantLocalToIso(body.eventDate, body.eventTime);
    const hoursUntil = (Date.parse(scheduledAt) - Date.now()) / 3_600_000;
    if (hoursUntil < ONLINE_PAY_MIN_LEAD_HOURS) {
      return bad(
        `Online payment requires at least ${ONLINE_PAY_MIN_LEAD_HOURS / 24} days' notice. Please submit an inquiry instead.`
      );
    }

    const isDelivery = body.deliveryType === "delivery";
    if (isDelivery && !body.deliveryAddress) return bad("Delivery address required");
    if (isDelivery && body.deliveryDistance != null && body.deliveryDistance > MAX_DELIVERY_MILES) {
      return bad("Delivery distance exceeds maximum. Please use the email inquiry option.");
    }
    if (!Number.isInteger(body.expectedTotal) || body.expectedTotal <= 0) return bad("Invalid total");

    // Server-side verification of the pre-tax estimate the client computed
    const customizations: CateringCustomizations = body.customizations ?? {};
    const proteins = Array.isArray(customizations.proteins) ? customizations.proteins : [];
    const sides: SideSelection[] = Array.isArray(customizations.sides) ? customizations.sides : [];
    if (packageType === "premade") {
      // Pre-made bowls: every bowl is one base + one protein, and protein totals must match
      const bowlError = validateBowls(customizations.bowls, guestCount);
      if (bowlError) return bad(bowlError);
      const derived = deriveFromBowls(customizations.bowls ?? []);
      const proteinsMatch =
        derived.proteins.every(
          (d) => (proteins.find((p) => p.name === d.name)?.quantity ?? 0) === d.quantity
        ) &&
        proteins.reduce((s, p) => s + p.quantity, 0) ===
          derived.proteins.reduce((s, p) => s + p.quantity, 0);
      if (!proteinsMatch) {
        return bad("Bowl selections do not match the proteins. Please refresh and try again.");
      }
      customizations.bases = derived.bases;
    }
    const serverEstimate = calculateEstimate(
      guestCount,
      proteins,
      isDelivery ? body.deliveryDistance ?? 0 : 0,
      !!customizations.bigUpActive,
      sides,
      packageType
    );
    if (body.totalAmount !== serverEstimate.total) {
      return bad("Price verification failed. Please refresh and try again.");
    }

    const orderData: CateringOrderData & { eventTime: string } = {
      contactName,
      contactEmail,
      contactPhone,
      eventDate: body.eventDate,
      eventTime: body.eventTime,
      guestCount,
      packageType,
      // Line items come from the verified protein selections, not the client's item list
      items: proteins
        .filter((p) => p.quantity > 0)
        .map((p) => ({
          itemName: p.name,
          quantity: p.quantity,
          unitPrice: BASE_PRICE_PER_PERSON + (PROTEINS.find((pr) => pr.name === p.name)?.upcharge ?? 0),
        })),
      deliveryType: isDelivery ? "delivery" : "pickup",
      deliveryAddress: isDelivery ? body.deliveryAddress : undefined,
      deliveryDistance: isDelivery ? body.deliveryDistance : undefined,
      deliveryFee: isDelivery ? serverEstimate.deliveryFee : 0,
      notes: body.notes?.trim() || undefined,
      customizations,
    };

    await ensureCateringTables();

    // 1. Log the request (stays "draft" until the payment succeeds)
    const { id: requestId } = await createCateringRequest({
      status: "draft",
      eventDate: orderData.eventDate,
      eventTime: orderData.eventTime,
      guestCount,
      packageType,
      customizations: JSON.stringify(customizations),
      contactName,
      contactEmail,
      contactPhone,
      deliveryType: orderData.deliveryType,
      deliveryAddress: orderData.deliveryAddress ?? undefined,
      deliveryDistance: orderData.deliveryDistance ?? undefined,
      deliveryFee: orderData.deliveryFee,
      totalAmount: body.expectedTotal,
      notes: orderData.notes ?? undefined,
      fulfillmentType: "payment",
    });
    if (orderData.items.length > 0) {
      await createCateringItems(
        orderData.items.map((item) => ({
          cateringRequestId: requestId,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice ?? undefined,
        }))
      );
    }

    const { id: purchaseId } = await createPurchase({
      type: "catering",
      status: "pending",
      amount: body.expectedTotal,
      customerName: contactName,
      customerEmail: contactEmail,
      customerPhone: contactPhone,
      metadata: JSON.stringify({ cateringRequestId: requestId }),
    });

    const failCheckout = async (reason: string, publicMessage: string, status = 500) => {
      console.error("Catering checkout failed:", reason);
      await updatePurchaseStatus(purchaseId, "failed", reason.slice(0, 500));
      return bad(publicMessage, status);
    };

    const square = getSquare();

    // 2. Attach a Square customer so the POS shows who the order is for (best effort)
    let customerId: string | undefined;
    try {
      customerId = await findOrCreateCustomerByEmail({
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
      });
    } catch (err) {
      console.error("Catering customer lookup failed:", errText(err));
    }

    // 3. Build the itemized order and confirm Square's total matches what the customer saw
    const buildOrder = (forcePickup: boolean) =>
      buildCateringOrder({
        data: orderData,
        locationId: LOCATION_ID,
        source: "catering_checkout",
        customerId,
        referenceId: `catering-${requestId}`,
        forcePickup,
      });
    const order = buildOrder(false);

    let previewTotal: number;
    try {
      const preview = await square.orders.calculate({
        order: { locationId: LOCATION_ID, lineItems: order.lineItems, taxes: order.taxes },
      });
      previewTotal = toNumber(preview.order?.totalMoney?.amount);
    } catch (err) {
      return failCheckout(
        `Calculate failed: ${getSquareErrorMessage(err)}`,
        "Unable to calculate your order total. Please try again."
      );
    }
    if (previewTotal !== body.expectedTotal) {
      return failCheckout(
        `Total mismatch: shown ${body.expectedTotal}, Square ${previewTotal}`,
        "Your order total has changed. Please refresh and try again.",
        400
      );
    }

    // 4. Create the order. Stable idempotency keys prevent duplicates if the request is retried.
    const seed = `${body.paymentToken.slice(0, 16)}-${contactEmail}-${body.eventDate}-${body.eventTime}`;
    const orderKey = crypto.createHash("sha256").update(`order-${seed}`).digest("hex").slice(0, 45);
    const paymentKey = crypto.createHash("sha256").update(`payment-${seed}`).digest("hex").slice(0, 45);

    const createOrder = async (o: Square.Order, key: string) => {
      const res = await square.orders.create({ order: o, idempotencyKey: key });
      const created = res.order;
      if (!created?.id) throw new Error("Square returned no order");
      return { order: created, id: created.id };
    };

    let created: { order: Square.Order; id: string };
    try {
      created = await createOrder(order, orderKey);
    } catch (err) {
      if (order.fulfillments?.[0]?.type !== "DELIVERY") {
        return failCheckout(`Create order failed: ${getSquareErrorMessage(err)}`, getSquareErrorMessage(err));
      }
      // If Square rejects the delivery fulfillment, fall back to a pickup-style ticket
      // (the address is still in the ticket note) rather than losing the sale.
      console.error("Catering DELIVERY fulfillment rejected, retrying as PICKUP:", getSquareErrorMessage(err));
      try {
        created = await createOrder(buildOrder(true), `${orderKey.slice(0, 42)}-pk`);
      } catch (err2) {
        return failCheckout(`Create order failed: ${getSquareErrorMessage(err2)}`, getSquareErrorMessage(err2));
      }
    }
    const squareOrder = created.order;
    const squareOrderId = created.id;

    const chargeAmount = squareOrder.totalMoney?.amount;
    if (chargeAmount == null || toNumber(chargeAmount) !== body.expectedTotal) {
      return failCheckout(
        `Order total ${String(chargeAmount)} != expected ${body.expectedTotal}`,
        "Your order total has changed. Please refresh and try again.",
        400
      );
    }

    // 5. Charge the card for exactly the order total (tax included)
    let payment: Square.Payment | undefined;
    try {
      const paymentResponse = await square.payments.create({
        sourceId: body.paymentToken,
        idempotencyKey: paymentKey,
        amountMoney: { amount: chargeAmount, currency: "USD" },
        orderId: squareOrderId,
        locationId: LOCATION_ID,
        ...(customerId ? { customerId } : {}),
        buyerEmailAddress: contactEmail, // lets Square send its own receipt as well
        autocomplete: true,
        note: `Catering ${formatEventDateTime(body.eventDate, body.eventTime, "short")} - ${contactName}`.slice(0, 500),
      });
      payment = paymentResponse.payment;
    } catch (err) {
      return failCheckout(`Payment failed: ${getSquareErrorMessage(err)}`, getSquareErrorMessage(err));
    }
    if (!payment?.id || payment.status !== "COMPLETED") {
      return failCheckout(
        `Payment not completed: status=${payment?.status ?? "none"}`,
        "Payment was not completed. Please try again."
      );
    }
    const paymentId = payment.id;

    const total = toNumber(chargeAmount);
    const tax = toNumber(squareOrder.totalTaxMoney?.amount);
    const totals = {
      subtotal: total - tax - orderData.deliveryFee,
      deliveryFee: orderData.deliveryFee,
      tax,
      total,
    };
    const receiptUrl = payment.receiptUrl ?? null;

    // 6. Record the sale
    await updateCateringRequestPayment(requestId, squareOrderId, paymentId, total);
    await updatePurchasePayment(purchaseId, paymentId, squareOrderId, total);

    // 7. Confirmation emails + receipt link. Awaited so Vercel doesn't kill them mid-send.
    const postPaymentTasks: { label: string; task: Promise<unknown> }[] = [
      {
        label: "confirmation emails",
        task: sendCateringOrderEmails({
          ...orderData,
          deliveryType: orderData.deliveryType ?? "pickup",
          totals,
          receiptUrl,
        }),
      },
      {
        label: "receipt metadata",
        task: getTurso().execute({
          sql: `UPDATE purchases SET metadata = ? WHERE id = ?`,
          args: [JSON.stringify({ cateringRequestId: requestId, receiptUrl, tax }), purchaseId],
        }),
      },
    ];
    // Add to the email marketing list when the customer opted in
    if (body.optInEmail) {
      postPaymentTasks.push({
        label: "subscriber add",
        task: import("@/lib/db/subscribers").then(({ subscribe }) =>
          subscribe({
            email: contactEmail,
            name: contactName.split(" ")[0] || undefined,
            phone: contactPhone,
            source: "catering",
          })
        ),
      });
    }
    const results = await Promise.allSettled(postPaymentTasks.map((t) => t.task));
    const labels = postPaymentTasks.map((t) => t.label);
    results.forEach((r, i) => {
      if (r.status === "rejected") console.error(`Catering ${labels[i]} failed:`, errText(r.reason));
    });

    return NextResponse.json({
      success: true,
      requestId,
      orderId: squareOrderId,
      paymentId,
      receiptUrl,
      total,
      tax,
    });
  } catch (error) {
    console.error("Catering checkout error:", errText(error));
    return bad("Checkout failed. Please try again.", 500);
  }
}
