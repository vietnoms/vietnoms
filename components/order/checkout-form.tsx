"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/utils";
import {
  PaymentForm,
  CreditCard,
  ApplePay,
  GooglePay,
  CashAppPay,
  GiftCard,
} from "react-square-web-payments-sdk";
import { ArrowLeft, Loader2, CheckCircle, Star, Clock } from "lucide-react";
import {
  isOpenNow,
  canAcceptOrders,
  getTodayHoursDisplay,
  generatePickupSlots,
  generatePickupSlotsForDate,
  getOrderCutoff,
  getDateHoursDisplay,
  MAX_ADVANCE_DAYS,
} from "@/lib/restaurant-hours";

type Step = "info" | "review" | "payment" | "processing" | "success";

type ReceiptPreference = "email" | "text" | "both" | "none";

interface LoyaltyData {
  program: {
    rewardTiers: { id: string; name: string; points: number }[];
  } | null;
  account: {
    balance: number;
  } | null;
}

export function CheckoutForm() {
  const { items, total, clearCart } = useCart();
  const { user, setShowLogin } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<string>("");

  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    pickupTime: "",
    pickupDate: "",
    notes: "",
  });

  const [pickupMode, setPickupMode] = useState<"asap" | "scheduled">("asap");
  const [customerLookupDone, setCustomerLookupDone] = useState(false);
  const [customerLookupMsg, setCustomerLookupMsg] = useState("");
  const [lookingUpPhone, setLookingUpPhone] = useState(false);

  // Loyalty state
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [selectedRewardTierId, setSelectedRewardTierId] = useState<string>("");

  // Receipt preference — default "none", user must explicitly choose
  const [receiptPreference, setReceiptPreference] = useState<ReceiptPreference>("none");
  const [receiptDefaultSet, setReceiptDefaultSet] = useState(false);

  // Marketing opt-in
  const [optInText, setOptInText] = useState(false);
  const [optInEmail, setOptInEmail] = useState(false);

  // Hours state
  const [hoursDisplay, setHoursDisplay] = useState<string | null>(null);
  const [restaurantOpen, setRestaurantOpen] = useState(true);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [pickupSlots, setPickupSlots] = useState<{ label: string; value: string }[]>([]);

  // Phone lookup debounce
  const phoneLookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Set initial pickupDate to today
  useEffect(() => {
    if (!customerInfo.pickupDate) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      setCustomerInfo((prev) => ({ ...prev, pickupDate: `${yyyy}-${mm}-${dd}` }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check restaurant hours and regenerate pickup slots
  useEffect(() => {
    const now = new Date();
    setHoursDisplay(getTodayHoursDisplay(now));
    setRestaurantOpen(isOpenNow(now));
    setAcceptingOrders(canAcceptOrders(now));

    if (customerInfo.pickupDate) {
      const [y, m, d] = customerInfo.pickupDate.split("-").map(Number);
      const targetDate = new Date(y, m - 1, d);
      setPickupSlots(generatePickupSlotsForDate(targetDate));
    } else {
      setPickupSlots(generatePickupSlots(now));
    }
  }, [step, customerInfo.pickupDate]);

  // Pre-fill from auth
  useEffect(() => {
    if (user) {
      setCustomerInfo((prev) => ({
        ...prev,
        name:
          prev.name ||
          [user.givenName, user.familyName].filter(Boolean).join(" "),
        phone: prev.phone || user.phone || "",
      }));
      setCustomerLookupDone(true);
    }
  }, [user]);

  // Fetch loyalty data on review step (always — endpoint handles unauthenticated)
  useEffect(() => {
    if (step === "review") {
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

  // Set default receipt preference once when entering review
  useEffect(() => {
    if (step === "review" && !receiptDefaultSet) {
      if (customerInfo.email) {
        setReceiptPreference("email");
      } else if (customerInfo.phone) {
        setReceiptPreference("text");
      }
      setReceiptDefaultSet(true);
    }
  }, [step, customerInfo.email, customerInfo.phone, receiptDefaultSet]);

  // Phone-based customer lookup (debounced)
  const handlePhoneLookup = useCallback(async (phone: string) => {
    if (!phone || phone.replace(/\D/g, "").length < 10) return;
    if (customerLookupDone) return;

    // Clear any pending timer
    if (phoneLookupTimer.current) {
      clearTimeout(phoneLookupTimer.current);
    }

    setLookingUpPhone(true);
    try {
      const res = await fetch("/api/customers/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.found) {
        const name = [data.givenName, data.familyName]
          .filter(Boolean)
          .join(" ");
        setCustomerInfo((prev) => ({
          ...prev,
          name: prev.name || name,
          email: prev.email || data.emailAddress || "",
        }));
        setCustomerLookupMsg(
          `Welcome back${data.givenName ? `, ${data.givenName}` : ""}!`
        );
      }
      setCustomerLookupDone(true);
    } catch {
      // ignore
    } finally {
      setLookingUpPhone(false);
    }
  }, [customerLookupDone]);

  // Debounced phone change handler
  const handlePhoneChange = useCallback((value: string) => {
    setCustomerInfo((prev) => ({ ...prev, phone: value }));
    setCustomerLookupDone(false);
    setCustomerLookupMsg("");

    if (phoneLookupTimer.current) {
      clearTimeout(phoneLookupTimer.current);
    }

    const digits = value.replace(/\D/g, "");
    if (digits.length >= 10) {
      phoneLookupTimer.current = setTimeout(() => {
        handlePhoneLookup(value);
      }, 500);
    }
  }, [handlePhoneLookup]);

  if (items.length === 0 && step !== "success") {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">
          Your cart is empty. Add items to place an order.
        </p>
      </div>
    );
  }

  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID || "";
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "";

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pickupMode === "asap") {
      setCustomerInfo((prev) => ({ ...prev, pickupTime: "" }));
    }
    setStep("review");
  };

  const handlePaymentToken = async (token: {
    status: string;
    token?: string;
    errors?: unknown[];
  }) => {
    if (token.status !== "OK" || !token.token) {
      setError("Payment failed. Please try again.");
      return;
    }

    // Prevent double-submit
    if (submitting) return;
    setSubmitting(true);
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
          customerInfo: {
            ...customerInfo,
            pickupTime:
              pickupMode === "asap" ? "" : customerInfo.pickupTime,
            pickupDate:
              pickupMode === "asap" ? "" : customerInfo.pickupDate,
          },
          paymentToken: token.token,
          rewardTierId: selectedRewardTierId || undefined,
          receiptPreference,
          optInText,
          optInEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Payment failed");
      }

      // Clear cart immediately on success
      clearCart();
      setCompletedOrderId(data.orderId);
      setStep("success");

      setTimeout(() => {
        router.push(`/order/confirmation?orderId=${data.orderId}`);
      }, 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Payment failed. Please try again."
      );
      setStep("payment");
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndex = {
    info: 0,
    review: 1,
    payment: 2,
    processing: 2,
    success: 3,
  };

  // Closed / kitchen closing warning
  const closedMessage = !restaurantOpen
    ? "We're currently closed. Please check back during business hours."
    : !acceptingOrders
      ? "Kitchen is closing soon — orders are no longer accepted."
      : null;

  return (
    <div className="max-w-xl pb-24">
      {/* Hours banner */}
      {hoursDisplay && (
        <div className="flex items-center gap-2 text-sm mb-4 px-3 py-2 bg-surface-alt rounded-lg">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-gray-400">
            Open today: {hoursDisplay}
          </span>
          {!restaurantOpen && (
            <span className="text-red-500 font-medium ml-auto">
              Closed
              <span className="text-gray-400 text-xs font-normal block">Scheduled orders available</span>
            </span>
          )}
          {restaurantOpen && !acceptingOrders && (
            <span className="text-amber-600 font-medium ml-auto">
              Closing soon
            </span>
          )}
        </div>
      )}

      {closedMessage && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-sm">
          <span className="text-red-400">{closedMessage}</span>
          {pickupMode === "asap" && (
            <span className="text-gray-400 block mt-1">
              You can still schedule an order for later.
            </span>
          )}
        </div>
      )}

      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {(["Details", "Review", "Payment"] as const).map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                stepIndex[step] >= i
                  ? "bg-brand-red text-white"
                  : "bg-gray-700 text-gray-400"
              }`}
            >
              {i + 1}
            </div>
            <span className="text-sm text-gray-400 hidden sm:inline">
              {label}
            </span>
            {i < 2 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Customer Info */}
      {step === "info" && (
        <form onSubmit={handleInfoSubmit} className="space-y-4">
          <h2 className="font-display text-xl font-bold">Pickup Details</h2>

          {customerLookupMsg && (
            <div className="p-3 bg-green-900/30 border border-green-800 rounded-lg text-green-400 text-sm">
              {customerLookupMsg}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={customerInfo.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onBlur={(e) => handlePhoneLookup(e.target.value)}
                  placeholder="(408) 555-0123"
                />
                {lookingUpPhone && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                value={customerInfo.name}
                onChange={(e) =>
                  setCustomerInfo((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={customerInfo.email}
                onChange={(e) =>
                  setCustomerInfo((prev) => ({
                    ...prev,
                    email: e.target.value.trim(),
                  }))
                }
                placeholder="your@email.com"
              />
            </div>

            {/* Pickup time toggle */}
            <div>
              <Label>Pickup Time</Label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                    pickupMode === "asap"
                      ? "border-brand-red bg-brand-red/5 text-brand-red"
                      : "border-gray-600 text-gray-300 hover:border-gray-300"
                  }`}
                  onClick={() => setPickupMode("asap")}
                >
                  ASAP
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                    pickupMode === "scheduled"
                      ? "border-brand-red bg-brand-red/5 text-brand-red"
                      : "border-gray-600 text-gray-300 hover:border-gray-300"
                  }`}
                  onClick={() => setPickupMode("scheduled")}
                >
                  Schedule for Later
                </button>
              </div>
              {pickupMode === "asap" && (
                <p className="text-sm text-gray-400 mt-2">
                  Estimated ready in 10-15 minutes
                </p>
              )}
              {pickupMode === "scheduled" && (
                <div className="mt-2 space-y-2">
                  <input
                    type="date"
                    value={customerInfo.pickupDate}
                    onChange={(e) => {
                      setCustomerInfo((prev) => ({
                        ...prev,
                        pickupDate: e.target.value,
                        pickupTime: "",
                      }));
                    }}
                    min={(() => {
                      const d = new Date();
                      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    })()}
                    max={(() => {
                      const d = new Date();
                      d.setDate(d.getDate() + MAX_ADVANCE_DAYS);
                      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    })()}
                    required
                    className="w-full rounded-lg border border-gray-600 bg-surface-alt px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                  {pickupSlots.length > 0 ? (
                    <select
                      value={customerInfo.pickupTime}
                      onChange={(e) =>
                        setCustomerInfo((prev) => ({
                          ...prev,
                          pickupTime: e.target.value,
                        }))
                      }
                      required
                      className="w-full rounded-lg border border-gray-600 bg-surface-alt px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
                    >
                      <option value="">Select a time</option>
                      {pickupSlots.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-gray-400">
                      No available time slots for this date.
                    </p>
                  )}
                </div>
              )}
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

            {/* Marketing opt-in */}
            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optInText}
                  onChange={(e) => setOptInText(e.target.checked)}
                  className="mt-0.5 accent-brand-red"
                />
                <span className="text-sm text-gray-400">
                  Text me updates about specials and events
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optInEmail}
                  onChange={(e) => setOptInEmail(e.target.checked)}
                  className="mt-0.5 accent-brand-red"
                />
                <span className="text-sm text-gray-400">
                  Email me updates about specials and events
                </span>
              </label>
            </div>
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={
              pickupMode === "asap"
                ? !!closedMessage
                : pickupSlots.length === 0 || !customerInfo.pickupTime
            }
          >
            Continue to Review
          </Button>
        </form>
      )}

      {/* Step 2: Review + Loyalty */}
      {step === "review" && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold">Review Order</h2>
          <div className="bg-surface-alt rounded-lg p-4 space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <div>
                  <span>
                    {item.quantity}x {item.menuItem.name}
                  </span>
                  {item.variationName !== "Regular" && (
                    <span className="text-gray-400 ml-1">
                      ({item.variationName})
                    </span>
                  )}
                  {item.modifiers.length > 0 && (
                    <div className="text-xs text-gray-400 ml-4">
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

          <div className="bg-surface-alt rounded-lg p-4 text-sm space-y-1">
            <p>
              <strong>Name:</strong> {customerInfo.name}
            </p>
            {customerInfo.email && (
              <p>
                <strong>Email:</strong> {customerInfo.email}
              </p>
            )}
            <p>
              <strong>Phone:</strong> {customerInfo.phone}
            </p>
            <p>
              <strong>Pickup:</strong>{" "}
              {pickupMode === "asap"
                ? "ASAP (10-15 min)"
                : (() => {
                    if (!customerInfo.pickupTime) return "Scheduled";
                    const [y, mo, d] = customerInfo.pickupDate.split("-").map(Number);
                    const [h, mi] = customerInfo.pickupTime.split(":").map(Number);
                    const dt = new Date(y, mo - 1, d, h, mi);
                    return dt.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    }) +
                      " at " +
                      dt.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      });
                  })()}
            </p>
            {customerInfo.notes && (
              <p>
                <strong>Notes:</strong> {customerInfo.notes}
              </p>
            )}
          </div>

          {/* Receipt preference */}
          <div className="bg-surface-alt rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold">How would you like your receipt?</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "email", label: "Email", show: !!customerInfo.email },
                  { value: "text", label: "Text", show: !!customerInfo.phone },
                  { value: "both", label: "Both", show: !!customerInfo.email && !!customerInfo.phone },
                  { value: "none", label: "No receipt", show: true },
                ] as const
              )
                .filter((opt) => opt.show)
                .map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setReceiptPreference(opt.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      receiptPreference === opt.value
                        ? "border-brand-red bg-brand-red/5 text-brand-red"
                        : "border-gray-600 text-gray-300 hover:border-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
            </div>
          </div>

          {/* Loyalty section — logged in with account */}
          {loyalty?.account && loyalty.program && (
            <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Star className="h-4 w-4 text-yellow-500" />
                Loyalty Points: {loyalty.account.balance}
              </div>
              {loyalty.program.rewardTiers.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">Available rewards:</p>
                  {loyalty.program.rewardTiers
                    .filter(
                      (tier) => loyalty.account!.balance >= tier.points
                    )
                    .map((tier) => (
                      <label
                        key={tier.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                          selectedRewardTierId === tier.id
                            ? "border-yellow-500 bg-yellow-100"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="reward"
                          checked={selectedRewardTierId === tier.id}
                          onChange={() => setSelectedRewardTierId(tier.id)}
                          className="accent-yellow-500"
                        />
                        <span>{tier.name}</span>
                        <span className="text-gray-400 ml-auto">
                          {tier.points} pts
                        </span>
                      </label>
                    ))}
                  {selectedRewardTierId && (
                    <button
                      onClick={() => setSelectedRewardTierId("")}
                      className="text-xs text-gray-400 hover:text-gray-700"
                    >
                      Don&apos;t use a reward
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Loyalty prompt — not logged in but program exists */}
          {loyalty?.program && !loyalty.account && !user && (
            <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Star className="h-4 w-4 text-yellow-500" />
                Earn rewards on this order!
              </div>
              <p className="text-sm text-gray-400">
                Sign in with your phone number to join our rewards program and earn points.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLogin(true)}
                className="border-yellow-700 text-yellow-400 hover:bg-yellow-900/30"
              >
                Sign In
              </Button>
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
          <div className="bg-surface-alt rounded-lg p-4 flex justify-between text-sm font-semibold">
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
              Payment is not configured yet. Please contact us to place your
              order.
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
          <p className="mt-4 text-gray-400">Processing payment...</p>
        </div>
      )}

      {/* Success */}
      {step === "success" && (
        <div className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="mt-4 font-display text-2xl font-bold text-white">
            Payment Successful!
          </h2>
          {completedOrderId && (
            <p className="mt-2 text-sm text-gray-400">
              Order ID:{" "}
              <code className="bg-gray-800 px-2 py-0.5 rounded text-gray-200">
                {completedOrderId}
              </code>
            </p>
          )}
          <p className="mt-2 text-gray-400">Redirecting to confirmation...</p>
        </div>
      )}
    </div>
  );
}
