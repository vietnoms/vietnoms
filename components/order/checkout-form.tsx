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
import { Loader2, CheckCircle, Star, Clock, ShieldCheck, Minus, Plus, X } from "lucide-react";
import {
  isOpenNow,
  canAcceptOrders,
  getTodayHoursDisplay,
  generatePickupSlots,
  generatePickupSlotsForDate,
  getNextOpeningTime,
  MAX_ADVANCE_DAYS,
} from "@/lib/restaurant-hours";

type ReceiptPreference = "email" | "text" | "both";

interface LoyaltyData {
  program: {
    rewardTiers: { id: string; name: string; points: number }[];
    terminologyOne: string;
    terminologyOther: string;
  } | null;
  account: {
    balance: number;
    lifetimePoints: number;
  } | null;
}

const POINTS_PER_DOLLAR = 5;
const TIP_PERCENT_PRESETS = [15, 20, 25];

function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("1") && digits.length > 10 ? digits.slice(1) : digits;
  if (local.length <= 3) return local;
  if (local.length <= 6) return `(${local.slice(0, 3)}) ${local.slice(3)}`;
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6, 10)}`;
}

export function CheckoutForm() {
  const { items, total, clearCart, updateQuantity, removeItem } = useCart();
  const { user, refreshSession } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState("");

  const [customerInfo, setCustomerInfo] = useState({
    name: "", email: "", phone: "", pickupTime: "", pickupDate: "", notes: "",
  });

  const [pickupMode, setPickupMode] = useState<"asap" | "scheduled">("asap");
  const [customerLookupDone, setCustomerLookupDone] = useState(false);
  const [customerLookupMsg, setCustomerLookupMsg] = useState("");
  const [lookingUpPhone, setLookingUpPhone] = useState(false);

  // OTP
  const [otpStep, setOtpStep] = useState<"idle" | "sending" | "sent" | "verifying" | "verified">("idle");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Loyalty
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [selectedRewardTierId, setSelectedRewardTierId] = useState("");

  // Receipt / opt-in
  const [receiptPreference, setReceiptPreference] = useState<ReceiptPreference>("text");
  const [optInText, setOptInText] = useState(false);
  const [optInEmail, setOptInEmail] = useState(false);

  // Hours
  const [hoursDisplay, setHoursDisplay] = useState<string | null>(null);
  const [restaurantOpen, setRestaurantOpen] = useState(true);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [pickupSlots, setPickupSlots] = useState<{ label: string; value: string }[]>([]);

  // Tax/tip
  const [orderTotals, setOrderTotals] = useState<{ subtotal: number; tax: number; total: number } | null>(null);
  const [calculatingTotals, setCalculatingTotals] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [tipPercent, setTipPercent] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [tipMode, setTipMode] = useState<"preset" | "custom">("preset");

  // Mobile cart expanded
  const [cartExpanded, setCartExpanded] = useState(false);

  const phoneLookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calcDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // OTP cooldown
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setTimeout(() => setOtpCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  // Set initial pickupDate
  useEffect(() => {
    if (!customerInfo.pickupDate) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      setCustomerInfo((prev) => ({ ...prev, pickupDate: `${yyyy}-${mm}-${dd}` }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Restaurant hours + pickup slots
  useEffect(() => {
    const now = new Date();
    setHoursDisplay(getTodayHoursDisplay(now));
    const open = isOpenNow(now);
    setRestaurantOpen(open);
    setAcceptingOrders(canAcceptOrders(now));

    if (pickupMode === "asap" && !open) {
      const nextOpen = getNextOpeningTime(now);
      if (nextOpen) {
        setPickupMode("scheduled");
        const yyyy = nextOpen.getFullYear();
        const mm = String(nextOpen.getMonth() + 1).padStart(2, "0");
        const dd = String(nextOpen.getDate()).padStart(2, "0");
        const hh = String(nextOpen.getHours()).padStart(2, "0");
        const mi = String(nextOpen.getMinutes()).padStart(2, "0");
        setCustomerInfo((prev) => ({
          ...prev, pickupDate: `${yyyy}-${mm}-${dd}`, pickupTime: `${hh}:${mi}`,
        }));
      }
    }

    if (customerInfo.pickupDate) {
      const [y, m, d] = customerInfo.pickupDate.split("-").map(Number);
      setPickupSlots(generatePickupSlotsForDate(new Date(y, m - 1, d)));
    } else {
      setPickupSlots(generatePickupSlots(now));
    }
  }, [customerInfo.pickupDate, pickupMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill from auth
  useEffect(() => {
    if (user) {
      setCustomerInfo((prev) => ({
        ...prev,
        name: prev.name || [user.givenName, user.familyName].filter(Boolean).join(" "),
        phone: prev.phone || user.phone || "",
      }));
      setCustomerLookupDone(true);
      setOtpStep("verified");
    }
  }, [user]);

  // Fetch loyalty
  const fetchLoyalty = useCallback(() => {
    fetch("/api/loyalty").then((r) => r.json()).then((data) => {
      if (data.program) setLoyalty(data);
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchLoyalty(); }, [fetchLoyalty]);

  // Calculate tax eagerly on mount and when cart changes
  const calculateTotals = useCallback(() => {
    if (items.length === 0) { setOrderTotals(null); return; }
    setCalculatingTotals(true);
    const payload = items.map((item) => ({
      catalogObjectId: item.variationId,
      quantity: item.quantity,
      modifiers: item.modifiers.map((m) => ({ catalogObjectId: m.id })),
    }));
    fetch("/api/orders/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineItems: payload }),
    })
      .then((r) => r.json())
      .then((data) => { if (data.total != null) setOrderTotals(data); })
      .catch(() => {})
      .finally(() => setCalculatingTotals(false));
  }, [items]);

  useEffect(() => {
    if (calcDebounce.current) clearTimeout(calcDebounce.current);
    calcDebounce.current = setTimeout(calculateTotals, 300);
    return () => { if (calcDebounce.current) clearTimeout(calcDebounce.current); };
  }, [calculateTotals]);

  // Recalculate tip on totals change
  useEffect(() => {
    if (tipMode === "preset" && tipPercent != null) {
      const base = orderTotals?.subtotal ?? total;
      setTipAmount(Math.round(base * tipPercent / 100));
    }
  }, [orderTotals, total, tipMode, tipPercent]);

  // Default receipt preference
  useEffect(() => {
    if (customerInfo.email && receiptPreference === "text") setReceiptPreference("email");
  }, [customerInfo.email, receiptPreference]);

  // Phone lookup
  const handlePhoneLookup = useCallback(async (phone: string) => {
    if (!phone || phone.replace(/\D/g, "").length < 10 || customerLookupDone) return;
    if (phoneLookupTimer.current) clearTimeout(phoneLookupTimer.current);
    setLookingUpPhone(true);
    try {
      const res = await fetch("/api/customers/lookup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.found) {
        const name = [data.givenName, data.familyName].filter(Boolean).join(" ");
        setCustomerInfo((prev) => ({
          ...prev, name: prev.name || name, email: prev.email || data.emailAddress || "",
        }));
        setCustomerLookupMsg(`Welcome back${data.givenName ? `, ${data.givenName}` : ""}!`);
      }
      setCustomerLookupDone(true);
    } catch {} finally { setLookingUpPhone(false); }
  }, [customerLookupDone]);

  const handlePhoneChange = useCallback((value: string) => {
    const formatted = formatPhoneDisplay(value);
    setCustomerInfo((prev) => ({ ...prev, phone: formatted }));
    setCustomerLookupDone(false);
    setCustomerLookupMsg("");
    setOtpStep("idle");
    setOtpCode("");
    setOtpError("");
    if (phoneLookupTimer.current) clearTimeout(phoneLookupTimer.current);
    if (value.replace(/\D/g, "").length >= 10) {
      phoneLookupTimer.current = setTimeout(() => handlePhoneLookup(formatted), 500);
    }
  }, [handlePhoneLookup]);

  // OTP handlers
  const handleSendOTP = useCallback(async () => {
    setOtpError(""); setOtpStep("sending");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customerInfo.phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to send code");
      setOtpStep("sent"); setOtpCooldown(30);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Failed to send code");
      setOtpStep("idle");
    }
  }, [customerInfo.phone]);

  const handleVerifyOTP = useCallback(async () => {
    setOtpError(""); setOtpStep("verifying");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customerInfo.phone, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Invalid code");
      setOtpStep("verified");
      await refreshSession();
      const firstName = data.user?.givenName || "";
      if (data.user) {
        const name = [data.user.givenName, data.user.familyName].filter(Boolean).join(" ");
        setCustomerInfo((prev) => ({ ...prev, name: prev.name || name }));
      }
      try {
        const lr = await fetch("/api/loyalty");
        const ld = await lr.json();
        if (ld.program) {
          setLoyalty(ld);
          const bal = ld.account?.balance ?? 0;
          const next = ld.program.rewardTiers.filter((t: any) => t.points > bal).sort((a: any, b: any) => a.points - b.points)[0];
          const greeting = firstName ? `Welcome back, ${firstName}!` : "Phone verified!";
          const pMsg = ld.account ? `You have ${bal} points.${next ? ` Only ${next.points - bal} from your next reward!` : ""}` : "You'll earn rewards on this order.";
          setCustomerLookupMsg(`${greeting} ${pMsg}`);
        } else {
          setCustomerLookupMsg(firstName ? `Welcome back, ${firstName}!` : "Phone verified!");
        }
      } catch {
        setCustomerLookupMsg(firstName ? `Welcome back, ${firstName}!` : "Phone verified!");
        fetchLoyalty();
      }
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Verification failed");
      setOtpStep("sent");
    }
  }, [customerInfo.phone, otpCode, refreshSession, fetchLoyalty]);

  // Payment handler
  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID || "";
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "";
  const finalTotal = (orderTotals?.total ?? total) + tipAmount;

  const handlePaymentToken = async (token: { status: string; token?: string; errors?: unknown[] }) => {
    if (token.status !== "OK" || !token.token) { setError("Payment failed. Please try again."); return; }
    if (submitting) return;
    setSubmitting(true); setError("");
    try {
      const lineItems = items.map((item) => ({
        catalogObjectId: item.variationId, quantity: item.quantity,
        modifiers: item.modifiers.map((m) => ({ catalogObjectId: m.id })),
        note: item.specialInstructions,
      }));
      const response = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineItems,
          customerInfo: {
            ...customerInfo,
            pickupTime: pickupMode === "asap" ? "" : customerInfo.pickupTime,
            pickupDate: pickupMode === "asap" ? "" : customerInfo.pickupDate,
          },
          paymentToken: token.token,
          rewardTierId: selectedRewardTierId || undefined,
          tipAmount: tipAmount || undefined,
          receiptPreference, optInText, optInEmail,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Payment failed");
      clearCart();
      setCompletedOrderId(data.orderId);
      setSuccess(true);
      setTimeout(() => {
        const params = new URLSearchParams({ orderId: data.orderId });
        if (data.receiptUrl) params.set("receiptUrl", data.receiptUrl);
        router.push(`/order/confirmation?${params}`);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
    } finally { setSubmitting(false); }
  };

  const closedMessage = !restaurantOpen
    ? (() => {
        const nextOpen = getNextOpeningTime(new Date());
        if (nextOpen) {
          const dayLabel = nextOpen.toLocaleDateString("en-US", { weekday: "long" });
          const timeLabel = nextOpen.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
          return `We're currently closed. Your order will be scheduled for ${dayLabel} at ${timeLabel}.`;
        }
        return "We're currently closed.";
      })()
    : !acceptingOrders ? "Kitchen is closing soon — orders are no longer accepted." : null;

  const phoneDigits = customerInfo.phone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length >= 10;
  const isVerified = otpStep === "verified" || !!user;

  const canPay = customerInfo.name && phoneValid && optInText &&
    (pickupMode === "asap" ? !closedMessage : pickupSlots.length > 0 && !!customerInfo.pickupTime);

  if (success) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h2 className="mt-4 font-display text-2xl font-bold text-white">Payment Successful!</h2>
        {completedOrderId && (
          <p className="mt-2 text-sm text-gray-400">Order ID: <code className="bg-gray-800 px-2 py-0.5 rounded text-gray-200">{completedOrderId}</code></p>
        )}
        <p className="mt-2 text-gray-400">Redirecting to confirmation...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Your cart is empty. Add items to place an order.</p>
      </div>
    );
  }

  // Loyalty computed values
  const loyaltyBalance = loyalty?.account?.balance ?? 0;
  const subtotalForPoints = orderTotals?.subtotal ?? total;
  const earningPoints = Math.floor((subtotalForPoints / 100) * POINTS_PER_DOLLAR);
  const redeemableTiers = loyalty?.program?.rewardTiers.filter((t) => loyaltyBalance >= t.points) || [];

  return (
    <div className="grid lg:grid-cols-5 gap-6 pb-24 lg:pb-8">
      {/* ========== LEFT: ORDER SUMMARY ========== */}
      <div className="lg:col-span-2 order-first">
        {/* Mobile: collapsible cart summary */}
        <button
          className="lg:hidden w-full flex items-center justify-between bg-surface-alt rounded-lg p-4 mb-4"
          onClick={() => setCartExpanded(!cartExpanded)}
        >
          <span className="font-semibold text-white">
            Your Order ({items.reduce((s, i) => s + i.quantity, 0)} items)
          </span>
          <span className="font-semibold text-brand-red">{formatPrice(finalTotal)}</span>
        </button>

        {/* Desktop: always visible. Mobile: collapsible */}
        <div className={`${cartExpanded ? "block" : "hidden"} lg:block lg:sticky lg:top-24`}>
          <div className="bg-surface-alt rounded-lg p-4 space-y-3">
            <h2 className="font-display text-lg font-bold text-white">Your Order</h2>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {items.map((item, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{item.menuItem.name}</div>
                    {item.variationName !== "Regular" && (
                      <div className="text-xs text-gray-400">{item.variationName}</div>
                    )}
                    {item.modifiers.length > 0 && (
                      <div className="text-xs text-gray-500">{item.modifiers.map((m) => m.name).join(", ")}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => updateQuantity(i, item.quantity - 1)}
                        className="h-6 w-6 rounded border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-gray-300 text-xs w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(i, item.quantity + 1)}
                        className="h-6 w-6 rounded border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <span className="text-white">{formatPrice(item.lineTotal)}</span>
                    <button
                      onClick={() => removeItem(i)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-700 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white">{formatPrice(orderTotals?.subtotal ?? total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tax</span>
                {calculatingTotals ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                ) : orderTotals ? (
                  <span className="text-white">{formatPrice(orderTotals.tax)}</span>
                ) : (
                  <span className="text-gray-500">--</span>
                )}
              </div>
              {tipAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Tip</span>
                  <span className="text-white">{formatPrice(tipAmount)}</span>
                </div>
              )}
              <div className="border-t border-gray-700 pt-1.5 flex justify-between font-semibold">
                <span className="text-white">Total</span>
                <span className="text-brand-red text-lg">{formatPrice(finalTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== RIGHT: CHECKOUT FORM ========== */}
      <div className="lg:col-span-3 space-y-5">
        {/* Hours banner */}
        {hoursDisplay && (
          <div className="flex items-center gap-2 text-sm px-3 py-2 bg-surface-alt rounded-lg">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-400">Open today: {hoursDisplay}</span>
            {!restaurantOpen && (
              <span className="text-red-500 font-medium ml-auto">Closed<span className="text-gray-400 text-xs font-normal block">Scheduled orders available</span></span>
            )}
            {restaurantOpen && !acceptingOrders && (
              <span className="text-amber-600 font-medium ml-auto">Closing soon</span>
            )}
          </div>
        )}

        {closedMessage && (
          <div className="p-3 bg-amber-900/30 border border-amber-800 rounded-lg text-sm">
            <span className="text-amber-400">{closedMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">{error}</div>
        )}

        {customerLookupMsg && (
          <div className="p-3 bg-green-900/30 border border-green-800 rounded-lg text-green-400 text-sm">{customerLookupMsg}</div>
        )}

        {/* CONTACT */}
        <section className="space-y-3">
          <h3 className="font-display text-lg font-bold text-white">Contact</h3>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <div className="relative">
              <Input id="phone" type="tel" required value={customerInfo.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={(e) => handlePhoneLookup(e.target.value)}
                placeholder="(408) 555-0123" />
              {lookingUpPhone && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
              {isVerified && <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />}
            </div>
            {/* Inline OTP */}
            {phoneValid && !isVerified && (
              <div className="mt-2 space-y-2">
                {otpError && <p className="text-xs text-red-400">{otpError}</p>}
                {(otpStep === "idle" || otpStep === "sending") && (
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleSendOTP}
                      disabled={otpStep === "sending" || otpCooldown > 0}
                      className="border-brand-red text-brand-red hover:bg-brand-red/10">
                      {otpStep === "sending" ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Sending...</>
                        : otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Verify Phone"}
                    </Button>
                    <span className="text-xs text-gray-400">Verify to earn reward points</span>
                  </div>
                )}
                {(otpStep === "sent" || otpStep === "verifying") && (
                  <div className="bg-surface-alt rounded-lg p-3 space-y-2">
                    <p className="text-xs text-gray-400">We sent a 6-digit code to {customerInfo.phone}</p>
                    <div className="flex gap-2">
                      <Input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                        value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456" className="flex-1" autoFocus />
                      <Button type="button" size="sm" onClick={handleVerifyOTP}
                        disabled={otpCode.length < 6 || otpStep === "verifying"}>
                        {otpStep === "verifying" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify"}
                      </Button>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <button type="button" onClick={handleSendOTP} disabled={otpCooldown > 0}
                        className="text-gray-400 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">
                        {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend code"}
                      </button>
                      <button type="button" onClick={() => { setOtpStep("idle"); setOtpCode(""); setOtpError(""); }}
                        className="text-gray-400 hover:text-gray-300">Different number</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={customerInfo.name}
              onChange={(e) => setCustomerInfo((p) => ({ ...p, name: e.target.value }))} placeholder="Your name" />
          </div>
          <div>
            <Label htmlFor="email">Email (optional)</Label>
            <Input id="email" type="email" value={customerInfo.email}
              onChange={(e) => setCustomerInfo((p) => ({ ...p, email: e.target.value.trim() }))} placeholder="your@email.com" />
          </div>
        </section>

        {/* PICKUP */}
        <section className="space-y-3">
          <h3 className="font-display text-lg font-bold text-white">Pickup</h3>
          <div className="flex gap-2">
            <button type="button" className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${pickupMode === "asap" ? "border-brand-red bg-brand-red/5 text-brand-red" : "border-gray-600 text-gray-300 hover:border-gray-300"}`}
              onClick={() => {
                if (!restaurantOpen) {
                  const nextOpen = getNextOpeningTime(new Date());
                  if (nextOpen) {
                    setPickupMode("scheduled");
                    setCustomerInfo((p) => ({
                      ...p,
                      pickupDate: `${nextOpen.getFullYear()}-${String(nextOpen.getMonth()+1).padStart(2,"0")}-${String(nextOpen.getDate()).padStart(2,"0")}`,
                      pickupTime: `${String(nextOpen.getHours()).padStart(2,"0")}:${String(nextOpen.getMinutes()).padStart(2,"0")}`,
                    }));
                  }
                } else { setPickupMode("asap"); }
              }}>ASAP</button>
            <button type="button" className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${pickupMode === "scheduled" ? "border-brand-red bg-brand-red/5 text-brand-red" : "border-gray-600 text-gray-300 hover:border-gray-300"}`}
              onClick={() => setPickupMode("scheduled")}>Schedule for Later</button>
          </div>
          {pickupMode === "asap" && restaurantOpen && (
            <p className="text-sm text-gray-400">Estimated ready in 10-15 minutes</p>
          )}
          {pickupMode === "scheduled" && (
            <div className="space-y-2">
              <input type="date" value={customerInfo.pickupDate}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, pickupDate: e.target.value, pickupTime: "" }))}
                min={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })()}
                max={(() => { const d = new Date(); d.setDate(d.getDate()+MAX_ADVANCE_DAYS); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })()}
                required className="w-full rounded-lg border border-gray-600 bg-surface-alt px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-red" />
              {pickupSlots.length > 0 ? (
                <select value={customerInfo.pickupTime}
                  onChange={(e) => setCustomerInfo((p) => ({ ...p, pickupTime: e.target.value }))}
                  required className="w-full rounded-lg border border-gray-600 bg-surface-alt px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-red">
                  <option value="">Select a time</option>
                  {pickupSlots.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              ) : (
                <p className="text-sm text-gray-400">No available time slots for this date.</p>
              )}
            </div>
          )}
          <div>
            <Label htmlFor="notes">Special Instructions</Label>
            <Textarea id="notes" value={customerInfo.notes}
              onChange={(e) => setCustomerInfo((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Any allergies or special requests?" rows={2} />
          </div>
        </section>

        {/* TIP */}
        <section className="space-y-3">
          <h3 className="font-display text-lg font-bold text-white">Tip</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setTipAmount(0); setTipPercent(null); setTipMode("preset"); setCustomTip(""); }}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${tipMode === "preset" && tipPercent === null && tipAmount === 0 ? "border-brand-red bg-brand-red/5 text-brand-red" : "border-gray-600 text-gray-300 hover:border-gray-300"}`}>
              No tip
            </button>
            {TIP_PERCENT_PRESETS.map((pct) => {
              const base = orderTotals?.subtotal ?? total;
              const computed = Math.round(base * pct / 100);
              return (
                <button key={pct} type="button"
                  onClick={() => { setTipPercent(pct); setTipAmount(computed); setTipMode("preset"); setCustomTip(""); }}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${tipMode === "preset" && tipPercent === pct ? "border-brand-red bg-brand-red/5 text-brand-red" : "border-gray-600 text-gray-300 hover:border-gray-300"}`}>
                  <span>{pct}%</span>
                  <span className="block text-xs opacity-70">{formatPrice(computed)}</span>
                </button>
              );
            })}
            <button type="button" onClick={() => { setTipMode("custom"); setTipPercent(null); setTipAmount(0); }}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${tipMode === "custom" ? "border-brand-red bg-brand-red/5 text-brand-red" : "border-gray-600 text-gray-300 hover:border-gray-300"}`}>
              Custom
            </button>
          </div>
          {tipMode === "custom" && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <Input type="number" min="0" step="0.01" value={customTip}
                onChange={(e) => { setCustomTip(e.target.value); const c = Math.round(parseFloat(e.target.value||"0")*100); setTipAmount(isNaN(c)?0:Math.max(0,c)); }}
                placeholder="0.00" className="pl-7" />
            </div>
          )}
        </section>

        {/* LOYALTY */}
        {loyalty?.account && loyalty.program && (
          <section className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>Your Rewards</span>
            </div>
            <div className="text-sm">
              <p>You have <span className="font-semibold text-yellow-400">{loyaltyBalance}</span> points.</p>
            </div>
            <div className="bg-yellow-900/30 rounded-lg px-3 py-2 text-sm flex items-center justify-between">
              <span className="text-gray-300">Points earned on this order</span>
              <span className="font-semibold text-yellow-400">+{earningPoints} pts</span>
            </div>
            {redeemableTiers.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-yellow-800/30">
                <p className="text-xs text-gray-400 font-medium">Redeem a reward:</p>
                {redeemableTiers.map((tier) => (
                  <label key={tier.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${selectedRewardTierId === tier.id ? "border-yellow-500 bg-yellow-900/30" : "border-gray-700 hover:border-gray-500"}`}>
                    <input type="radio" name="reward" checked={selectedRewardTierId === tier.id}
                      onChange={() => setSelectedRewardTierId(tier.id)} className="accent-yellow-500" />
                    <span>{tier.name}</span>
                    <span className="text-gray-400 ml-auto">{tier.points} pts</span>
                  </label>
                ))}
                {selectedRewardTierId && (
                  <button onClick={() => setSelectedRewardTierId("")} className="text-xs text-gray-400 hover:text-gray-300">
                    Don&apos;t use a reward
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* RECEIPT & OPT-INS */}
        <section className="space-y-3">
          <div>
            <Label>Receipt</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {([
                { value: "email" as const, label: "Email", show: !!customerInfo.email },
                { value: "text" as const, label: "Text", show: !!customerInfo.phone },
                { value: "both" as const, label: "Both", show: !!customerInfo.email && !!customerInfo.phone },
              ]).filter((o) => o.show).map((o) => (
                <button key={o.value} type="button" onClick={() => setReceiptPreference(o.value)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${receiptPreference === o.value ? "border-brand-red bg-brand-red/5 text-brand-red" : "border-gray-600 text-gray-300 hover:border-gray-300"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={optInText} onChange={(e) => setOptInText(e.target.checked)}
              className="mt-0.5 accent-brand-red" required />
            <span className="text-sm text-gray-400">
              I agree to receive SMS messages from Vietnoms regarding order updates and catering alerts. Message and data rates may apply. Reply STOP to opt out.{" "}
              <a href="/privacy" target="_blank" className="text-brand-red hover:underline">Privacy Policy</a> &amp;{" "}
              <a href="/terms" target="_blank" className="text-brand-red hover:underline">Terms</a>
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={optInEmail} onChange={(e) => setOptInEmail(e.target.checked)}
              className="mt-0.5 accent-brand-red" />
            <span className="text-sm text-gray-400">Opt-in to receive promos and special deals via e-mail</span>
          </label>
        </section>

        {/* PAYMENT */}
        <section className="space-y-3">
          <h3 className="font-display text-lg font-bold text-white">Payment</h3>
          {submitting && (
            <div className="text-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-brand-red mx-auto" />
              <p className="mt-2 text-gray-400 text-sm">Processing payment...</p>
            </div>
          )}
          {!submitting && appId && locationId ? (
            <div className={!canPay ? "opacity-50 pointer-events-none" : ""}>
              {!canPay && (
                <p className="text-sm text-amber-400 mb-2">
                  Fill in your name, phone, and accept SMS terms to continue.
                </p>
              )}
              <PaymentForm applicationId={appId} locationId={locationId}
                cardTokenizeResponseReceived={handlePaymentToken}
                createPaymentRequest={() => ({
                  countryCode: "US", currencyCode: "USD",
                  total: { amount: (finalTotal / 100).toFixed(2), label: "Vietnoms Order" },
                })}>
                <CreditCard />
                <div className="my-3 text-center text-sm text-gray-400">or pay with</div>
                <div className="space-y-2">
                  <GiftCard />
                  <ApplePay />
                  <GooglePay />
                  <CashAppPay />
                </div>
              </PaymentForm>
            </div>
          ) : !submitting ? (
            <p className="text-sm text-gray-400">Payment is not configured. Please contact us.</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
