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
import { ArrowLeft, Loader2, CheckCircle, Star, Clock, ShieldCheck } from "lucide-react";
import {
  isOpenNow,
  canAcceptOrders,
  getTodayHoursDisplay,
  generatePickupSlots,
  generatePickupSlotsForDate,
  MAX_ADVANCE_DAYS,
} from "@/lib/restaurant-hours";

type Step = "info" | "payment" | "processing" | "success";

type ReceiptPreference = "email" | "text" | "both";

interface LoyaltyData {
  program: {
    rewardTiers: { id: string; name: string; points: number }[];
  } | null;
  account: {
    balance: number;
  } | null;
}

const TIP_PERCENT_PRESETS = [15, 20, 25];

/** Format phone digits as (XXX) XXX-XXXX for display */
function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, "");
  // Strip leading country code 1 for display
  const local = digits.startsWith("1") && digits.length > 10 ? digits.slice(1) : digits;
  if (local.length <= 3) return local;
  if (local.length <= 6) return `(${local.slice(0, 3)}) ${local.slice(3)}`;
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6, 10)}`;
}

export function CheckoutForm() {
  const { items, total, clearCart } = useCart();
  const { user, refreshSession } = useAuth();
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

  // Inline OTP verification state
  const [otpStep, setOtpStep] = useState<"idle" | "sending" | "sent" | "verifying" | "verified">("idle");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Loyalty state
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [selectedRewardTierId, setSelectedRewardTierId] = useState<string>("");

  // Receipt preference — default "text" (phone is always required)
  const [receiptPreference, setReceiptPreference] = useState<ReceiptPreference>("text");

  // Marketing opt-in
  const [optInText, setOptInText] = useState(false);
  const [optInEmail, setOptInEmail] = useState(false);

  // Hours state
  const [hoursDisplay, setHoursDisplay] = useState<string | null>(null);
  const [restaurantOpen, setRestaurantOpen] = useState(true);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [pickupSlots, setPickupSlots] = useState<{ label: string; value: string }[]>([]);

  // Tax/tip state
  const [orderTotals, setOrderTotals] = useState<{ subtotal: number; tax: number; total: number } | null>(null);
  const [calculatingTotals, setCalculatingTotals] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [tipPercent, setTipPercent] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [tipMode, setTipMode] = useState<"preset" | "custom">("preset");

  // Phone lookup debounce
  const phoneLookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // OTP cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setTimeout(() => setOtpCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);

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
      setOtpStep("verified");
    }
  }, [user]);

  // Fetch loyalty data when entering payment step or after OTP verification
  const fetchLoyalty = useCallback(() => {
    fetch("/api/loyalty")
      .then((r) => r.json())
      .then((data) => {
        if (data.program) {
          setLoyalty(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (step === "payment") {
      fetchLoyalty();
    }
  }, [step, user, fetchLoyalty]);

  // Calculate order totals (tax) when entering payment step
  useEffect(() => {
    if (step === "payment" && !orderTotals && items.length > 0) {
      setCalculatingTotals(true);
      const lineItemsPayload = items.map((item) => ({
        catalogObjectId: item.variationId,
        quantity: item.quantity,
        modifiers: item.modifiers.map((m) => ({ catalogObjectId: m.id })),
      }));
      fetch("/api/orders/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItems: lineItemsPayload }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.total != null) setOrderTotals(data);
        })
        .catch(() => {})
        .finally(() => setCalculatingTotals(false));
    }
  }, [step, orderTotals, items]);

  // Recalculate tip when orderTotals load (for percentage-based tips)
  useEffect(() => {
    if (tipMode === "preset" && tipPercent != null) {
      const base = orderTotals?.subtotal ?? total;
      setTipAmount(Math.round(base * tipPercent / 100));
    }
  }, [orderTotals, total, tipMode, tipPercent]);

  // Set default receipt preference based on available contact info
  useEffect(() => {
    if (customerInfo.email && receiptPreference === "text") {
      setReceiptPreference("email");
    }
  }, [customerInfo.email, receiptPreference]);

  // Phone-based customer lookup (debounced)
  const handlePhoneLookup = useCallback(async (phone: string) => {
    if (!phone || phone.replace(/\D/g, "").length < 10) return;
    if (customerLookupDone) return;

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

  // Debounced phone change handler with auto-formatting
  const handlePhoneChange = useCallback((value: string) => {
    const formatted = formatPhoneDisplay(value);
    setCustomerInfo((prev) => ({ ...prev, phone: formatted }));
    setCustomerLookupDone(false);
    setCustomerLookupMsg("");
    setOtpStep("idle");
    setOtpCode("");
    setOtpError("");

    if (phoneLookupTimer.current) {
      clearTimeout(phoneLookupTimer.current);
    }

    const digits = value.replace(/\D/g, "");
    if (digits.length >= 10) {
      phoneLookupTimer.current = setTimeout(() => {
        handlePhoneLookup(formatted);
      }, 500);
    }
  }, [handlePhoneLookup]);

  // Inline OTP handlers
  const handleSendOTP = useCallback(async () => {
    setOtpError("");
    setOtpStep("sending");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customerInfo.phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send code");
      }
      setOtpStep("sent");
      setOtpCooldown(30);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Failed to send code");
      setOtpStep("idle");
    }
  }, [customerInfo.phone]);

  const handleVerifyInlineOTP = useCallback(async () => {
    setOtpError("");
    setOtpStep("verifying");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customerInfo.phone, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid code");
      }
      setOtpStep("verified");
      await refreshSession();
      // Pre-fill from verified customer data
      if (data.user) {
        const name = [data.user.givenName, data.user.familyName].filter(Boolean).join(" ");
        setCustomerInfo((prev) => ({
          ...prev,
          name: prev.name || name,
        }));
      }
      setCustomerLookupMsg("Phone verified! You'll earn rewards on this order.");
      // Fetch loyalty data now that user is authenticated
      fetchLoyalty();
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Verification failed");
      setOtpStep("sent");
    }
  }, [customerInfo.phone, otpCode, refreshSession, fetchLoyalty]);

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
    setOrderTotals(null); // Reset so tax is recalculated
    setStep("payment");
  };

  const finalTotal = (orderTotals?.total ?? total) + tipAmount;

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
          tipAmount: tipAmount || undefined,
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
    payment: 1,
    processing: 1,
    success: 2,
  };

  // Closed / kitchen closing warning
  const closedMessage = !restaurantOpen
    ? "We're currently closed. Please check back during business hours."
    : !acceptingOrders
      ? "Kitchen is closing soon — orders are no longer accepted."
      : null;

  const phoneDigits = customerInfo.phone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length >= 10;
  const isVerified = otpStep === "verified" || !!user;

  // Format pickup display
  const pickupDisplay = pickupMode === "asap"
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
      })();

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
        {(["Details", "Payment"] as const).map((label, i) => (
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
            {i < 1 && <div className="w-8 h-px bg-gray-300" />}
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
            {/* Phone with inline OTP */}
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
                {isVerified && (
                  <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
              </div>

              {/* Inline OTP verification */}
              {phoneValid && !isVerified && (
                <div className="mt-2 space-y-2">
                  {otpError && (
                    <p className="text-xs text-red-400">{otpError}</p>
                  )}

                  {(otpStep === "idle" || otpStep === "sending") && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSendOTP}
                        disabled={otpStep === "sending" || otpCooldown > 0}
                        className="border-brand-red text-brand-red hover:bg-brand-red/10"
                      >
                        {otpStep === "sending" ? (
                          <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Sending...</>
                        ) : otpCooldown > 0 ? (
                          `Resend in ${otpCooldown}s`
                        ) : (
                          "Verify Phone"
                        )}
                      </Button>
                      <span className="text-xs text-gray-400">
                        Enter your phone number to receive your receipt and earn reward points on your order
                      </span>
                    </div>
                  )}

                  {(otpStep === "sent" || otpStep === "verifying") && (
                    <div className="bg-surface-alt rounded-lg p-3 space-y-2">
                      <p className="text-xs text-gray-400">
                        We sent a 6-digit code to {customerInfo.phone}
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="123456"
                          className="flex-1"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleVerifyInlineOTP}
                          disabled={otpCode.length < 6 || otpStep === "verifying"}
                        >
                          {otpStep === "verifying" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Verify"
                          )}
                        </Button>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <button
                          type="button"
                          onClick={handleSendOTP}
                          disabled={otpCooldown > 0}
                          className="text-gray-400 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend code"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setOtpStep("idle"); setOtpCode(""); setOtpError(""); }}
                          className="text-gray-400 hover:text-gray-300"
                        >
                          Different number
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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

            {/* Receipt preference */}
            <div>
              <Label>Receipt</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {(
                  [
                    { value: "email" as const, label: "Email", show: !!customerInfo.email },
                    { value: "text" as const, label: "Text", show: !!customerInfo.phone },
                    { value: "both" as const, label: "Both", show: !!customerInfo.email && !!customerInfo.phone },
                  ]
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
                  Opt-in to receive promos and special deals via text message
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
                  Opt-in to receive promos and special deals via e-mail
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
            Continue to Payment
          </Button>
        </form>
      )}

      {/* Step 2: Payment (merged review + payment) */}
      {step === "payment" && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold">Review & Pay</h2>

          {/* Compact contact/pickup summary */}
          <div className="bg-surface-alt rounded-lg p-3 text-sm flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="font-medium">{customerInfo.name}</p>
              <p className="text-gray-400">{customerInfo.phone}</p>
              {customerInfo.email && (
                <p className="text-gray-400">{customerInfo.email}</p>
              )}
              <p className="text-gray-400">Pickup: {pickupDisplay}</p>
              {customerInfo.notes && (
                <p className="text-gray-400 text-xs">Note: {customerInfo.notes}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setStep("info")}
              className="text-xs text-brand-red hover:underline shrink-0 ml-3"
            >
              Edit
            </button>
          </div>

          {/* Full cart summary */}
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
                <span className="shrink-0 ml-2">{formatPrice(item.lineTotal)}</span>
              </div>
            ))}
          </div>

          {/* Loyalty section — show if logged in with account */}
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
                            ? "border-yellow-500 bg-yellow-900/30"
                            : "border-gray-700 hover:border-gray-500"
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
                      className="text-xs text-gray-400 hover:text-gray-300"
                    >
                      Don&apos;t use a reward
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Price breakdown */}
          <div className="bg-surface-alt rounded-lg p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Subtotal</span>
              <span>{formatPrice(orderTotals?.subtotal ?? total)}</span>
            </div>
            {orderTotals ? (
              <div className="flex justify-between">
                <span className="text-gray-400">Tax</span>
                <span>{formatPrice(orderTotals.tax)}</span>
              </div>
            ) : calculatingTotals ? (
              <div className="flex justify-between text-gray-400">
                <span>Tax</span>
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <div className="flex justify-between text-gray-400">
                <span>Tax</span>
                <span>--</span>
              </div>
            )}
            {tipAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Tip</span>
                <span>{formatPrice(tipAmount)}</span>
              </div>
            )}
            <div className="border-t border-gray-700 pt-1.5 mt-1.5 flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-brand-red">{formatPrice(finalTotal)}</span>
            </div>
          </div>

          {/* Tip selector */}
          <div>
            <Label>Add a Tip</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              <button
                type="button"
                onClick={() => {
                  setTipAmount(0);
                  setTipPercent(null);
                  setTipMode("preset");
                  setCustomTip("");
                }}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  tipMode === "preset" && tipPercent === null && tipAmount === 0
                    ? "border-brand-red bg-brand-red/5 text-brand-red"
                    : "border-gray-600 text-gray-300 hover:border-gray-300"
                }`}
              >
                No tip
              </button>
              {TIP_PERCENT_PRESETS.map((pct) => {
                const tipBase = orderTotals?.subtotal ?? total;
                const computed = Math.round(tipBase * pct / 100);
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setTipPercent(pct);
                      setTipAmount(computed);
                      setTipMode("preset");
                      setCustomTip("");
                    }}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      tipMode === "preset" && tipPercent === pct
                        ? "border-brand-red bg-brand-red/5 text-brand-red"
                        : "border-gray-600 text-gray-300 hover:border-gray-300"
                    }`}
                  >
                    <span>{pct}%</span>
                    <span className="block text-xs opacity-70">{formatPrice(computed)}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setTipMode("custom");
                  setTipPercent(null);
                  setTipAmount(0);
                }}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  tipMode === "custom"
                    ? "border-brand-red bg-brand-red/5 text-brand-red"
                    : "border-gray-600 text-gray-300 hover:border-gray-300"
                }`}
              >
                Custom
              </button>
            </div>
            {tipMode === "custom" && (
              <div className="mt-2 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customTip}
                  onChange={(e) => {
                    setCustomTip(e.target.value);
                    const cents = Math.round(parseFloat(e.target.value || "0") * 100);
                    setTipAmount(isNaN(cents) ? 0 : Math.max(0, cents));
                  }}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            )}
          </div>

          {/* Payment form */}
          {appId && locationId ? (
            <PaymentForm
              applicationId={appId}
              locationId={locationId}
              cardTokenizeResponseReceived={handlePaymentToken}
              createPaymentRequest={() => ({
                countryCode: "US",
                currencyCode: "USD",
                total: {
                  amount: (finalTotal / 100).toFixed(2),
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
            onClick={() => setStep("info")}
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Details
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
