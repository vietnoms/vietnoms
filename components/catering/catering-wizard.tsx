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
  PREMADE_BOWL_DEFAULTS,
  calculateEstimate,
  getDeliveryFee,
  distributeEqually,
  getMaxBaseTypes,
  type ProteinSelection,
  type SideSelection,
} from "@/lib/catering-pricing";

type Step = "info" | "style" | "customize" | "checkout";

interface BaseSelection {
  name: string;
  quantity: number;
}

interface WizardState {
  // Step 1 — Info (merged event + contact)
  eventDate: string;
  guestCount: number;
  eventType: string;
  deliveryType: "pickup" | "delivery";
  deliveryAddress: string;
  deliveryDistance: number;
  deliveryPlaceId: string;
  distanceLoading: boolean;
  distanceError: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;

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
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const INITIAL_SIDES: SideSelection[] = SIDE_TYPES.map((name) => ({
  name,
  quantity: 0,
}));

export function CateringWizard() {
  const [step, setStep] = useState<Step>("info");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<"paid" | "emailed" | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  const [state, setState] = useState<WizardState>({
    eventDate: "",
    guestCount: 50,
    eventType: "",
    deliveryType: "pickup",
    deliveryAddress: "",
    deliveryDistance: 0,
    deliveryPlaceId: "",
    distanceLoading: false,
    distanceError: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    notes: "",
    packageType: "",
    proteins: PROTEINS.map((p) => ({
      name: p.name,
      quantity: 0,
      selected: false,
    })),
    bases: BASES.map((b) => ({ name: b.name, quantity: 0 })),
    bigUpActive: false,
    sides: INITIAL_SIDES.map((s) => ({ ...s })),
    noPeanuts: false,
    eggRollCut: "Uncut",
    dietaryNotes: "",
  });

  const update = useCallback(
    <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Protein toggle — select/deselect with redistribution
  const toggleProtein = useCallback((name: string) => {
    setState((prev) => {
      const protein = prev.proteins.find((p) => p.name === name);
      if (!protein) return prev;

      const maxSelected = prev.guestCount >= 80 ? 4 : 3;
      const currentlySelected = prev.proteins.filter((p) => p.selected);
      const baseline = prev.bigUpActive
        ? Math.ceil(BIG_UP_MULTIPLIER * prev.guestCount)
        : prev.guestCount;

      if (protein.selected) {
        // Deselecting
        const remaining = currentlySelected.filter((p) => p.name !== name);
        const distribution = distributeEqually(baseline, remaining.length);
        const remainingNames = remaining.map((p) => p.name);

        return {
          ...prev,
          proteins: prev.proteins.map((p) => {
            if (p.name === name)
              return { ...p, selected: false, quantity: 0 };
            const idx = remainingNames.indexOf(p.name);
            if (idx >= 0) return { ...p, quantity: distribution[idx] };
            return p;
          }),
        };
      } else {
        // Selecting
        if (currentlySelected.length >= maxSelected) return prev;
        const newSelectedNames = [
          ...currentlySelected.map((p) => p.name),
          name,
        ];
        const distribution = distributeEqually(
          baseline,
          newSelectedNames.length
        );

        return {
          ...prev,
          proteins: prev.proteins.map((p) => {
            const idx = newSelectedNames.indexOf(p.name);
            if (idx >= 0)
              return { ...p, selected: true, quantity: distribution[idx] };
            return p;
          }),
        };
      }
    });
  }, []);

  // Protein fine-tune — ±1
  const adjustProtein = useCallback((name: string, delta: number) => {
    setState((prev) => {
      const protein = prev.proteins.find((p) => p.name === name);
      if (!protein || !protein.selected) return prev;

      const newQty = protein.quantity + delta;
      if (newQty < 1) return prev;

      const totalWithout = prev.proteins.reduce(
        (s, p) => (p.name !== name ? s + p.quantity : s),
        0
      );
      if (totalWithout + newQty > 2 * prev.guestCount) return prev;

      return {
        ...prev,
        proteins: prev.proteins.map((p) =>
          p.name === name ? { ...p, quantity: newQty } : p
        ),
      };
    });
  }, []);

  // Big Up toggle — redistributes protein to new baseline
  const toggleBigUp = useCallback(() => {
    setState((prev) => {
      const newBigUp = !prev.bigUpActive;
      const baseline = newBigUp
        ? Math.ceil(BIG_UP_MULTIPLIER * prev.guestCount)
        : prev.guestCount;
      const selected = prev.proteins.filter((p) => p.selected);
      const distribution = distributeEqually(baseline, selected.length);
      const selectedNames = selected.map((p) => p.name);

      return {
        ...prev,
        bigUpActive: newBigUp,
        proteins: prev.proteins.map((p) => {
          const idx = selectedNames.indexOf(p.name);
          if (idx >= 0) return { ...p, quantity: distribution[idx] };
          return p;
        }),
      };
    });
  }, []);

  // Base update with side auto-allocation
  const updateBase = useCallback((name: string, quantity: number) => {
    setState((prev) => {
      const clamped = Math.max(0, quantity);
      const oldBase = prev.bases.find((b) => b.name === name);
      const wasZero = (oldBase?.quantity ?? 0) === 0;
      const maxTypes = getMaxBaseTypes(prev.guestCount);

      // Block adding new type if at max
      if (wasZero && clamped > 0) {
        const currentActiveTypes = prev.bases.filter(
          (b) => b.quantity > 0
        ).length;
        if (currentActiveTypes >= maxTypes) return prev;
      }

      const newBases = prev.bases.map((b) =>
        b.name === name ? { ...b, quantity: clamped } : b
      );

      // Auto-allocate sides (buffet only)
      let newSides = prev.sides;
      if (prev.packageType === "buffet") {
        const riceQty =
          newBases.find((b) => b.name === "Rice")?.quantity ?? 0;
        const vermicelliQty =
          newBases.find((b) => b.name === "Vermicelli Noodles")?.quantity ?? 0;
        newSides = [
          { name: "Shredded Pork", quantity: riceQty },
          { name: "Pork & Shrimp Egg Roll", quantity: vermicelliQty },
          { name: "Vegan Egg Roll", quantity: 0 },
        ];
      }

      return { ...prev, bases: newBases, sides: newSides };
    });
  }, []);

  // Side quantity update
  const updateSideQuantity = useCallback(
    (name: string, quantity: number) => {
      setState((prev) => {
        const clamped = Math.max(0, quantity);
        const newSides = prev.sides.map((s) =>
          s.name === name ? { ...s, quantity: clamped } : s
        );
        const newTotal = newSides.reduce((sum, s) => sum + s.quantity, 0);
        if (newTotal > 2 * prev.guestCount) return prev;
        return { ...prev, sides: newSides };
      });
    },
    []
  );

  const deliveryFee = useMemo(
    () =>
      state.deliveryType === "pickup"
        ? 0
        : getDeliveryFee(state.deliveryDistance),
    [state.deliveryType, state.deliveryDistance]
  );

  const forceEmailOnly =
    state.deliveryType === "delivery" &&
    state.deliveryDistance > MAX_DELIVERY_MILES;

  const estimate = useMemo(
    () =>
      calculateEstimate(
        state.guestCount,
        state.proteins.filter((p) => p.selected),
        state.deliveryType === "pickup" ? 0 : state.deliveryDistance,
        state.bigUpActive,
        state.sides,
        state.packageType as "buffet" | "premade" | ""
      ),
    [
      state.guestCount,
      state.proteins,
      state.deliveryType,
      state.deliveryDistance,
      state.bigUpActive,
      state.sides,
      state.packageType,
    ]
  );

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }, []);

