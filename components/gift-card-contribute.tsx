"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { contributeToGiftCard } from "@/app/gift-cards/actions";
import { formatPrice } from "@/lib/utils";
import { CheckCircle, Heart } from "lucide-react";
import {
  PaymentForm,
  CreditCard,
  ApplePay,
  GooglePay,
  CashAppPay,
} from "react-square-web-payments-sdk";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
const PRESET_CONTRIBUTIONS = [1000, 2500, 5000]; // cents

declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

interface GiftCardContributeProps {
  token: string;
  organizerName: string;
  recipientName: string;
  message: string | null;
  suggestedAmount: number | null;
  totalContributed: number;
  contributorCount: number;
}

type Step = "info" | "payment" | "processing" | "success";

export function GiftCardContribute({
  token,
  organizerName,
  recipientName,
  message,
  suggestedAmount,
  totalContributed,
  contributorCount,
}: GiftCardContributeProps) {
  const presets = suggestedAmount
    ? [suggestedAmount, ...PRESET_CONTRIBUTIONS.filter((a) => a !== suggestedAmount)]
    : PRESET_CONTRIBUTIONS;

  const [step, setStep] = useState<Step>("info");
  const [amount, setAmount] = useState<number>(suggestedAmount || 2500);
  const [customAmount, setCustomAmount] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const effectiveAmount = customAmount
    ? Math.round(parseFloat(customAmount) * 100)
    : amount;

  // Load reCAPTCHA
  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) return;
    if (document.getElementById("recaptcha-v3")) return;
    const script = document.createElement("script");
    script.id = "recaptcha-v3";
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const getRecaptchaToken = useCallback(async (): Promise<string | null> => {
    if (!RECAPTCHA_SITE_KEY) return null;
    try {
      return await new Promise<string>((resolve, reject) => {
        window.grecaptcha.ready(() => {
          window.grecaptcha
            .execute(RECAPTCHA_SITE_KEY, { action: "gift_card_contribute" })
            .then(resolve)
            .catch(reject);
        });
      });
    } catch {
      return null;
    }
  }, []);

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (effectiveAmount < 500) {
      setError("Minimum contribution is $5.00");
      return;
    }
    setStep("payment");
  };

  const handlePaymentSuccess = async (paymentToken: string) => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    setStep("processing");
    setError("");

    const recaptchaToken = await getRecaptchaToken();
    if (!recaptchaToken) {
      setError("Bot verification failed. Please refresh and try again.");
      setStep("payment");
      submittingRef.current = false;
      return;
    }

    const result = await contributeToGiftCard({
      token,
      amount: effectiveAmount,
      contributorName: name.trim(),
      contributorEmail: email.trim(),
      paymentToken,
      recaptchaToken,
      idempotencyKey: idempotencyKeyRef.current,
    });

    if (result.success) {
      setStep("success");
    } else {
      setError(result.error || "Something went wrong.");
      setStep("payment");
      idempotencyKeyRef.current = crypto.randomUUID();
      submittingRef.current = false;
    }
  };

  if (step === "success") {
    return (
      <div className="text-center py-8">
        <Heart className="h-16 w-16 text-brand-red mx-auto" />
        <h2 className="mt-4 font-display text-2xl font-bold">
          Thank You!
        </h2>
        <p className="mt-2 text-gray-600">
          Your {formatPrice(effectiveAmount)} contribution to{" "}
          {recipientName}&apos;s gift card has been added.
        </p>
        <p className="mt-4 text-sm text-gray-400">
          You&apos;ll receive an email confirmation shortly.
        </p>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-brand-red border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-gray-600">Processing your contribution...</p>
        <p className="mt-2 text-sm text-gray-400">Please do not refresh or close this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Context */}
      <div className="bg-gray-50 rounded-lg p-5 space-y-3">
        {message && (
          <p className="text-gray-700 italic">&ldquo;{message}&rdquo;</p>
        )}
        <p className="text-sm text-gray-500">
          Organized by {organizerName} for {recipientName}
        </p>
        {(totalContributed > 0 || contributorCount > 0) && (
          <p className="text-sm text-gray-500">
            {contributorCount} contributor{contributorCount !== 1 ? "s" : ""}{" "}
            &middot; {formatPrice(totalContributed)} raised so far
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {step === "info" && (
        <form onSubmit={handleInfoSubmit} className="space-y-5">
          {/* Amount selection */}
          <div className="space-y-3">
            <Label>Choose an Amount</Label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setAmount(a);
                    setCustomAmount("");
                  }}
                  className={`p-3 rounded-lg border-2 text-sm font-semibold transition-colors ${
                    amount === a && !customAmount
                      ? "border-brand-red bg-red-50 text-brand-red"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {formatPrice(a)}
                  {a === suggestedAmount && (
                    <span className="block text-xs font-normal text-gray-500">
                      Suggested
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  type="number"
                  min="5"
                  max="500"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Custom amount"
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          {/* Contributor info */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contributorName">Your Name</Label>
              <Input
                id="contributorName"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="contributorEmail">Your Email</Label>
              <Input
                id="contributorEmail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full">
            Continue to Payment — {formatPrice(effectiveAmount)}
          </Button>
        </form>
      )}

      {step === "payment" && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold">
            Contribute {formatPrice(effectiveAmount)}
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
                  label: "Gift Card Contribution",
                },
              })}
            >
              <CreditCard />
              <div className="my-3 text-center text-sm text-gray-400">
                or pay with
              </div>
              <div className="space-y-2">
                <ApplePay />
                <GooglePay />
                <CashAppPay />
              </div>
            </PaymentForm>
          ) : (
            <p className="text-sm text-gray-400">
              Payment is not configured.
            </p>
          )}

          <Button
            variant="outline"
            onClick={() => setStep("info")}
            className="w-full"
          >
            Back
          </Button>

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
