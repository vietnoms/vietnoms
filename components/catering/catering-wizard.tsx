"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { PackageCard } from "./package-card";
import { CateringPayment } from "./catering-payment";
import { AddressAutocomplete } from "./address-autocomplete";
import { CustomizeStep } from "./customize-step";
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  MapPin,
  Mail,
  CreditCard,
} from "lucide-react";
import {
  PROTEINS,
  BASES,
  SIDE_TYPES,
  BASE_PRICE_PER_PERSON,
  MAX_DELIVERY_MILES,
  BIG_UP_MULTIPLIER,
  CATERING_TAX_RATE,
  PREMADE_BOWL_DEFAULTS,
  calculateEstimate,
  getDeliveryFee,
  distributeEqually,
  getMaxBaseTypes,
  type ProteinSelection,
  type SideSelection,
} from "@/lib/catering-pricing";

const SMALL_ORDER_MAX_GUESTS = 40;

type Step = "info" | "style" | "customize" | "checkout";

interface BaseSelection { name: string; quantity: number; }

interface WizardState {
  // Step 1 — Event details (no contact info)
  eventDate: string;
  eventTime: string;
  guestCount: number;
  eventType: string;
  deliveryType: "pickup" | "delivery";
  deliveryAddress: string;
  deliveryDistance: number;
  deliveryPlaceId: string;
  distanceLoading: boolean;
  distanceError: string;

  // Step 2 — Style
  packageType: "buffet" | "premade" | "";

  // Step 3 — Customize
  proteins: ProteinSelection[];
  bases: BaseSelection[];
  bigUpActive: boolean;
  sides: SideSelection[];
  noPeanuts: boolean;
  eggRollCut: "1/2" | "1/4" | "Uncut";
  dietaryNotes: string;
  utensils: { napkins: boolean; forks: boolean; chopsticks: boolean };

  // Step 4 — Contact (moved from step 1)
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const INITIAL_SIDES: SideSelection[] = SIDE_TYPES.map((name) => ({ name, quantity: 0 }));

const TIME_SLOTS = (() => {
  const slots: { label: string; value: string }[] = [];
  for (let h = 8; h <= 20; h++) {
    for (const m of [0, 15, 30, 45]) {
      const hour24 = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const period = h >= 12 ? "PM" : "AM";
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const label = `${hour12}:${String(m).padStart(2, "0")} ${period}`;
      slots.push({ label, value: hour24 });
    }
  }
  return slots;
})();

export function CateringWizard() {
  const [step, setStep] = useState<Step>("info");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<"paid" | "emailed" | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  const [state, setState] = useState<WizardState>({
    eventDate: "", eventTime: "", guestCount: 50, eventType: "",
    deliveryType: "pickup", deliveryAddress: "", deliveryDistance: 0,
    deliveryPlaceId: "", distanceLoading: false, distanceError: "",
    packageType: "",
    proteins: PROTEINS.map((p) => ({ name: p.name, quantity: 0, selected: false })),
    bases: BASES.map((b) => ({ name: b.name, quantity: 0 })),
    bigUpActive: false,
    sides: INITIAL_SIDES.map((s) => ({ ...s })),
    noPeanuts: false, eggRollCut: "Uncut", dietaryNotes: "",
    utensils: { napkins: false, forks: false, chopsticks: false },
    contactName: "", contactEmail: "", contactPhone: "", notes: "",
  });

  const update = useCallback(
    <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    }, []
  );

