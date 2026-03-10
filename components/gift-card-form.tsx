"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createGiftCard } from "@/app/gift-cards/actions";
import { formatPrice } from "@/lib/utils";
import { CheckCircle, Gift } from "lucide-react";
import {
  PaymentForm,
  CreditCard,
  ApplePay,
  GooglePay,
  CashAppPay,
  GiftCard,
} from "react-square-web-payments-sdk";

const GIFT_CARDS_ENABLED = false; // Toggle to re-enable gift card purchases
const PRESET_AMOUNTS = [2500, 5000, 7500, 10000]; // in cents

type Step = "amount" | "details" | "payment" | "processing" | "success";

export function GiftCardForm() {
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState<number>(5000);
  const [customAmount, setCustomAmount] = useState("");
  const [error, setError] = useState("");
  const [giftCardNumber, setGiftCardNumber] = useState("");

  const [info, setInfo] = useState({
    senderName: "",
    senderEmail: "",
    recipientName: "",
    recipientEmail: "",
    message: "",
  });

  const effectiveAmount = customAmount
    ? Math.round(parseFloat(customAmount) * 100)
    : amount;

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveAmount < 500) {
      setError("Minimum gift card amount is $5.00");
      return;
    }
    setStep("payment");
  };

  const handlePaymentSuccess = async (token: string) => {
    setStep("processing");
    setError("");

    const result = await createGiftCard(
      {
        amount: effectiveAmount,
        senderName: info.senderName,
        senderEmail: info.senderEmail,
        recipientName: info.recipientName,
        recipientEmail: info.recipientEmail,
        message: info.message,
      },
      token
    );

    if (result.success) {
      setGiftCardNumber(result.giftCardNumber || "");
      setStep("success");
    } else {
      setError(result.error || "Something went wrong.");
      setStep("payment");
    }
  };

  if (!GIFT_CARDS_ENABLED) {
    return (
      <div className="text-center py-8">
        <Gift className="h-16 w-16 text-gray-400 mx-auto" />
        <h2 className="mt-4 font-display text-2xl font-bold">
          Temporarily Unavailable
        </h2>
        <p className="mt-2 text-gray-600">
          Gift card purchases are temporarily unavailable. Please check back
          soon or contact us directly.
        </p>
      </div>
    );
  }

  // Success state
  if (step === "success") {
    return (
      <div className="text-center py-8">
        <Gift className="h-16 w-16 text-brand-red mx-auto" />
        <h2 className="mt-4 font-display text-2xl font-bold">
          Gift Card Purchased!
        </h2>
        <p className="mt-2 text-gray-600">
          A {formatPrice(effectiveAmount)} gift card has been created.
        </p>
        {giftCardNumber && (
          <p className="mt-4 text-sm text-gray-500">
            Gift Card Number:{" "}
            <code className="bg-gray-100 px-2 py-1 rounded font-mono">
              {giftCardNumber}
            </code>
          </p>
        )}
        <p className="mt-4 text-sm text-gray-400">
          The recipient will receive an email with their gift card details.
        </p>
      </div>
    );
  }

  // Processing state
  if (step === "processing") {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-brand-red border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-gray-600">Creating your gift card...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Amount */}
      {step === "amount" && (
        <div className="space-y-6">
          <h2 className="font-display text-xl font-bold text-center">
            Choose an Amount
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {PRESET_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => {
                  setAmount(a);
                  setCustomAmount("");
                }}
                className={`p-4 rounded-lg border-2 text-lg font-semibold transition-colors ${
                  amount === a && !customAmount
                    ? "border-brand-red bg-red-50 text-brand-red"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {formatPrice(a)}
              </button>
            ))}
          </div>

          <div>
            <Label htmlFor="custom">Custom Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                $
              </span>
              <Input
                id="custom"
                type="number"
                min="5"
                max="500"
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter amount"
                className="pl-7"
              />
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={() => setStep("details")}
          >
            Continue — {formatPrice(effectiveAmount)}
          </Button>
        </div>
      )}

      {/* Step 2: Recipient Details */}
      {step === "details" && (
        <form onSubmit={handleDetailsSubmit} className="space-y-4">
          <h2 className="font-display text-xl font-bold">
            Gift Card Details — {formatPrice(effectiveAmount)}
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="senderName">Your Name</Label>
              <Input
                id="senderName"
                required
                value={info.senderName}
                onChange={(e) =>
                  setInfo((p) => ({ ...p, senderName: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="senderEmail">Your Email</Label>
              <Input
                id="senderEmail"
                type="email"
                required
                value={info.senderEmail}
                onChange={(e) =>
                  setInfo((p) => ({ ...p, senderEmail: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="recipientName">Recipient Name</Label>
              <Input
                id="recipientName"
                required
                value={info.recipientName}
                onChange={(e) =>
                  setInfo((p) => ({ ...p, recipientName: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="recipientEmail">Recipient Email</Label>
              <Input
                id="recipientEmail"
                type="email"
                required
                value={info.recipientEmail}
                onChange={(e) =>
                  setInfo((p) => ({ ...p, recipientEmail: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="message">Personal Message (optional)</Label>
            <Textarea
              id="message"
              rows={3}
              value={info.message}
              onChange={(e) =>
                setInfo((p) => ({ ...p, message: e.target.value }))
              }
              placeholder="Enjoy some Vietnamese food on me!"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("amount")}
              className="flex-1"
            >
              Back
            </Button>
            <Button type="submit" className="flex-1">
              Continue to Payment
            </Button>
          </div>
        </form>
      )}

      {/* Step 3: Payment */}
      {step === "payment" && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold">
            Pay {formatPrice(effectiveAmount)}
          </h2>

          {process.env.NEXT_PUBLIC_SQUARE_APP_ID && process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ? (
            <PaymentForm
              applicationId={process.env.NEXT_PUBLIC_SQUARE_APP_ID}
              locationId={process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID}
              cardTokenizeResponseReceived={(token) => {
                if (token.status === "OK" && token.token) {
                  handlePaymentSuccess(token.token);
                } else {
                  setError("Payment failed. Please try again.");
                }
              }}
              createPaymentRequest={() => ({
                countryCode: "US",
                currencyCode: "USD",
                total: {
                  amount: (effectiveAmount / 100).toFixed(2),
                  label: "Vietnoms Gift Card",
                },
              })}
            >
              <CreditCard />
              <div className="my-3 text-center text-sm text-gray-400">
                or pay with
              </div>
              <div className="space-y-2">
                <GiftCard />
                <ApplePay />
                <GooglePay />
                <CashAppPay />
              </div>
            </PaymentForm>
          ) : (
            <p className="text-sm text-gray-400">
              Payment is not configured. Please contact us to purchase gift cards.
            </p>
          )}

          <Button
            variant="outline"
            onClick={() => setStep("details")}
            className="w-full"
          >
            Back
          </Button>
        </div>
      )}
    </div>
  );
}
