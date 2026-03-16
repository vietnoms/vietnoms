"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createGiftCard } from "@/app/gift-cards/actions";
import { formatPrice } from "@/lib/utils";
import { Gift, Mail, MessageSquare } from "lucide-react";
import {
  PaymentForm,
  CreditCard,
  ApplePay,
  GooglePay,
  CashAppPay,
  GiftCard,
} from "react-square-web-payments-sdk";
import { GiftCardInvite } from "@/components/gift-card-invite";

const GIFT_CARDS_ENABLED = true; // Toggle to re-enable gift card purchases
const PRESET_AMOUNTS = [2500, 5000, 7500, 10000]; // in cents
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

type Step = "amount" | "details" | "payment" | "processing" | "success";

declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

export function GiftCardForm() {
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState<number>(5000);
  const [customAmount, setCustomAmount] = useState("");
  const [error, setError] = useState("");
  const [giftCardNumber, setGiftCardNumber] = useState("");
  const [giftCardId, setGiftCardId] = useState("");
  const [sendToSelf, setSendToSelf] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"email" | "sms">("email");
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const [info, setInfo] = useState({
    senderName: "",
    senderEmail: "",
    senderPhone: "",
    recipientName: "",
    recipientEmail: "",
    recipientPhone: "",
    message: "",
  });

  // Load reCAPTCHA v3 script
  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) return;
    if (document.getElementById("recaptcha-v3")) return;
    const script = document.createElement("script");
    script.id = "recaptcha-v3";
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const effectiveAmount = customAmount
    ? Math.round(parseFloat(customAmount) * 100)
    : amount;

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (effectiveAmount < 500) {
      setError("Minimum gift card amount is $5.00");
      return;
    }

    // Validate sender phone
    const senderDigits = info.senderPhone.replace(/\D/g, "");
    if (senderDigits.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    // Validate recipient contact based on delivery method
    if (!sendToSelf) {
      if (deliveryMethod === "sms") {
        const recipientDigits = info.recipientPhone.replace(/\D/g, "");
        if (recipientDigits.length < 10) {
          setError("Please enter a valid recipient phone number.");
          return;
        }
      } else if (!info.recipientEmail) {
        setError("Please enter the recipient's email address.");
        return;
      }
    }

    setStep("payment");
  };

  const getRecaptchaToken = useCallback(async (): Promise<string | null> => {
    if (!RECAPTCHA_SITE_KEY) return null;
    try {
      return await new Promise<string>((resolve, reject) => {
        window.grecaptcha.ready(() => {
          window.grecaptcha
            .execute(RECAPTCHA_SITE_KEY, { action: "gift_card_purchase" })
            .then(resolve)
            .catch(reject);
        });
      });
    } catch {
      return null;
    }
  }, []);

  const handlePaymentSuccess = async (token: string) => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    setStep("processing");
    setError("");

    const recaptchaToken = await getRecaptchaToken();
    if (!recaptchaToken) {
      setError("Bot verification failed. Please refresh the page and try again.");
      setStep("payment");
      submittingRef.current = false;
      return;
    }

    const result = await createGiftCard(
      {
        amount: effectiveAmount,
        senderName: info.senderName.trim(),
        senderEmail: info.senderEmail.trim(),
        senderPhone: info.senderPhone.trim(),
        recipientName: sendToSelf ? info.senderName.trim() : info.recipientName.trim(),
        recipientEmail: sendToSelf ? info.senderEmail.trim() : info.recipientEmail.trim(),
        recipientPhone: sendToSelf ? info.senderPhone.trim() : info.recipientPhone.trim(),
        message: info.message.trim(),
        sendToSelf,
        deliveryMethod,
      },
      token,
      recaptchaToken,
      idempotencyKeyRef.current
    );

    if (result.success) {
      setGiftCardNumber(result.giftCardNumber || "");
      setGiftCardId(result.giftCardId || "");
      setStep("success");
    } else {
      setError(result.error || "Something went wrong.");
      setStep("payment");
      idempotencyKeyRef.current = crypto.randomUUID();
      submittingRef.current = false;
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
      <div className="space-y-8">
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
            {deliveryMethod === "sms"
              ? "The recipient will receive a text message with their gift card details."
              : sendToSelf
              ? "Check your email for your gift card details."
              : "The recipient will receive an email with their gift card details."}
          </p>
        </div>

        {/* Invite Contributors */}
        {giftCardId && giftCardNumber && (
          <GiftCardInvite
            giftCardId={giftCardId}
            giftCardGan={giftCardNumber}
            organizerName={info.senderName}
            organizerEmail={info.senderEmail}
            recipientName={sendToSelf ? info.senderName : info.recipientName}
          />
        )}
      </div>
    );
  }

  // Processing state
  if (step === "processing") {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-brand-red border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-gray-600">Creating your gift card...</p>
        <p className="mt-2 text-sm text-gray-400">Please do not refresh or close this page.</p>
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
          <h2 className="font-display text-xl font-bold text-center text-gray-900">
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

      {/* Step 2: Details */}
      {step === "details" && (
        <form onSubmit={handleDetailsSubmit} className="space-y-5">
          <h2 className="font-display text-xl font-bold text-gray-900">
            Gift Card Details — {formatPrice(effectiveAmount)}
          </h2>

          {/* Send to self vs. someone else */}
          <div>
            <Label className="mb-2 block text-sm font-medium">Who is this for?</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSendToSelf(false)}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  !sendToSelf
                    ? "border-brand-red bg-red-50 text-brand-red"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                Someone else
              </button>
              <button
                type="button"
                onClick={() => setSendToSelf(true)}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  sendToSelf
                    ? "border-brand-red bg-red-50 text-brand-red"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                Myself
              </button>
            </div>
          </div>

          {/* Delivery method */}
          {!sendToSelf && (
            <div>
              <Label className="mb-2 block text-sm font-medium">How should we deliver it?</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("email")}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    deliveryMethod === "email"
                      ? "border-brand-red bg-red-50 text-brand-red"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("sms")}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    deliveryMethod === "sms"
                      ? "border-brand-red bg-red-50 text-brand-red"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  Text Message
                </button>
              </div>
            </div>
          )}

          {/* Sender info (always shown) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {sendToSelf ? "Your Information" : "From"}
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="senderName">Name</Label>
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
                <Label htmlFor="senderEmail">Email</Label>
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
            <div>
              <Label htmlFor="senderPhone">Phone Number</Label>
              <Input
                id="senderPhone"
                type="tel"
                required
                placeholder="(555) 123-4567"
                value={info.senderPhone}
                onChange={(e) =>
                  setInfo((p) => ({ ...p, senderPhone: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Recipient info (only when sending to someone else) */}
          {!sendToSelf && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                To
              </h3>
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
                  {deliveryMethod === "sms" ? (
                    <>
                      <Label htmlFor="recipientPhone">Recipient Phone</Label>
                      <Input
                        id="recipientPhone"
                        type="tel"
                        required
                        placeholder="(555) 123-4567"
                        value={info.recipientPhone}
                        onChange={(e) =>
                          setInfo((p) => ({ ...p, recipientPhone: e.target.value }))
                        }
                      />
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Personal message */}
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
          <h2 className="font-display text-xl font-bold text-gray-900">
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

          {deliveryMethod === "sms" && (
            <p className="text-xs text-gray-400 text-center">
              By selecting Checkout, you confirm that we may send a one-time text
              message to the mobile phone number entered above in order to deliver
              your eGift card. Messages and data rates apply.
            </p>
          )}

          <p className="text-xs text-gray-400 text-center">
            This site is protected by reCAPTCHA and the Google{" "}
            <a href="https://policies.google.com/privacy" className="underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>{" "}
            and{" "}
            <a href="https://policies.google.com/terms" className="underline" target="_blank" rel="noopener noreferrer">Terms of Service</a>{" "}
            apply.
          </p>
        </div>
      )}
    </div>
  );
}
