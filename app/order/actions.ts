"use server";

import { getSquare, LOCATION_ID } from "@/lib/square";
import crypto from "crypto";

interface LineItem {
  catalogObjectId: string;
  quantity: number;
  modifiers?: { catalogObjectId: string }[];
  note?: string;
}

interface FulfillmentDetails {
  type: "PICKUP";
  pickupDetails: {
    recipientName: string;
    recipientPhone: string;
    recipientEmail: string;
    pickupAt?: string;
    note?: string;
  };
}

export async function createSquareOrder(
  lineItems: LineItem[],
  fulfillment: FulfillmentDetails
) {
  const square = getSquare();

  try {
    const response = await square.orders.create({
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
            type: fulfillment.type,
            pickupDetails: {
              recipient: {
                displayName: fulfillment.pickupDetails.recipientName,
                phoneNumber: fulfillment.pickupDetails.recipientPhone,
                emailAddress: fulfillment.pickupDetails.recipientEmail,
              },
              pickupAt: fulfillment.pickupDetails.pickupAt,
              note: fulfillment.pickupDetails.note,
              scheduleType: fulfillment.pickupDetails.pickupAt ? "SCHEDULED" : "ASAP",
            },
          },
        ],
      },
      idempotencyKey: crypto.randomUUID(),
    });

    return {
      success: true,
      orderId: response?.order?.id,
      totalMoney: response?.order?.totalMoney
        ? Number(response.order.totalMoney.amount)
        : 0,
    };
  } catch (error) {
    console.error("Failed to create Square order:", error);
    return { success: false, error: "Failed to create order" };
  }
}

export async function processPayment(
  sourceId: string,
  orderId: string,
  amountCents: number
) {
  const square = getSquare();

  try {
    const response = await square.payments.create({
      sourceId,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: {
        amount: BigInt(amountCents),
        currency: "USD",
      },
      orderId,
      locationId: LOCATION_ID,
    });

    return {
      success: true,
      paymentId: response?.payment?.id,
      receiptUrl: response?.payment?.receiptUrl,
    };
  } catch (error) {
    console.error("Failed to process payment:", error);
    return { success: false, error: "Payment failed" };
  }
}

export async function calculateOrder(
  lineItems: { catalogObjectId: string; quantity: number }[]
) {
  const square = getSquare();

  try {
    const response = await square.orders.create({
      order: {
        locationId: LOCATION_ID,
        lineItems: lineItems.map((item) => ({
          catalogObjectId: item.catalogObjectId,
          quantity: String(item.quantity),
        })),
      },
      idempotencyKey: crypto.randomUUID(),
    });

    const order = response?.order;
    const total = order?.totalMoney ? Number(order.totalMoney.amount) : 0;
    const tax = order?.totalTaxMoney ? Number(order.totalTaxMoney.amount) : 0;
    return {
      success: true,
      subtotal: total - tax,
      tax,
      total,
    };
  } catch (error) {
    console.error("Failed to calculate order:", error);
    return { success: false, error: "Failed to calculate order" };
  }
}
