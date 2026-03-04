"use server";

import { getSquare, LOCATION_ID } from "@/lib/square";
import crypto from "crypto";
import type { GiftCardOrder } from "@/lib/types";

export async function createGiftCard(
  data: GiftCardOrder,
  paymentToken: string
) {
  const square = getSquare();

  try {
    // 1. Create the gift card
    const gcResponse = await square.giftCards.create({
      idempotencyKey: crypto.randomUUID(),
      locationId: LOCATION_ID,
      giftCard: {
        type: "DIGITAL",
      },
    });

    const giftCardId = gcResponse?.giftCard?.id;
    if (!giftCardId) {
      return { success: false, error: "Failed to create gift card." };
    }

    // 2. Process payment for the gift card amount
    const paymentResponse = await square.payments.create({
      sourceId: paymentToken,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: {
        amount: BigInt(data.amount),
        currency: "USD",
      },
      locationId: LOCATION_ID,
    });

    if (!paymentResponse?.payment?.id) {
      return { success: false, error: "Payment failed." };
    }

    // 3. Activate the gift card with the amount
    await square.giftCards.activities.create({
      idempotencyKey: crypto.randomUUID(),
      giftCardActivity: {
        giftCardId,
        type: "ACTIVATE",
        locationId: LOCATION_ID,
        activateActivityDetails: {
          amountMoney: {
            amount: BigInt(data.amount),
            currency: "USD",
          },
        },
      },
    });

    const gan = gcResponse?.giftCard?.gan;

    return {
      success: true,
      giftCardNumber: gan,
      giftCardId,
    };
  } catch (error) {
    console.error("Failed to create gift card:", error);
    return { success: false, error: "Failed to create gift card." };
  }
}