  // Computed sauces for checkout summary
  const riceQty =
    state.bases.find((b) => b.name === "Rice")?.quantity ?? 0;
  const vermicelliQty =
    state.bases.find((b) => b.name === "Vermicelli Noodles")?.quantity ?? 0;
  const saladQty =
    state.bases.find((b) => b.name === "Salad")?.quantity ?? 0;
  const houseSauceCount = riceQty + vermicelliQty;
  const vinaigretteCount = saladQty;
  const hasEggRolls =
    (state.sides.find((s) => s.name === "Pork & Shrimp Egg Roll")?.quantity ??
      0) +
      (state.sides.find((s) => s.name === "Vegan Egg Roll")?.quantity ?? 0) >
    0;

  // Build payload helper
  const buildPayload = useCallback(
    (extra?: Record<string, unknown>) => ({
      eventDate: state.eventDate,
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
      },
      contactName: state.contactName,
      contactEmail: state.contactEmail,
      contactPhone: state.contactPhone,
      deliveryType: state.deliveryType,
      deliveryAddress: state.deliveryAddress || undefined,
      deliveryDistance: state.deliveryDistance || undefined,
      deliveryFee: deliveryFee ?? 0,
      totalAmount: estimate.total,
      notes: [state.dietaryNotes, state.notes].filter(Boolean).join(". "),
      items: state.proteins
        .filter((p) => p.selected && p.quantity > 0)
        .map((p) => ({
          itemName: p.name,
          quantity: p.quantity,
          unitPrice:
            BASE_PRICE_PER_PERSON +
            (PROTEINS.find((pr) => pr.name === p.name)?.upcharge ?? 0),
        })),
      ...extra,
    }),
    [state, deliveryFee, estimate.total]
  );

  const saveDraft = useCallback(async () => {
    if (draftSaved) return;
    try {
      await fetch("/api/catering/save-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      setDraftSaved(true);
    } catch {
      // non-critical
    }
  }, [buildPayload, draftSaved]);

  const handleEmailSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/catering", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setSuccess("emailed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentComplete = async (token: string) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/catering/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload({ paymentToken: token })),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");
      setSuccess("paid");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Reset Step 3 state when switching package type
  const handlePackageSelect = useCallback((pkg: "buffet" | "premade") => {
    setState((prev) => ({
      ...prev,
      packageType: pkg,
      proteins: PROTEINS.map((p) => ({
        name: p.name,
        quantity: 0,
        selected: false,
      })),
      bases: BASES.map((b) => ({ name: b.name, quantity: 0 })),
      sides: INITIAL_SIDES.map((s) => ({ ...s })),
      bigUpActive: false,
      noPeanuts: false,
      eggRollCut: "Uncut" as const,
    }));
  }, []);

  const handleAddressResult = useCallback(
    (result: { address: string; placeId: string; distanceMiles: number }) => {
      setState((prev) => ({
        ...prev,
        deliveryAddress: result.address,
        deliveryPlaceId: result.placeId,
        deliveryDistance: result.distanceMiles,
        distanceError: "",
      }));
    },
    []
  );

  // Step indicator
  const steps: { key: Step; label: string }[] = [
    { key: "info", label: "Info" },
    { key: "style", label: "Style" },
    { key: "customize", label: "Customize" },
    { key: "checkout", label: "Checkout" },
  ];

  const stepIndex = steps.findIndex((s) => s.key === step);

  // Checkout summary helpers
  const activeBases = state.bases.filter((b) => b.quantity > 0);
  const isBuffet = state.packageType === "buffet";

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
            : "We'll get back to you within 24 hours with more details."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex gap-1 mb-8 overflow-x-auto">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                stepIndex >= i
                  ? "bg-brand-red text-white"
                  : "bg-gray-700 text-gray-400"
              }`}
            >
              {i + 1}
            </div>
            <span className="text-xs text-gray-400 hidden sm:inline whitespace-nowrap">
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className="w-4 sm:w-8 h-px bg-gray-600 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Info (Event Details + Contact) */}
      {step === "info" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            if (state.guestCount < 10) {
              setError("Minimum 10 guests required for catering.");
              return;
            }
            if (
              state.deliveryType === "delivery" &&
              !state.deliveryAddress
            ) {
              setError("Please select a delivery address.");
              return;
            }
            setStep("style");
          }}
          className="space-y-6"
        >
          {/* Event Details Section */}
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-white">
              Event Details
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventDate">Event Date *</Label>
                <Input
                  id="eventDate"
                  type="date"
                  required
                  min={minDate}
                  value={state.eventDate}
                  onChange={(e) => update("eventDate", e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 7 days in advance
                </p>
              </div>
              <div>
                <Label htmlFor="guestCount">Number of Guests *</Label>
                <Input
                  id="guestCount"
                  type="number"
                  required
                  min={10}
                  value={state.guestCount}
                  onChange={(e) =>
                    update("guestCount", Number(e.target.value))
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="eventType">Event Type</Label>
              <Input
                id="eventType"
                value={state.eventType}
                onChange={(e) => update("eventType", e.target.value)}
                placeholder="e.g., Corporate lunch, Wedding, Birthday"
              />
            </div>

            {/* Delivery toggle */}
            <div>
              <Label>Pickup or Delivery?</Label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-colors ${
                    state.deliveryType === "pickup"
                      ? "border-brand-red bg-brand-red/5 text-brand-red"
                      : "border-gray-600 text-gray-300 hover:border-gray-400"
                  }`}
                  onClick={() => update("deliveryType", "pickup")}
                >
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Pickup (Free)
                </button>
                <button
                  type="button"
                  className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-colors ${
                    state.deliveryType === "delivery"
                      ? "border-brand-red bg-brand-red/5 text-brand-red"
                      : "border-gray-600 text-gray-300 hover:border-gray-400"
                  }`}
                  onClick={() => update("deliveryType", "delivery")}
                >
                  Delivery
                </button>
              </div>
            </div>

            {state.deliveryType === "pickup" && (
              <p className="text-sm text-gray-400">
                Pickup from 387 S 1st St, San Jose, CA 95113
              </p>
            )}

            {state.deliveryType === "delivery" && (
              <div className="space-y-3">
                <AddressAutocomplete
                  value={state.deliveryAddress}
                  onChange={handleAddressResult}
                  onError={(msg) =>
                    setState((prev) => ({ ...prev, distanceError: msg }))
                  }
                />
                {state.distanceError && (
                  <p className="text-sm text-red-400">
                    {state.distanceError}
                  </p>
                )}
                {state.deliveryDistance > 0 && deliveryFee !== null && (
                  <p className="text-sm text-gray-400">
                    Delivery fee: {formatMoney(deliveryFee)}
                  </p>
                )}
                {forceEmailOnly && (
                  <div className="p-3 bg-amber-900/30 border border-amber-800 rounded-lg text-amber-400 text-sm">
                    Delivery over 20 miles requires a custom quote. You can
                    still submit your inquiry and we&apos;ll work out the
                    details.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Your Information Section */}
          <div className="space-y-4 border-t border-gray-700 pt-6">
            <h2 className="font-display text-xl font-bold text-white">
              Your Information
            </h2>

            <div>
              <Label htmlFor="contactName">Name *</Label>
              <Input
                id="contactName"
                required
                value={state.contactName}
                onChange={(e) => update("contactName", e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="contactEmail">Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                required
                value={state.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <div>
              <Label htmlFor="contactPhone">Phone *</Label>
              <Input
                id="contactPhone"
                type="tel"
                required
                value={state.contactPhone}
                onChange={(e) => update("contactPhone", e.target.value)}
                placeholder="(408) 555-0123"
              />
            </div>
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={state.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Venue details, setup time, parking info..."
                rows={3}
              />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full">
            Continue
          </Button>
        </form>
      )}

      {/* Step 2: Catering Style */}
      {step === "style" && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-white">
            Catering Style
          </h2>
          <p className="text-sm text-gray-400">
            $20/person flat rate for both styles.
          </p>

          <div className="space-y-3">
            <PackageCard
              name="Buffet Style"
              description="Party trays with your choice of bases, proteins, sides, and sauces. Guests serve themselves."
              recommended={state.guestCount >= 40}
              selected={state.packageType === "buffet"}
              onSelect={() => handlePackageSelect("buffet")}
              features={[
                "Best for 40+ guests",
                "Self-serve trays",
                "Choose your bases, sides & sauces",
                "Select up to 3 protein types",
              ]}
            />
            <PackageCard
              name="Pre-made Bowls"
              description="Individually assembled and labeled bowls. Choose a base and protein for each guest."
              recommended={state.guestCount < 40}
              selected={state.packageType === "premade"}
              onSelect={() => handlePackageSelect("premade")}
              features={[
                "Best for under 40 guests",
                "Individual bowls, labeled",
                "Choose base + protein per bowl",
                "Side & sauce included per bowl type",
              ]}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep("info")}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() => {
                if (!state.packageType) {
                  setError("Please select a catering style.");
                  return;
                }
                setError("");
                setStep("customize");
              }}
              className="flex-1"
              disabled={!state.packageType}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Customize */}
      {step === "customize" && state.packageType && (
        <CustomizeStep
          guestCount={state.guestCount}
          packageType={state.packageType as "buffet" | "premade"}
          proteins={state.proteins}
          bases={state.bases}
          sides={state.sides}
          bigUpActive={state.bigUpActive}
          noPeanuts={state.noPeanuts}
          eggRollCut={state.eggRollCut}
          dietaryNotes={state.dietaryNotes}
          estimate={estimate}
          onToggleProtein={toggleProtein}
          onAdjustProtein={adjustProtein}
          onToggleBigUp={toggleBigUp}
          onUpdateBase={updateBase}
          onUpdateSideQuantity={updateSideQuantity}
          onUpdateNoPeanuts={(v) => update("noPeanuts", v)}
          onUpdateEggRollCut={(v) => update("eggRollCut", v)}
          onUpdateDietaryNotes={(v) => update("dietaryNotes", v)}
          onContinue={() => {
            const selectedProteins = state.proteins.filter(
              (p) => p.selected
            );
            if (selectedProteins.length === 0) {
              setError("Please select at least one protein.");
              return;
            }
            const totalB = state.bases.reduce(
              (s, b) => s + b.quantity,
              0
            );
            if (totalB !== state.guestCount) {
              setError(
                `Base servings (${totalB}) must equal ${state.guestCount}.`
              );
              return;
            }
            setError("");
            saveDraft();
            setStep("checkout");
          }}
          onBack={() => setStep("style")}
        />
      )}

      {/* Step 4: Confirm & Checkout */}
      {step === "checkout" && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-white">
            Confirm &amp; Checkout
          </h2>

          {/* Order summary */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">Event Date</div>
                <div className="text-white">{state.eventDate}</div>
                <div className="text-gray-400">Guests</div>
                <div className="text-white">{state.guestCount}</div>
                <div className="text-gray-400">Style</div>
                <div className="text-white capitalize">
                  {state.packageType === "premade"
                    ? "Pre-made Bowls"
                    : "Buffet Style"}
                </div>
                <div className="text-gray-400">Delivery</div>
                <div className="text-white capitalize">
                  {state.deliveryType === "pickup"
                    ? "Pickup (387 S 1st St)"
                    : state.deliveryAddress}
                </div>
              </div>

              {/* Proteins */}
              <div className="border-t border-gray-700 pt-2">
                <h4 className="text-sm font-semibold text-white mb-1">
                  Proteins
                </h4>
                {state.proteins
                  .filter((p) => p.selected && p.quantity > 0)
                  .map((p) => {
                    const info = PROTEINS.find((pr) => pr.name === p.name);
                    return (
                      <div
                        key={p.name}
                        className="flex justify-between text-sm text-gray-400"
                      >
                        <span>
                          {p.name} x{p.quantity}
                        </span>
                        {info && info.upcharge > 0 && (
                          <span>
                            +{formatMoney(info.upcharge * p.quantity)}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Bases */}
              {activeBases.length > 0 && (
                <div className="border-t border-gray-700 pt-2">
                  <h4 className="text-sm font-semibold text-white mb-1">
                    Bases
                  </h4>
                  {activeBases.map((b) => (
                    <div key={b.name} className="text-sm text-gray-400">
                      {b.name} x{b.quantity}
                    </div>
                  ))}
                </div>
              )}

              {/* Sides (buffet) */}
              {isBuffet &&
                state.sides.some((s) => s.quantity > 0) && (
                  <div className="border-t border-gray-700 pt-2">
                    <h4 className="text-sm font-semibold text-white mb-1">
                      Sides
                    </h4>
                    {state.sides
                      .filter((s) => s.quantity > 0)
                      .map((s) => (
                        <div
                          key={s.name}
                          className="text-sm text-gray-400"
                        >
                          {s.name} x{s.quantity}
                        </div>
                      ))}
                    {hasEggRolls && state.eggRollCut !== "Uncut" && (
                      <div className="text-sm text-gray-400">
                        Egg Roll Cut: {state.eggRollCut}
                      </div>
                    )}
                  </div>
                )}

              {/* Sauces (computed) */}
              {(houseSauceCount > 0 || vinaigretteCount > 0) && (
                <div className="border-t border-gray-700 pt-2">
                  <h4 className="text-sm font-semibold text-white mb-1">
                    Sauces
                  </h4>
                  {houseSauceCount > 0 && (
                    <div className="text-sm text-gray-400">
                      House Sauce x{houseSauceCount}
                    </div>
                  )}
                  {vinaigretteCount > 0 && (
                    <div className="text-sm text-gray-400">
                      Vietnoms Vinaigrette x{vinaigretteCount}
                    </div>
                  )}
                </div>
              )}

              {/* Bowl Details (premade) */}
              {!isBuffet && activeBases.length > 0 && (
                <div className="border-t border-gray-700 pt-2">
                  <h4 className="text-sm font-semibold text-white mb-1">
                    Bowl Details
                  </h4>
                  {PREMADE_BOWL_DEFAULTS.filter((d) =>
                    activeBases.some((b) => b.name === d.base)
                  ).map((d) => (
                    <div
                      key={`${d.base}-${d.protein}`}
                      className="text-sm text-gray-400"
                    >
                      {d.base} bowl:{" "}
                      {d.side !== "None" ? `${d.side} + ` : ""}
                      {d.sauce}
                    </div>
                  ))}
                </div>
              )}

              {/* Big Up, No Peanuts */}
              {(state.bigUpActive || state.noPeanuts) && (
                <div className="border-t border-gray-700 pt-2">
                  {state.bigUpActive && (
                    <div className="text-sm text-gray-400">
                      Big Up: Yes (+50% protein)
                    </div>
                  )}
                  {state.noPeanuts && (
                    <div className="text-sm text-gray-400">
                      No Peanuts: Yes
                    </div>
                  )}
                </div>
              )}

              {/* Cost breakdown */}
              <div className="border-t border-gray-700 pt-2 space-y-1 text-sm">
                {estimate.breakdown.map((item) => (
                  <div
                    key={item.label}
                    className="flex justify-between text-gray-400"
                  >
                    <span>{item.label}</span>
                    <span>{formatMoney(item.amount)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-700 pt-1 flex justify-between font-semibold text-white text-base">
                  <span>Total</span>
                  <span className="text-brand-red">
                    {formatMoney(estimate.total)}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-2 text-sm text-gray-400">
                <p>
                  <strong className="text-white">Contact:</strong>{" "}
                  {state.contactName} &middot; {state.contactEmail} &middot;{" "}
                  {state.contactPhone}
                </p>
              </div>
            </CardContent>
          </Card>

          {submitting && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-brand-red mx-auto" />
              <p className="mt-4 text-gray-400">Processing...</p>
            </div>
          )}

          {!submitting && (
            <div className="space-y-3">
              {/* Pay Now option (hidden if 20+ miles) */}
              {!forceEmailOnly && (
                <Card className="border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="h-5 w-5 text-brand-red" />
                      <h3 className="font-display text-base font-bold text-white">
                        Pay Now
                      </h3>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                      Secure payment via Square. Your order will be confirmed
                      immediately.
                    </p>
                    <CateringPayment
                      totalCents={estimate.total}
                      onPaymentComplete={handlePaymentComplete}
                      onError={setError}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Email Us option */}
              <Card className="border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="h-5 w-5 text-brand-yellow" />
                    <h3 className="font-display text-base font-bold text-white">
                      {forceEmailOnly
                        ? "Submit Inquiry"
                        : "Email Us Instead"}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    {forceEmailOnly
                      ? "Delivery over 20 miles requires a custom quote. Submit your details and we'll reach out."
                      : "Prefer to discuss details first? Submit an inquiry and we'll follow up within 24 hours."}
                  </p>
                  <Button
                    onClick={handleEmailSubmit}
                    variant={forceEmailOnly ? "default" : "outline"}
                    className="w-full"
                  >
                    Submit Inquiry
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {!submitting && (
            <Button
              variant="outline"
              onClick={() => setStep("customize")}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
