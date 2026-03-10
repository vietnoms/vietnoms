"use server";

import { getSquare, LOCATION_ID } from "@/lib/square";
import {
  createPurchase,
  updatePurchasePayment,
  updatePurchaseStatus,
  updatePurchaseGiftCard,
} from "@/lib/db/purchases";
import { sendGiftCardEmails } from "@/lib/email";
import crypto from "crypto";
import type { GiftCardOrder } from "@/lib/types";

export async function createGiftCard(
  data: GiftCardOrder,
  paymentToken: string
) {
  const square = getSquare();

  try {
    // Validate amount bounds ($5–$500)
    if (data.amount < 500 || data.amount > 50000) {
      return { success: false, error: "Gift card amount must be between $5 and $500." };
    }

    // 1. Log the purchase attempt
    const { id: purchaseId } = await createPurchase({
      type: "gift_card",
      status: "pending",
      amount: data.amount,
      customerName: data.senderName,
      customerEmail: data.senderEmail,
      metadata: JSON.stringify({
        recipientName: data.recipientName,
        recipientEmail: data.recipientEmail,
        message: data.message,
      }),
    });

    // 2. Create the gift card
    const gcResponse = await square.giftCards.create({
      idempotencyKey: crypto.randomUUID(),
      locationId: LOCATION_ID,
      giftCard: {
        type: "DIGITAL",
      },
    });

    const giftCardId = gcResponse?.giftCard?.id;
    if (!giftCardId) {
      await updatePurchaseStatus(purchaseId, "failed", "Failed to create gift card in Square");
      return { success: false, error: "Failed to create gift card." };
    }

    const gan = gcResponse?.giftCard?.gan || "";
    await updatePurchaseGiftCard(purchaseId, giftCardId, gan);

    // 3. Process payment
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
      await updatePurchaseStatus(purchaseId, "failed", "Payment failed");
      return { success: false, error: "Payment failed." };
    }

    const paymentId = paymentResponse.payment.id;

    // 4. Activate the gift card
    try {
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
    } catch (activationError) {
      console.error("Gift card activation failed, attempting refund:", activationError);

      // Attempt refund
      try {
        await square.refunds.refundPayment({
          idempotencyKey: crypto.randomUUID(),
          paymentId,
          amountMoney: {
            amount: BigInt(data.amount),
            currency: "USD",
          },
        });
        await updatePurchaseStatus(purchaseId, "refunded", "Activation failed, payment refunded");
      } catch (refundError) {
        console.error("Refund also failed:", refundError);
        await updatePurchaseStatus(
          purchaseId,
          "failed",
          `Activation failed AND refund failed. Payment ID: ${paymentId}`
        );
      }

      return { success: false, error: "Failed to activate gift card. Your payment has been refunded." };
    }

    // 5. Mark purchase as completed
    await updatePurchasePayment(purchaseId, paymentId);

    // 6. Send email receipts (non-blocking)
    if (gan) {
      sendGiftCardEmails({
        senderName: data.senderName,
        senderEmail: data.senderEmail,
        recipientName: data.recipientName,
        recipientEmail: data.recipientEmail,
        amount: data.amount,
        gan,
        message: data.message,
      }).catch((err) => console.error("Failed to send gift card emails:", err));
    }

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