  // --- Protein logic ---
  const toggleProtein = useCallback((name: string) => {
    setState((prev) => {
      const protein = prev.proteins.find((p) => p.name === name);
      if (!protein) return prev;
      const maxSelected = prev.guestCount >= 80 ? 4 : 3;
      const currentlySelected = prev.proteins.filter((p) => p.selected);
      const baseline = prev.bigUpActive ? Math.ceil(BIG_UP_MULTIPLIER * prev.guestCount) : prev.guestCount;
      if (protein.selected) {
        const remaining = currentlySelected.filter((p) => p.name !== name);
        const dist = distributeEqually(baseline, remaining.length);
        const names = remaining.map((p) => p.name);
        return { ...prev, proteins: prev.proteins.map((p) => {
          if (p.name === name) return { ...p, selected: false, quantity: 0 };
          const idx = names.indexOf(p.name);
          return idx >= 0 ? { ...p, quantity: dist[idx] } : p;
        })};
      } else {
        if (currentlySelected.length >= maxSelected) return prev;
        const names = [...currentlySelected.map((p) => p.name), name];
        const dist = distributeEqually(baseline, names.length);
        return { ...prev, proteins: prev.proteins.map((p) => {
          const idx = names.indexOf(p.name);
          return idx >= 0 ? { ...p, selected: true, quantity: dist[idx] } : p;
        })};
      }
    });
  }, []);

  const adjustProtein = useCallback((name: string, delta: number) => {
    setState((prev) => {
      const protein = prev.proteins.find((p) => p.name === name);
      if (!protein || !protein.selected) return prev;
      const newQty = protein.quantity + delta;
      if (newQty < 1) return prev;
      const totalWithout = prev.proteins.reduce((s, p) => (p.name !== name ? s + p.quantity : s), 0);
      if (totalWithout + newQty > 2 * prev.guestCount) return prev;
      return { ...prev, proteins: prev.proteins.map((p) => p.name === name ? { ...p, quantity: newQty } : p) };
    });
  }, []);

  const toggleBigUp = useCallback(() => {
    setState((prev) => {
      const newBigUp = !prev.bigUpActive;
      const baseline = newBigUp ? Math.ceil(BIG_UP_MULTIPLIER * prev.guestCount) : prev.guestCount;
      const selected = prev.proteins.filter((p) => p.selected);
      const dist = distributeEqually(baseline, selected.length);
      const names = selected.map((p) => p.name);
      return { ...prev, bigUpActive: newBigUp, proteins: prev.proteins.map((p) => {
        const idx = names.indexOf(p.name);
        return idx >= 0 ? { ...p, quantity: dist[idx] } : p;
      })};
    });
  }, []);

  // --- Base/side logic ---
  const updateBase = useCallback((name: string, quantity: number) => {
    setState((prev) => {
      const clamped = Math.max(0, quantity);
      const oldBase = prev.bases.find((b) => b.name === name);
      const wasZero = (oldBase?.quantity ?? 0) === 0;
      const maxTypes = getMaxBaseTypes(prev.guestCount);
      if (wasZero && clamped > 0) {
        const active = prev.bases.filter((b) => b.quantity > 0).length;
        if (active >= maxTypes) return prev;
      }
      const newBases = prev.bases.map((b) => b.name === name ? { ...b, quantity: clamped } : b);
      let newSides = prev.sides;
      if (prev.packageType === "buffet") {
        const rQ = newBases.find((b) => b.name === "Rice")?.quantity ?? 0;
        const vQ = newBases.find((b) => b.name === "Vermicelli Noodles")?.quantity ?? 0;
        newSides = [
          { name: "Shredded Pork", quantity: rQ },
          { name: "Pork & Shrimp Egg Roll", quantity: vQ },
          { name: "Vegan Egg Roll", quantity: 0 },
        ];
      }
      return { ...prev, bases: newBases, sides: newSides };
    });
  }, []);

  const updateSideQuantity = useCallback((name: string, quantity: number) => {
    setState((prev) => {
      const clamped = Math.max(0, quantity);
      const newSides = prev.sides.map((s) => s.name === name ? { ...s, quantity: clamped } : s);
      if (newSides.reduce((sum, s) => sum + s.quantity, 0) > 2 * prev.guestCount) return prev;
      return { ...prev, sides: newSides };
    });
  }, []);

