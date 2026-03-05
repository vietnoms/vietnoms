"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { PackageCard } from "./package-card";
import { CateringPayment } from "./catering-payment";
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
  BASE_PRICE_PER_PERSON,
  BUFFET_MIN_PER_PROTEIN,
  MAX_DELIVERY_MILES,
  calculateEstimate,
  getDeliveryFee,
  type ProteinSelection,
} from "@/lib/catering-pricing";

type Step = "event" | "style" | "customize" | "contact" | "checkout";

interface WizardState {
  // Step 1
  eventDate: string;
  guestCount: number;
  eventType: string;
  deliveryType: "pickup" | "delivery";
  deliveryAddress: string;
  deliveryDistance: number;
  // Step 2
  packageType: "buffet" | "premade" | "";
  // Step 3
  proteins: ProteinSelection[];
  eggRollType: "pork-shrimp" | "vegan";
  dietaryNotes: string;
  // Step 4
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CateringWizard() {
  const [step, setStep] = useState<Step>("event");
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
    packageType: "",
    proteins: PROTEINS.map((p) => ({ name: p.name, quantity: 0 })),
    eggRollType: "pork-shrimp",
    dietaryNotes: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    notes: "",
  });

  const update = useCallback(
    <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateProtein = useCallback((name: string, quantity: number) => {
    setState((prev) => ({
      ...prev,
      proteins: prev.proteins.map((p) =>
        p.name === name ? { ...p, quantity: Math.max(0, quantity) } : p
      ),
    }));
  }, []);

  const totalProteinServings = useMemo(
    () => state.proteins.reduce((s, p) => s + p.quantity, 0),
    [state.proteins]
  );

  const deliveryFee = useMemo(
    () =>
      state.deliveryType === "pickup"
        ? 0
        : getDeliveryFee(state.deliveryDistance),
    [state.deliveryType, state.deliveryDistance]
  );

  const forceEmailOnly =
    state.deliveryType === "delivery" && state.deliveryDistance > MAX_DELIVERY_MILES;

  const estimate = useMemo(
    () =>
      calculateEstimate(
        state.guestCount,
        state.proteins.filter((p) => p.quantity > 0),
        state.deliveryType === "pickup" ? 0 : state.deliveryDistance
      ),
    [state.guestCount, state.proteins, state.deliveryType, state.deliveryDistance]
  );

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }, []);

  // Save draft when user reaches step 4 (contact) and fills info
  const saveDraft = useCallback(async () => {
    if (draftSaved) return;
    try {
      await fetch("/api/catering/save-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventDate: state.eventDate,
          guestCount: state.guestCount,
          packageType: state.packageType,
          customizations: {
            eventType: state.eventType,
            proteins: state.proteins.filter((p) => p.quantity > 0),
            eggRollType: state.eggRollType,
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
            .filter((p) => p.quantity > 0)
            .map((p) => ({
              itemName: p.name,
              quantity: p.quantity,
              unitPrice:
                BASE_PRICE_PER_PERSON +
                (PROTEINS.find((pr) => pr.name === p.name)?.upcharge ?? 0),
            })),
        }),
      });
      setDraftSaved(true);
    } catch {
      // non-critical
    }
  }, [state, draftSaved, deliveryFee, estimate.total]);

  const handleEmailSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/catering", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventDate: state.eventDate,
          guestCount: state.guestCount,
          packageType: state.packageType,
          customizations: {
            eventType: state.eventType,
            proteins: state.proteins.filter((p) => p.quantity > 0),
            eggRollType: state.eggRollType,
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
            .filter((p) => p.quantity > 0)
            .map((p) => ({
              itemName: p.name,
              quantity: p.quantity,
              unitPrice:
                BASE_PRICE_PER_PERSON +
                (PROTEINS.find((pr) => pr.name === p.name)?.upcharge ?? 0),
            })),
        }),
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
        body: JSON.stringify({
          eventDate: state.eventDate,
          guestCount: state.guestCount,
          packageType: state.packageType,
          customizations: {
            eventType: state.eventType,
            proteins: state.proteins.filter((p) => p.quantity > 0),
            eggRollType: state.eggRollType,
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
            .filter((p) => p.quantity > 0)
            .map((p) => ({
              itemName: p.name,
              quantity: p.quantity,
              unitPrice:
                BASE_PRICE_PER_PERSON +
                (PROTEINS.find((pr) => pr.name === p.name)?.upcharge ?? 0),
            })),
          paymentToken: token,
        }),
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

  // Step indicator
  const steps: { key: Step; label: string }[] = [
    { key: "event", label: "Event" },
    { key: "style", label: "Style" },
    { key: "customize", label: "Customize" },
    { key: "contact", label: "Contact" },
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

      {/* Step 1: Event Details */}
      {step === "event" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            if (state.guestCount < 10) {
              setError("Minimum 10 guests required for catering.");
              return;
            }
            setStep("style");
          }}
          className="space-y-4"
        >
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
                onChange={(e) => update("guestCount", Number(e.target.value))}
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
              <div>
                <Label htmlFor="deliveryAddress">Delivery Address *</Label>
                <Input
                  id="deliveryAddress"
                  required
                  value={state.deliveryAddress}
                  onChange={(e) => update("deliveryAddress", e.target.value)}
                  placeholder="Enter full address"
                />
              </div>
              <div>
                <Label htmlFor="deliveryDistance">
                  Approximate Distance (miles from San Jose) *
                </Label>
                <Input
                  id="deliveryDistance"
                  type="number"
                  required
                  min={0}
                  step={0.5}
                  value={state.deliveryDistance || ""}
                  onChange={(e) =>
                    update("deliveryDistance", Number(e.target.value))
                  }
                  placeholder="e.g., 8"
                />
              </div>
              {state.deliveryDistance > 0 && deliveryFee !== null && (
                <p className="text-sm text-gray-400">
                  Delivery fee: {formatMoney(deliveryFee)}
                </p>
              )}
              {forceEmailOnly && (
                <div className="p-3 bg-amber-900/30 border border-amber-800 rounded-lg text-amber-400 text-sm">
                  Delivery over 20 miles requires a custom quote. You can still
                  submit your inquiry and we&apos;ll work out the details.
                </div>
              )}
            </div>
          )}

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
              description="Party trays of vermicelli noodles, white rice, salad, proteins, and egg rolls. Guests serve themselves."
              recommended={state.guestCount >= 40}
              selected={state.packageType === "buffet"}
              onSelect={() => update("packageType", "buffet")}
              features={[
                "Best for 40+ guests",
                "Self-serve trays",
                "Min 10 orders per protein type",
                "Includes all toppings & sauces",
              ]}
            />
            <PackageCard
              name="Pre-made Bowls"
              description="Individually assembled and labeled bowls. Each guest picks their protein."
              recommended={state.guestCount < 40}
              selected={state.packageType === "premade"}
              onSelect={() => update("packageType", "premade")}
              features={[
                "Best for under 40 guests",
                "Individual bowls, labeled",
                "Each with noodles, protein, toppings, sauce",
                "1 egg roll per serving",
              ]}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("event")} className="flex-1">
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
      {step === "customize" && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-white">
            Customize Your Order
          </h2>
          <p className="text-sm text-gray-400">
            {state.guestCount} guests &times; $20.00/person = {formatMoney(state.guestCount * BASE_PRICE_PER_PERSON)} base
          </p>

          <div>
            <Label className="text-base font-semibold">
              Protein Selection
              {state.packageType === "buffet" && (
                <span className="text-xs font-normal text-gray-400 ml-2">
                  (min {BUFFET_MIN_PER_PROTEIN} per protein for buffet)
                </span>
              )}
            </Label>
            <p className="text-xs text-gray-500 mb-3">
              Total servings should equal {state.guestCount} (your guest count).
            </p>

            <div className="space-y-2">
              {PROTEINS.map((protein) => {
                const sel = state.proteins.find((p) => p.name === protein.name);
                return (
                  <div
                    key={protein.name}
                    className="flex items-center justify-between bg-surface-alt rounded-lg px-4 py-3"
                  >
                    <div>
                      <span className="text-sm text-white font-medium">
                        {protein.name}
                      </span>
                      {protein.upcharge > 0 && (
                        <span className="text-xs text-brand-yellow ml-2">
                          +{formatMoney(protein.upcharge)}/serving
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="h-8 w-8 rounded-full bg-gray-700 text-white text-sm hover:bg-gray-600"
                        onClick={() =>
                          updateProtein(
                            protein.name,
                            (sel?.quantity ?? 0) -
                              (state.packageType === "buffet" ? 10 : 1)
                          )
                        }
                      >
                        -
                      </button>
                      <span className="w-10 text-center text-sm text-white font-semibold">
                        {sel?.quantity ?? 0}
                      </span>
                      <button
                        type="button"
                        className="h-8 w-8 rounded-full bg-gray-700 text-white text-sm hover:bg-gray-600"
                        onClick={() =>
                          updateProtein(
                            protein.name,
                            (sel?.quantity ?? 0) +
                              (state.packageType === "buffet" ? 10 : 1)
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalProteinServings > 0 && (
              <p
                className={`text-sm mt-2 ${
                  totalProteinServings === state.guestCount
                    ? "text-green-400"
                    : "text-amber-400"
                }`}
              >
                {totalProteinServings} / {state.guestCount} servings selected
              </p>
            )}
          </div>

          <div>
            <Label>Egg Roll Preference</Label>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  state.eggRollType === "pork-shrimp"
                    ? "border-brand-red bg-brand-red/5 text-brand-red"
                    : "border-gray-600 text-gray-300 hover:border-gray-400"
                }`}
                onClick={() => update("eggRollType", "pork-shrimp")}
              >
                Pork &amp; Shrimp
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  state.eggRollType === "vegan"
                    ? "border-brand-red bg-brand-red/5 text-brand-red"
                    : "border-gray-600 text-gray-300 hover:border-gray-400"
                }`}
                onClick={() => update("eggRollType", "vegan")}
              >
                Vegan
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="dietaryNotes">Dietary Needs / Notes</Label>
            <Textarea
              id="dietaryNotes"
              value={state.dietaryNotes}
              onChange={(e) => update("dietaryNotes", e.target.value)}
              placeholder="Allergies, dietary restrictions, special requests..."
              rows={2}
            />
          </div>

          {/* Live estimate */}
          <Card className="border-brand-red/20">
            <CardContent className="p-4">
              <h3 className="font-display text-sm font-bold text-white mb-2">
                Estimated Total
              </h3>
              <div className="space-y-1 text-sm">
                {estimate.breakdown.map((item) => (
                  <div
                    key={item.label}
                    className="flex justify-between text-gray-400"
                  >
                    <span>{item.label}</span>
                    <span>{formatMoney(item.amount)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-700 pt-1 flex justify-between font-semibold text-white">
                  <span>Total</span>
                  <span className="text-brand-red">
                    {formatMoney(estimate.total)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("style")} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() => {
                if (totalProteinServings === 0) {
                  setError("Please select at least one protein.");
                  return;
                }
                setError("");
                setStep("contact");
              }}
              className="flex-1"
              disabled={totalProteinServings === 0}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Contact Info */}
      {step === "contact" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            // Save draft for abandoned checkout tracking
            saveDraft();
            setStep("checkout");
          }}
          className="space-y-4"
        >
          <h2 className="font-display text-xl font-bold text-white">
            Contact Information
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

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("customize")} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button type="submit" className="flex-1">
              Review &amp; Checkout
            </Button>
          </div>
        </form>
      )}

      {/* Step 5: Confirm & Checkout */}
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
                <div className="text-white capitalize">{state.packageType === "premade" ? "Pre-made Bowls" : "Buffet Style"}</div>
                <div className="text-gray-400">Delivery</div>
                <div className="text-white capitalize">
                  {state.deliveryType === "pickup"
                    ? "Pickup (387 S 1st St)"
                    : state.deliveryAddress}
                </div>
              </div>

              <div className="border-t border-gray-700 pt-2">
                <h4 className="text-sm font-semibold text-white mb-1">
                  Proteins
                </h4>
                {state.proteins
                  .filter((p) => p.quantity > 0)
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
                          <span>+{formatMoney(info.upcharge * p.quantity)}</span>
                        )}
                      </div>
                    );
                  })}
              </div>

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
                      {forceEmailOnly ? "Submit Inquiry" : "Email Us Instead"}
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
              onClick={() => setStep("contact")}
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
