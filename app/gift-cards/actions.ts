"use server";

import { getSquare, LOCATION_ID } from "@/lib/square";
import {
  createPurchase,
  updatePurchasePayment,
  updatePurchaseStatus,
  updatePurchaseGiftCard,
} from "@/lib/db/purchases";
import {
  createContribution,
  createInvite,
  getContributionByToken,
  markInviteContributed,
  getInvitesByContribution,
} from "@/lib/db/contributions";
import {
  sendGiftCardEmails,
  sendContributionInviteEmail,
  sendContributionConfirmationEmails,
} from "@/lib/email";
import { sendSms, normalizePhone } from "@/lib/twilio";
import crypto from "crypto";
import type { GiftCardOrder } from "@/lib/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vietnoms.com";

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.error("RECAPTCHA_SECRET_KEY not configured");
    return false;
  }

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
    });

    const json = await res.json();
    return json.success === true && (json.score ?? 0) >= 0.5;
  } catch (err) {
    console.error("reCAPTCHA verification failed:", err);
    return false;
  }
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatGan(gan: string): string {
  return gan.replace(/(.{4})(?=.)/g, "$1 ");
}

// ---------- Create Gift Card ----------

export async function createGiftCard(
  data: GiftCardOrder,
  paymentToken: string,
  recaptchaToken: string,
  idempotencyKey: string
) {
  // 0. Verify reCAPTCHA
  const captchaValid = await verifyRecaptcha(recaptchaToken);
  if (!captchaValid) {
    return { success: false, error: "Bot verification failed. Please refresh and try again." };
  }

  if (!idempotencyKey || idempotencyKey.length < 20) {
    return { success: false, error: "Invalid request. Please refresh and try again." };
  }

  const square = getSquare();
  const isSelf = data.sendToSelf ?? false;
  const deliveryMethod = data.deliveryMethod ?? "email";

  // If sending to self, use sender info as recipient
  const recipientName = isSelf ? data.senderName : data.recipientName;
  const recipientEmail = isSelf ? data.senderEmail : data.recipientEmail;
  const recipientPhone = isSelf ? data.senderPhone : (data.recipientPhone || "");

  try {
    // Validate amount bounds ($5-$500)
    if (data.amount < 500 || data.amount > 50000) {
      return { success: false, error: "Gift card amount must be between $5 and $500." };
    }

    // Validate delivery contact
    if (deliveryMethod === "sms") {
      const phoneDigits = recipientPhone.replace(/\D/g, "");
      if (phoneDigits.length < 10) {
        return { success: false, error: "A valid phone number is required for text delivery." };
      }
    } else {
      if (!recipientEmail) {
        return { success: false, error: "Recipient email is required for email delivery." };
      }
    }

    // 1. Log the purchase attempt
    const { id: purchaseId } = await createPurchase({
      type: "gift_card",
      status: "pending",
      amount: data.amount,
      customerName: data.senderName,
      customerEmail: data.senderEmail,
      customerPhone: data.senderPhone || undefined,
      metadata: JSON.stringify({
        recipientName,
        recipientEmail,
        recipientPhone,
        message: data.message,
        sendToSelf: isSelf,
        deliveryMethod,
        idempotencyKey,
      }),
    });

    // 2. Create the gift card
    const gcResponse = await square.giftCards.create({
      idempotencyKey: `gc-c-${idempotencyKey}`.slice(0, 45),
      locationId: LOCATION_ID,
      giftCard: { type: "DIGITAL" },
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
      idempotencyKey: `gc-p-${idempotencyKey}`.slice(0, 45),
      amountMoney: {
        amount: BigInt(data.amount),
        currency: "USD",
      },
      locationId: LOCATION_ID,
      buyerEmailAddress: data.senderEmail,
      note: isSelf
        ? `Gift card (self-purchase) for ${data.senderName}`
        : `Gift card for ${recipientName} (${recipientEmail || recipientPhone})`,
    });

    if (!paymentResponse?.payment?.id) {
      await updatePurchaseStatus(purchaseId, "failed", "Payment failed");
      return { success: false, error: "Payment failed." };
    }

    const paymentId = paymentResponse.payment.id;

    // 4. Activate the gift card
    try {
      await square.giftCards.activities.create({
        idempotencyKey: `gc-a-${idempotencyKey}`.slice(0, 45),
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

      try {
        await square.refunds.refundPayment({
          idempotencyKey: `gc-r-${idempotencyKey}`.slice(0, 45),
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

    // 6. Deliver the gift card (non-blocking)
    if (gan) {
      if (deliveryMethod === "sms" && recipientPhone) {
        // Send SMS to recipient
        const ganFormatted = formatGan(gan);
        const amountStr = formatMoney(data.amount);
        const smsBody = isSelf
          ? `Your ${amountStr} Vietnoms gift card is ready!\n\nCard #: ${ganFormatted}\n\nCheck balance: ${SITE_URL}/gift-cards#balance`
          : `${data.senderName} sent you a ${amountStr} Vietnoms gift card!\n\n${data.message ? `"${data.message}"\n\n` : ""}Card #: ${ganFormatted}\n\nCheck balance: ${SITE_URL}/gift-cards#balance`;

        sendSms(recipientPhone, smsBody).catch((err) =>
          console.error("Failed to send gift card SMS:", err)
        );

        // Still send email confirmation to sender + admin
        sendGiftCardEmails({
          senderName: data.senderName,
          senderEmail: data.senderEmail,
          senderPhone: data.senderPhone,
          recipientName,
          recipientEmail: recipientEmail || data.senderEmail,
          amount: data.amount,
          gan,
          message: data.message,
          sendToSelf: isSelf,
        }).catch((err) => console.error("Failed to send gift card emails:", err));
      } else {
        // Email delivery
        sendGiftCardEmails({
          senderName: data.senderName,
          senderEmail: data.senderEmail,
          senderPhone: data.senderPhone,
          recipientName,
          recipientEmail,
          amount: data.amount,
          gan,
          message: data.message,
          sendToSelf: isSelf,
        }).catch((err) => console.error("Failed to send gift card emails:", err));
      }
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

// ---------- Create Contribution Invites ----------

export async function createContributionInvites(data: {
  giftCardId: string;
  giftCardGan: string;
  organizerName: string;
  organizerEmail: string;
  recipientName: string;
  message?: string;
  suggestedAmount?: number;
  inviteeEmails: string[];
}) {
  try {
    if (!data.inviteeEmails.length || data.inviteeEmails.length > 20) {
      return { success: false, error: "Please add between 1 and 20 contributors." };
    }

    // Validate all emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = data.inviteeEmails
      .map((e) => e.trim().toLowerCase())
      .filter((e) => emailRegex.test(e));

    if (validEmails.length === 0) {
      return { success: false, error: "Please enter valid email addresses." };
    }

    // Create the contribution group
    const { id: contributionId, token } = await createContribution({
      giftCardId: data.giftCardId,
      giftCardGan: data.giftCardGan,
      organizerName: data.organizerName,
      organizerEmail: data.organizerEmail,
      recipientName: data.recipientName,
      suggestedAmount: data.suggestedAmount,
      message: data.message,
    });

    // Create invites and send emails
    const contributeUrl = `${SITE_URL}/gift-cards/contribute/${token}`;

    await Promise.all(
      validEmails.map(async (email) => {
        await createInvite(contributionId, email);
        await sendContributionInviteEmail({
          organizerName: data.organizerName,
          recipientName: data.recipientName,
          message: data.message,
          suggestedAmount: data.suggestedAmount,
          contributeUrl,
          inviteeEmail: email,
        });
      })
    );

    return { success: true, token, inviteCount: validEmails.length };
  } catch (error) {
    console.error("Failed to create contribution invites:", error);
    return { success: false, error: "Failed to send invitations." };
  }
}

// ---------- Contribute to Gift Card ----------

export async function contributeToGiftCard(data: {
  token: string;
  amount: number;
  contributorName: string;
  contributorEmail: string;
  paymentToken: string;
  recaptchaToken: string;
  idempotencyKey: string;
}) {
  // Verify reCAPTCHA
  const captchaValid = await verifyRecaptcha(data.recaptchaToken);
  if (!captchaValid) {
    return { success: false, error: "Bot verification failed. Please refresh and try again." };
  }

  if (!data.idempotencyKey || data.idempotencyKey.length < 20) {
    return { success: false, error: "Invalid request. Please refresh and try again." };
  }

  if (data.amount < 500 || data.amount > 50000) {
    return { success: false, error: "Contribution must be between $5 and $500." };
  }

  const square = getSquare();

  try {
    // Look up the contribution
    const contribution = await getContributionByToken(data.token);
    if (!contribution || contribution.status !== "active") {
      return { success: false, error: "This contribution link is no longer active." };
    }

    // Process payment
    const paymentResponse = await square.payments.create({
      sourceId: data.paymentToken,
      idempotencyKey: `gcp-${data.idempotencyKey}`.slice(0, 45),
      amountMoney: {
        amount: BigInt(data.amount),
        currency: "USD",
      },
      locationId: LOCATION_ID,
      buyerEmailAddress: data.contributorEmail,
      note: `Gift card contribution for ${contribution.recipientName} (organized by ${contribution.organizerName})`,
    });

    if (!paymentResponse?.payment?.id) {
      return { success: false, error: "Payment failed." };
    }

    const paymentId = paymentResponse.payment.id;

    // Load funds onto the gift card
    try {
      await square.giftCards.activities.create({
        idempotencyKey: `gcl-${data.idempotencyKey}`.slice(0, 45),
        giftCardActivity: {
          giftCardId: contribution.giftCardId,
          type: "LOAD",
          locationId: LOCATION_ID,
          loadActivityDetails: {
            amountMoney: {
              amount: BigInt(data.amount),
              currency: "USD",
            },
          },
        },
      });
    } catch (loadError) {
      console.error("Gift card LOAD failed, attempting refund:", loadError);

      try {
        await square.refunds.refundPayment({
          idempotencyKey: `gcr-${data.idempotencyKey}`.slice(0, 45),
          paymentId,
          amountMoney: {
            amount: BigInt(data.amount),
            currency: "USD",
          },
        });
      } catch (refundError) {
        console.error("Contribution refund also failed:", refundError);
      }

      return { success: false, error: "Failed to add funds to the gift card. Your payment has been refunded." };
    }

    // Track the contribution
    await markInviteContributed(
      contribution.id,
      data.contributorEmail.toLowerCase(),
      data.amount,
      paymentId
    );

    // Send confirmation emails (non-blocking)
    sendContributionConfirmationEmails({
      contributorName: data.contributorName,
      contributorEmail: data.contributorEmail,
      amount: data.amount,
      recipientName: contribution.recipientName,
      organizerName: contribution.organizerName,
      organizerEmail: contribution.organizerEmail,
    }).catch((err) => console.error("Failed to send contribution confirmation:", err));

    return { success: true };
  } catch (error) {
    console.error("Failed to process contribution:", error);
    return { success: false, error: "Failed to process contribution." };
  }
}