  // --- Computed values ---
  const deliveryFee = useMemo(
    () => state.deliveryType === "pickup" ? 0 : getDeliveryFee(state.deliveryDistance),
    [state.deliveryType, state.deliveryDistance]
  );

  const forceEmailOnly = state.deliveryType === "delivery" && state.deliveryDistance > MAX_DELIVERY_MILES;
  const canPayOnline = state.guestCount < SMALL_ORDER_MAX_GUESTS && !forceEmailOnly;

  const estimate = useMemo(
    () => calculateEstimate(
      state.guestCount,
      state.proteins.filter((p) => p.selected),
      state.deliveryType === "pickup" ? 0 : state.deliveryDistance,
      state.bigUpActive, state.sides,
      state.packageType as "buffet" | "premade" | ""
    ),
    [state.guestCount, state.proteins, state.deliveryType, state.deliveryDistance, state.bigUpActive, state.sides, state.packageType]
  );

  const taxAmount = Math.round(estimate.total * CATERING_TAX_RATE);
  const grandTotal = estimate.total + taxAmount;

  const minDate = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }, []);

  // --- Checkout summary helpers ---
  const activeBases = state.bases.filter((b) => b.quantity > 0);
  const isBuffet = state.packageType === "buffet";
  const riceQty = state.bases.find((b) => b.name === "Rice")?.quantity ?? 0;
  const vermicelliQty = state.bases.find((b) => b.name === "Vermicelli Noodles")?.quantity ?? 0;
  const saladQty = state.bases.find((b) => b.name === "Salad")?.quantity ?? 0;
  const houseSauceCount = riceQty + vermicelliQty;
  const vinaigretteCount = saladQty;
  const hasEggRolls = (state.sides.find((s) => s.name === "Pork & Shrimp Egg Roll")?.quantity ?? 0) + (state.sides.find((s) => s.name === "Vegan Egg Roll")?.quantity ?? 0) > 0;

  // --- Payload ---
  const buildPayload = useCallback(
    (extra?: Record<string, unknown>) => ({
      eventDate: state.eventDate,
      eventTime: state.eventTime,
      guestCount: state.guestCount,
      packageType: state.packageType,
      customizations: {
        eventType: state.eventType,
        proteins: state.proteins.filter((p) => p.selected),
        bases: state.bases.filter((b) => b.quantity > 0),
        sides: state.sides.filter((s) => s.quantity > 0),
        bigUpActive: state.bigUpActive,
        noPeanuts: state.noPeanuts,
        eggRollCut: state.eggRollCut,
        utensils: state.utensils,
      },
      contactName: state.contactName, contactEmail: state.contactEmail, contactPhone: state.contactPhone,
      deliveryType: state.deliveryType,
      deliveryAddress: state.deliveryAddress || undefined,
      deliveryDistance: state.deliveryDistance || undefined,
      deliveryFee: deliveryFee ?? 0,
      totalAmount: estimate.total,
      notes: [state.dietaryNotes, state.notes].filter(Boolean).join(". "),
      items: state.proteins.filter((p) => p.selected && p.quantity > 0).map((p) => ({
        itemName: p.name, quantity: p.quantity,
        unitPrice: BASE_PRICE_PER_PERSON + (PROTEINS.find((pr) => pr.name === p.name)?.upcharge ?? 0),
      })),
      ...extra,
    }),
    [state, deliveryFee, estimate.total]
  );

  const saveDraft = useCallback(async () => {
    if (draftSaved) return;
    try {
      await fetch("/api/catering/save-draft", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      setDraftSaved(true);
    } catch {}
  }, [buildPayload, draftSaved]);

  const handleEmailSubmit = async () => {
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/catering", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setSuccess("emailed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setSubmitting(false); }
  };

  const handlePaymentComplete = async (token: string) => {
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/catering/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload({ paymentToken: token })),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");
      setSuccess("paid");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally { setSubmitting(false); }
  };

  const handlePackageSelect = useCallback((pkg: "buffet" | "premade") => {
    setState((prev) => ({
      ...prev, packageType: pkg,
      proteins: PROTEINS.map((p) => ({ name: p.name, quantity: 0, selected: false })),
      bases: BASES.map((b) => ({ name: b.name, quantity: 0 })),
      sides: INITIAL_SIDES.map((s) => ({ ...s })),
      bigUpActive: false, noPeanuts: false, eggRollCut: "Uncut" as const,
    }));
  }, []);

  const handleAddressResult = useCallback(
    (result: { address: string; placeId: string; distanceMiles: number }) => {
      setState((prev) => ({
        ...prev, deliveryAddress: result.address, deliveryPlaceId: result.placeId,
        deliveryDistance: result.distanceMiles, distanceError: "",
      }));
    }, []
  );

  const steps: { key: Step; label: string }[] = [
    { key: "info", label: "Event" },
    { key: "style", label: "Style" },
    { key: "customize", label: "Customize" },
    { key: "checkout", label: "Checkout" },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  if (success) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h2 className="mt-4 font-display text-2xl font-bold text-white">
          {success === "paid" ? "Order Confirmed!" : "Inquiry Submitted!"}
        </h2>
        <p className="mt-2 text-gray-400">
          {success === "paid"
            ? "Your payment has been processed. Check your email for confirmation."
            : "We've sent a copy to your email. We'll get back to you within 24 hours."}
        </p>
      </div>
    );
  }

  // --- Order Summary Component (used in checkout) ---
  const OrderSummary = () => (
    <div className="bg-surface-alt rounded-lg p-4 space-y-3">
      <h3 className="font-display text-lg font-bold text-white">Order Summary</h3>

      <div className="grid grid-cols-2 gap-1 text-sm">
        <span className="text-gray-400">Event Date</span>
        <span className="text-white">{state.eventDate}{state.eventTime ? ` at ${state.eventTime}` : ""}</span>
        <span className="text-gray-400">Guests</span>
        <span className="text-white">{state.guestCount}</span>
        <span className="text-gray-400">Style</span>
        <span className="text-white capitalize">{state.packageType === "premade" ? "Pre-made Bowls" : "Buffet Style"}</span>
        <span className="text-gray-400">Delivery</span>
        <span className="text-white">{state.deliveryType === "pickup" ? "Pickup" : state.deliveryAddress}</span>
      </div>

      {/* Proteins */}
      <div className="border-t border-gray-700 pt-2">
        <h4 className="text-sm font-semibold text-white mb-1">Proteins</h4>
        {state.proteins.filter((p) => p.selected && p.quantity > 0).map((p) => {
          const info = PROTEINS.find((pr) => pr.name === p.name);
          return (
            <div key={p.name} className="flex justify-between text-sm text-gray-400">
              <span>{p.name} x{p.quantity}</span>
              {info && info.upcharge > 0 && <span>+{formatMoney(info.upcharge * p.quantity)}</span>}
            </div>
          );
        })}
      </div>

      {/* Bases */}
      {activeBases.length > 0 && (
        <div className="border-t border-gray-700 pt-2">
          <h4 className="text-sm font-semibold text-white mb-1">Bases</h4>
          {activeBases.map((b) => <div key={b.name} className="text-sm text-gray-400">{b.name} x{b.quantity}</div>)}
        </div>
      )}

      {/* Sides */}
      {isBuffet && state.sides.some((s) => s.quantity > 0) && (
        <div className="border-t border-gray-700 pt-2">
          <h4 className="text-sm font-semibold text-white mb-1">Sides</h4>
          {state.sides.filter((s) => s.quantity > 0).map((s) => (
            <div key={s.name} className="text-sm text-gray-400">{s.name} x{s.quantity}</div>
          ))}
          {hasEggRolls && state.eggRollCut !== "Uncut" && (
            <div className="text-sm text-gray-400">Egg Roll Cut: {state.eggRollCut}</div>
          )}
        </div>
      )}

      {/* Sauces */}
      {(houseSauceCount > 0 || vinaigretteCount > 0) && (
        <div className="border-t border-gray-700 pt-2">
          <h4 className="text-sm font-semibold text-white mb-1">Sauces</h4>
          {houseSauceCount > 0 && <div className="text-sm text-gray-400">House Sauce x{houseSauceCount}</div>}
          {vinaigretteCount > 0 && <div className="text-sm text-gray-400">Vietnoms Vinaigrette x{vinaigretteCount}</div>}
        </div>
      )}

      {/* Premade bowl details */}
      {!isBuffet && activeBases.length > 0 && (
        <div className="border-t border-gray-700 pt-2">
          <h4 className="text-sm font-semibold text-white mb-1">Bowl Details</h4>
          {PREMADE_BOWL_DEFAULTS.filter((d) => activeBases.some((b) => b.name === d.base)).map((d) => (
            <div key={`${d.base}-${d.protein}`} className="text-sm text-gray-400">
              {d.base}: {d.side !== "None" ? `${d.side} + ` : ""}{d.sauce}
            </div>
          ))}
        </div>
      )}

      {/* Options */}
      {(state.bigUpActive || state.noPeanuts) && (
        <div className="border-t border-gray-700 pt-2">
          {state.bigUpActive && <div className="text-sm text-gray-400">Big Up: +50% protein</div>}
          {state.noPeanuts && <div className="text-sm text-gray-400">No Peanuts</div>}
        </div>
      )}

      {/* Cost breakdown */}
      <div className="border-t border-gray-700 pt-2 space-y-1 text-sm">
        {estimate.breakdown.map((item) => (
          <div key={item.label} className="flex justify-between text-gray-400">
            <span>{item.label}</span><span>{formatMoney(item.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between text-gray-400">
          <span>Tax (9.375%)</span><span>{formatMoney(taxAmount)}</span>
        </div>
        <div className="border-t border-gray-700 pt-1 flex justify-between font-semibold text-white text-base">
          <span>Total</span>
          <span className="text-brand-red">{formatMoney(grandTotal)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step indicator */}
      <div className="flex gap-1 mb-8 overflow-x-auto">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${stepIndex >= i ? "bg-brand-red text-white" : "bg-gray-700 text-gray-400"}`}>
              {i + 1}
            </div>
            <span className="text-xs text-gray-400 hidden sm:inline whitespace-nowrap">{s.label}</span>
            {i < steps.length - 1 && <div className="w-4 sm:w-8 h-px bg-gray-600 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      {/* ========== Step 1: Event Details (no contact info) ========== */}
      {step === "info" && (
        <form onSubmit={(e) => {
          e.preventDefault(); setError("");
          if (state.guestCount < 10) { setError("Minimum 10 guests required."); return; }
          if (state.deliveryType === "delivery" && !state.deliveryAddress) { setError("Please select a delivery address."); return; }
          setStep("style");
        }} className="space-y-6 max-w-2xl mx-auto">
          <h2 className="font-display text-xl font-bold text-white">Event Details</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="eventDate">Event Date *</Label>
              <Input id="eventDate" type="date" required min={minDate} value={state.eventDate}
                onChange={(e) => update("eventDate", e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">Minimum 7 days in advance</p>
            </div>
            <div>
              <Label htmlFor="eventTime">Pickup/Delivery Time</Label>
              <select id="eventTime" value={state.eventTime}
                onChange={(e) => update("eventTime", e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-surface-alt px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-red">
                <option value="">Select a time</option>
                {TIME_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="guestCount">Number of Guests *</Label>
              <Input id="guestCount" type="number" required min={10} value={state.guestCount}
                onChange={(e) => update("guestCount", Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="eventType">Event Type</Label>
              <Input id="eventType" value={state.eventType}
                onChange={(e) => update("eventType", e.target.value)}
                placeholder="e.g., Corporate lunch, Wedding" />
            </div>
          </div>

          {/* Delivery toggle */}
          <div>
            <Label>Pickup or Delivery?</Label>
            <div className="flex gap-2 mt-1">
              <button type="button" className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-colors ${state.deliveryType === "pickup" ? "border-brand-red bg-brand-red/5 text-brand-red" : "border-gray-600 text-gray-300 hover:border-gray-400"}`}
                onClick={() => update("deliveryType", "pickup")}>
                <MapPin className="h-4 w-4 inline mr-1" />Pickup (Free)
              </button>
              <button type="button" className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-colors ${state.deliveryType === "delivery" ? "border-brand-red bg-brand-red/5 text-brand-red" : "border-gray-600 text-gray-300 hover:border-gray-400"}`}
                onClick={() => update("deliveryType", "delivery")}>Delivery</button>
            </div>
          </div>

          {state.deliveryType === "pickup" && (
            <p className="text-sm text-gray-400">Pickup from 387 S 1st St, San Jose, CA 95113</p>
          )}

          {state.deliveryType === "delivery" && (
            <div className="space-y-3">
              <AddressAutocomplete value={state.deliveryAddress} onChange={handleAddressResult}
                onError={(msg) => setState((prev) => ({ ...prev, distanceError: msg }))} />
              {state.distanceError && <p className="text-sm text-red-400">{state.distanceError}</p>}
              {state.deliveryDistance > 0 && deliveryFee !== null && (
                <p className="text-sm text-gray-400">Delivery fee: {formatMoney(deliveryFee)}</p>
              )}
              {forceEmailOnly && (
                <div className="p-3 bg-amber-900/30 border border-amber-800 rounded-lg text-amber-400 text-sm">
                  Delivery over 20 miles requires a custom quote.
                </div>
              )}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full">Continue</Button>
        </form>
      )}

      {/* ========== Step 2: Catering Style ========== */}
      {step === "style" && (
        <div className="space-y-4 max-w-2xl mx-auto">
          <h2 className="font-display text-xl font-bold text-white">Catering Style</h2>
          <p className="text-sm text-gray-400">$20/person flat rate for both styles.</p>
          <div className="space-y-3">
            <PackageCard name="Buffet Style" description="Party trays with your choice of bases, proteins, sides, and sauces."
              recommended={state.guestCount >= 40} selected={state.packageType === "buffet"}
              onSelect={() => handlePackageSelect("buffet")}
              features={["Best for 40+ guests", "Self-serve trays", "Choose your bases, sides & sauces", "Select up to 3 protein types"]} />
            <PackageCard name="Pre-made Bowls" description="Individually assembled and labeled bowls."
              recommended={state.guestCount < 40} selected={state.packageType === "premade"}
              onSelect={() => handlePackageSelect("premade")}
              features={["Best for under 40 guests", "Individual bowls, labeled", "Choose base + protein per bowl", "Side & sauce included per bowl type"]} />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("info")} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />Back
            </Button>
            <Button onClick={() => { if (!state.packageType) { setError("Please select a catering style."); return; } setError(""); setStep("customize"); }}
              className="flex-1" disabled={!state.packageType}>Continue</Button>
          </div>
        </div>
      )}

      {/* ========== Step 3: Customize ========== */}
      {step === "customize" && state.packageType && (
        <div className="max-w-2xl mx-auto">
          <CustomizeStep
            guestCount={state.guestCount}
            packageType={state.packageType as "buffet" | "premade"}
            proteins={state.proteins} bases={state.bases} sides={state.sides}
            bigUpActive={state.bigUpActive} noPeanuts={state.noPeanuts}
            eggRollCut={state.eggRollCut} dietaryNotes={state.dietaryNotes}
            estimate={estimate}
            onToggleProtein={toggleProtein} onAdjustProtein={adjustProtein}
            onToggleBigUp={toggleBigUp} onUpdateBase={updateBase}
            onUpdateSideQuantity={updateSideQuantity}
            onUpdateNoPeanuts={(v) => update("noPeanuts", v)}
            onUpdateEggRollCut={(v) => update("eggRollCut", v)}
            onUpdateDietaryNotes={(v) => update("dietaryNotes", v)}
            utensils={state.utensils} onUpdateUtensils={(v) => update("utensils", v)}
            onContinue={() => {
              const sel = state.proteins.filter((p) => p.selected);
              if (sel.length === 0) { setError("Please select at least one protein."); return; }
              const totalB = state.bases.reduce((s, b) => s + b.quantity, 0);
              if (totalB !== state.guestCount) { setError(`Base servings (${totalB}) must equal ${state.guestCount}.`); return; }
              setError(""); saveDraft(); setStep("checkout");
            }}
            onBack={() => setStep("style")}
          />
        </div>
      )}

      {/* ========== Step 4: Checkout (Contact + Payment — single page) ========== */}
      {step === "checkout" && (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Order summary */}
          <div className="lg:col-span-2 order-first">
            <div className="lg:sticky lg:top-24">
              <OrderSummary />
            </div>
          </div>

          {/* Right: Contact + Payment */}
          <div className="lg:col-span-3 space-y-5">
            <h2 className="font-display text-xl font-bold text-white">Your Information</h2>

            <div className="space-y-3">
              <div>
                <Label htmlFor="contactName">Name *</Label>
                <Input id="contactName" required value={state.contactName}
                  onChange={(e) => update("contactName", e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <Label htmlFor="contactEmail">Email *</Label>
                <Input id="contactEmail" type="email" required value={state.contactEmail}
                  onChange={(e) => update("contactEmail", e.target.value)} placeholder="your@email.com" />
              </div>
              <div>
                <Label htmlFor="contactPhone">Phone *</Label>
                <Input id="contactPhone" type="tel" required value={state.contactPhone}
                  onChange={(e) => update("contactPhone", e.target.value)} placeholder="(408) 555-0123" />
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea id="notes" value={state.notes} onChange={(e) => update("notes", e.target.value)}
                  placeholder="Venue details, setup time, parking info..." rows={3} />
              </div>
            </div>

            {submitting && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-brand-red mx-auto" />
                <p className="mt-4 text-gray-400">Processing...</p>
              </div>
            )}

            {!submitting && (
              <div className="space-y-3">
                {/* Pay Now — under 40 guests and not over delivery max */}
                {canPayOnline && (
                  <Card className="border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="h-5 w-5 text-brand-red" />
                        <h3 className="font-display text-base font-bold text-white">Pay Now — {formatMoney(grandTotal)}</h3>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">
                        Secure payment via Square. Your order will be confirmed immediately.
                      </p>
                      {!state.contactName || !state.contactEmail || !state.contactPhone ? (
                        <p className="text-sm text-amber-400">Fill in your contact info above to pay.</p>
                      ) : (
                        <CateringPayment totalCents={grandTotal} onPaymentComplete={handlePaymentComplete} onError={setError} />
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Submit Inquiry — always available */}
                <Card className="border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Mail className="h-5 w-5 text-brand-yellow" />
                      <h3 className="font-display text-base font-bold text-white">
                        {canPayOnline ? "Or Submit Inquiry Instead" : "Submit Inquiry"}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                      {forceEmailOnly
                        ? "Delivery over 20 miles requires a custom quote."
                        : state.guestCount >= SMALL_ORDER_MAX_GUESTS
                          ? "For 40+ guests, submit your details and we'll follow up within 24 hours with a custom quote."
                          : "Submit your catering details and we'll follow up within 24 hours."}
                    </p>
                    <Button onClick={handleEmailSubmit}
                      variant={canPayOnline ? "outline" : "default"} className="w-full"
                      disabled={!state.contactName || !state.contactEmail || !state.contactPhone}>
                      Submit Inquiry
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {!submitting && (
              <Button variant="outline" onClick={() => setStep("customize")} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />Back
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
