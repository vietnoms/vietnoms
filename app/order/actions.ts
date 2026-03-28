"use server";

import { getSquare } from "@/lib/square";

export async function getOrderDetails(orderId: string) {
  const square = getSquare();

  try {
    const response = await square.orders.get({
      orderId,
    });

    const order = response?.order;
    if (!order) {
      return { success: false, error: "Order not found" };
    }

    const lineItems = (order.lineItems || []).map((item: any) => ({
      name: item.name || "",
      quantity: item.quantity || "1",
      totalMoney: item.totalMoney?.amount
        ? Number(item.totalMoney.amount)
        : 0,
    }));

    const total = order.totalMoney?.amount
      ? Number(order.totalMoney.amount)
      : 0;

    const fulfillment = order.fulfillments?.[0];
    const pickupDetails = fulfillment?.pickupDetails;

    return {
      success: true,
      order: {
        id: order.id,
        state: order.state,
        lineItems,
        total,
        pickup: pickupDetails
          ? {
              recipientName:
                pickupDetails.recipient?.displayName || "",
              pickupAt: pickupDetails.pickupAt || null,
              scheduleType: pickupDetails.scheduleType || "ASAP",
              note: pickupDetails.note || null,
            }
          : null,
      },
    };
  } catch (error) {
    console.error("Failed to fetch order details:", error);
    return { success: false, error: "Failed to fetch order details" };
  }
}
