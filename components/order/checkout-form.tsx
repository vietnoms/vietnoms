"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/utils";
import { PaymentForm, CreditCard } from "react-square-web-payments-sdk";
import { ArrowLeft, Loader2, CheckCircle, Star } from "lucide-react";

type Step = "info" | "review" | "payment" | "processing" | "success";

interface LoyaltyData {
  program: {
    rewardTiers: { id: string; name: string; points: number }[];
  } | null;
  account: {
    balance: number;
  } | null;
}

export function CheckoutForm() {
  const { items, total } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");
  const [error, setError] = useState("");

  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    pickupTime: "",
    notes: "",
  });

  // Loyalty state
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [selectedRewardId, setSelectedRewardId] = useState<string>("");

  // Pre-fill from auth
  useEffect(() => {
    if (user) {
      setCustomerInfo((prev) => ({
        ...prev,
        name: prev.name || [user.givenName, user.familyName].filter(Boolean).join(" "),
        phone: prev.phone || user.phone || "",
      }));
    }
  }, [user]);

  // Fetch loyalty data when logged in and reaching review step
  useEffect(() => {
    if (user && step === "review") {
      fetch("/api/loyalty")
        .then((r) => r.json())
        .then((data) => {
          if (data.program) {
            setLoyalty(data);
          }
        })
        .catch(() => {});
    }
  }, [user, step]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          Your cart is empty. Add items to place an order.
        </p>
      </div>
    );
  }

  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID || "";
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "";

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("review");
  };

  const handlePaymentToken = async (token: { status: string; token?: string; errors?: unknown[] }) => {
    if (token.status !== "OK" || !token.token) {
      setError("Card tokenization failed. Please try again.");
      return;
    }
    setStep("processing");
    setError("");

    try {
      const lineItems = items.map((item) => ({
        catalogObjectId: item.variationId,
        quantity: item.quantity,
        modifiers: item.modifiers.map((m) => ({ catalogObjectId: m.id })),
        note: item.specialInstructions,
      }));

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineItems,
          customerInfo,
          paymentToken: token.token,
          rewardId: selectedRewardId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Payment failed");
      }

      setStep("success");

      // Navigate to confirmation after brief delay
      setTimeout(() => {
        router.push(`/order/confirmation?orderId=${data.orderId}`);
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Payment failed. Please try again."
      );
      setStep("payment");
    }
  };

  const stepIndex = { info: 0, review: 1, payment: 2, processing: 2, success: 3 };

  return (
    <div className="max-w-xl">
      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {(["Details", "Review", "Payment"] as const).map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                stepIndex[step] >= i
                  ? "bg-brand-red text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {i + 1}
            </div>
            <span className="text-sm text-gray-600 hidden sm:inline">
              {label}
            </span>
            {i < 2 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Customer Info */}
      {step === "info" && (
        <form onSubmit={handleInfoSubmit} className="space-y-4">
          <h2 className="font-display text-xl font-bold">Pickup Details</h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                value={customerInfo.name}
                onChange={(e) =>
                  setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={customerInfo.email}
                onChange={(e) =>
                  setCustomerInfo((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="your@email.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                required
                value={customerInfo.phone}
                onChange={(e) =>
                  setCustomerInfo((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                placeholder="(408) 555-0123"
              />
            </div>
            <div>
              <Label htmlFor="pickupTime">Pickup Time (optional)</Label>
              <Input
                id="pickupTime"
                type="time"
                value={customerInfo.pickupTime}
                onChange={(e) =>
                  setCustomerInfo((prev) => ({
                    ...prev,
                    pickupTime: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-gray-400 mt-1">
                Leave blank for ASAP pickup.
              </p>
            </div>
            <div>
              <Label htmlFor="notes">Special Instructions</Label>
              <Textarea
                id="notes"
                value={customerInfo.notes}
                onChange={(e) =>
                  setCustomerInfo((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="Any allergies or special requests?"
                rows={2}
              />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full">
            Continue to Review
          </Button>
        </form>
      )}

      {/* Step 2: Review + Loyalty */}
      {step === "review" && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold">Review Order</h2>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <div>
                  <span>
                    {item.quantity}x {item.menuItem.name}
                  </span>
                  {item.variationName !== "Regular" && (
                    <span className="text-gray-500 ml-1">
                      ({item.variationName})
                    </span>
                  )}
                  {item.modifiers.length > 0 && (
                    <div className="text-xs text-gray-500 ml-4">
                      {item.modifiers.map((m) => m.name).join(", ")}
                    </div>
                  )}
                </div>
                <span>{formatPrice(item.lineTotal)}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            <p className="text-xs text-gray-400">
              Tax will be calculated at payment.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
            <p>
              <strong>Name:</strong> {customerInfo.name}
            </p>
            <p>
              <strong>Email:</strong> {customerInfo.email}
            </p>
            <p>
              <strong>Phone:</strong> {customerInfo.phone}
            </p>
            <p>
              <strong>Pickup:</strong> {customerInfo.pickupTime || "ASAP"}
            </p>
            {customerInfo.notes && (
              <p>
                <strong>Notes:</strong> {customerInfo.notes}
              </p>
            )}
          </div>

          {/* Loyalty section */}
          {loyalty?.account && loyalty.program && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Star className="h-4 w-4 text-yellow-500" />
                Loyalty Points: {loyalty.account.balance}
              </div>
              {loyalty.program.rewardTiers.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-600">
                    Available rewards:
                  </p>
                  {loyalty.program.rewardTiers
                    .filter(
                      (tier) => loyalty.account!.balance >= tier.points
                    )
                    .map((tier) => (
                      <label
                        key={tier.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                          selectedRewardId === tier.id
                            ? "border-yellow-500 bg-yellow-100"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="reward"
                          checked={selectedRewardId === tier.id}
                          onChange={() => setSelectedRewardId(tier.id)}
                          className="accent-yellow-500"
                        />
                        <span>{tier.name}</span>
                        <span className="text-gray-500 ml-auto">
                          {tier.points} pts
                        </span>
                      </label>
                    ))}
                  {selectedRewardId && (
                    <button
                      onClick={() => setSelectedRewardId("")}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Don&apos;t use a reward
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep("info")}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => setStep("payment")} className="flex-1">
              Continue to Payment
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Payment */}
      {step === "payment" && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold">Payment</h2>
          <div className="bg-gray-50 rounded-lg p-4 flex justify-between text-sm font-semibold">
            <span>Order Total</span>
            <span className="text-brand-red">{formatPrice(total)}</span>
          </div>
          <p className="text-xs text-gray-400">
            Tax will be added. Tip can be added after payment.
          </p>

          {appId && locationId ? (
            <PaymentForm
              applicationId={appId}
              locationId={locationId}
              cardTokenizeResponseReceived={handlePaymentToken}
              createPaymentRequest={() => ({
                countryCode: "US",
                currencyCode: "USD",
                total: {
                  amount: (total / 100).toFixed(2),
                  label: "Vietnoms Order",
                },
              })}
            >
              <CreditCard />
            </PaymentForm>
          ) : (
            <p className="text-sm text-gray-500">
              Payment is not configured yet. Please contact us to place your order.
            </p>
          )}

          <Button
            variant="outline"
            onClick={() => setStep("review")}
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Review
          </Button>
        </div>
      )}

      {/* Processing */}
      {step === "processing" && (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-red mx-auto" />
          <p className="mt-4 text-gray-600">Processing payment...</p>
        </div>
      )}

      {/* Success */}
      {step === "success" && (
        <div className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="mt-4 font-display text-2xl font-bold text-brand-black">
            Payment Successful!
          </h2>
          <p className="mt-2 text-gray-600">Redirecting to confirmation...</p>
        </div>
      )}
    </div>
  );
}
