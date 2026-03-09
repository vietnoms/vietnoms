"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Check, Minus, Plus } from "lucide-react";
import {
  PROTEINS,
  BASES,
  PREMADE_BOWL_DEFAULTS,
  BIG_UP_MULTIPLIER,
  type ProteinSelection,
  type SideSelection,
  type CateringEstimate,
  getMaxBaseTypes,
} from "@/lib/catering-pricing";

interface BaseSelection {
  name: string;
  quantity: number;
}

interface CustomizeStepProps {
  guestCount: number;
  packageType: "buffet" | "premade";
  proteins: ProteinSelection[];
  bases: BaseSelection[];
  sides: SideSelection[];
  bigUpActive: boolean;
  noPeanuts: boolean;
  eggRollCut: "1/2" | "1/4" | "Uncut";
  dietaryNotes: string;
  estimate: CateringEstimate;
  onToggleProtein: (name: string) => void;
  onAdjustProtein: (name: string, delta: number) => void;
  onToggleBigUp: () => void;
  onUpdateBase: (name: string, quantity: number) => void;
  onUpdateSideQuantity: (name: string, quantity: number) => void;
  onUpdateNoPeanuts: (value: boolean) => void;
  onUpdateEggRollCut: (value: "1/2" | "1/4" | "Uncut") => void;
  onUpdateDietaryNotes: (notes: string) => void;
  utensils: { napkins: boolean; forks: boolean; chopsticks: boolean };
  onUpdateUtensils: (utensils: { napkins: boolean; forks: boolean; chopsticks: boolean }) => void;
  onContinue: () => void;
  onBack: () => void;
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getBadgeClass(badge: string): string {
  switch (badge) {
    case "Customer Favorite":
      return "bg-amber-900/50 text-amber-400";
    case "Spicy":
      return "bg-red-900/50 text-red-400";
    case "Gluten-Free":
      return "bg-emerald-900/50 text-emerald-400";
    case "Vegan":
    case "Vegetarian":
      return "bg-green-900/50 text-green-400";
    default:
      return "bg-gray-700 text-gray-400";
  }
}

export function CustomizeStep({
  guestCount,
  packageType,
  proteins,
  bases,
  sides,
  bigUpActive,
  noPeanuts,
  eggRollCut,
  dietaryNotes,
  estimate,
  onToggleProtein,
  onAdjustProtein,
  onToggleBigUp,
  onUpdateBase,
  onUpdateSideQuantity,
  onUpdateNoPeanuts,
  onUpdateEggRollCut,
  onUpdateDietaryNotes,
  utensils,
  onUpdateUtensils,
  onContinue,
  onBack,
}: CustomizeStepProps) {
  const isBuffet = packageType === "buffet";
  const increment = isBuffet ? 10 : 1;
  const maxProteins = guestCount >= 80 ? 4 : 3;
  const maxBaseTypes = getMaxBaseTypes(guestCount);

  const selectedProteins = useMemo(
    () => proteins.filter((p) => p.selected),
    [proteins]
  );

  const totalProteinServings = useMemo(
    () => proteins.reduce((s, p) => s + p.quantity, 0),
    [proteins]
  );

  const proteinBaseline = useMemo(
    () =>
      bigUpActive
        ? Math.ceil(BIG_UP_MULTIPLIER * guestCount)
        : guestCount,
    [bigUpActive, guestCount]
  );

  const totalBaseServings = useMemo(
    () => bases.reduce((s, b) => s + b.quantity, 0),
    [bases]
  );

  const totalSides = useMemo(
    () => sides.reduce((s, sd) => s + sd.quantity, 0),
    [sides]
  );

  const activeBaseTypeCount = useMemo(
    () => bases.filter((b) => b.quantity > 0).length,
    [bases]
  );

  const riceQty = bases.find((b) => b.name === "Rice")?.quantity ?? 0;
  const vermicelliQty =
    bases.find((b) => b.name === "Vermicelli Noodles")?.quantity ?? 0;
  const saladQty = bases.find((b) => b.name === "Salad")?.quantity ?? 0;
  const houseSauceCount = riceQty + vermicelliQty;
  const vinaigretteCount = saladQty;

  const eggRollTotal =
    (sides.find((s) => s.name === "Pork & Shrimp Egg Roll")?.quantity ?? 0) +
    (sides.find((s) => s.name === "Vegan Egg Roll")?.quantity ?? 0);

  const canContinue =
    selectedProteins.length > 0 && totalBaseServings === guestCount;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-white">
          Customize Your Order
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          {guestCount} guests &mdash; select your proteins, bases, and sides.
        </p>
      </div>

      {/* Buffet disclaimer */}
      {isBuffet && (
        <div className="p-4 bg-amber-900/20 border border-amber-700 rounded-lg text-amber-300 text-sm">
          <p className="font-medium mb-1">Please Note</p>
          <p>
            We do not provide chafing dishes or serving utensils for regular
            catering orders. For special occasions, large orders, or if you
            require additional set-up or clean-up services, please submit an
            inquiry and we can work out the details.
          </p>
        </div>
      )}

      {/* Protein Selection */}
      <div>
        <Label className="text-base font-semibold">Protein Selection</Label>
        <p className="text-xs text-gray-500 mb-3">
          Select up to {maxProteins} proteins. Servings auto-distribute evenly.
        </p>

        <div className="space-y-2">
          {PROTEINS.map((protein) => {
            const sel = proteins.find((p) => p.name === protein.name);
            const isSelected = sel?.selected ?? false;
            const qty = sel?.quantity ?? 0;
            const canSelect = isSelected || selectedProteins.length < maxProteins;

            return (
              <div
                key={protein.name}
                className={`rounded-lg border-2 transition-colors ${
                  isSelected
                    ? "border-brand-red bg-brand-red/5"
                    : canSelect
                      ? "border-gray-600 bg-surface-alt hover:border-gray-400 cursor-pointer"
                      : "border-gray-700 bg-surface-alt opacity-50"
                }`}
                onClick={() => canSelect && onToggleProtein(protein.name)}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? "bg-brand-red border-brand-red"
                          : "border-gray-500"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-white font-medium">
                          {protein.name}
                        </span>
                        {protein.upcharge > 0 && (
                          <span className="text-xs text-brand-yellow">
                            +{formatMoney(protein.upcharge)}/serving
                          </span>
                        )}
                      </div>
                      {protein.badges.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {protein.badges.map((badge) => (
                            <span
                              key={badge}
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getBadgeClass(badge)}`}
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fine-tune controls */}
                {isSelected && (
                  <div
                    className="flex items-center justify-end gap-2 px-4 pb-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="h-7 w-7 rounded-full bg-gray-700 text-white text-sm hover:bg-gray-600 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={() => onAdjustProtein(protein.name, -1)}
                      disabled={qty <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-10 text-center text-sm text-white font-semibold">
                      {qty}
                    </span>
                    <button
                      type="button"
                      className="h-7 w-7 rounded-full bg-gray-700 text-white text-sm hover:bg-gray-600 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={() => onAdjustProtein(protein.name, 1)}
                      disabled={
                        totalProteinServings >= 2 * guestCount
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {totalProteinServings > 0 && (
          <p className="text-sm mt-2 text-gray-400">
            {totalProteinServings} protein servings
            {totalProteinServings > proteinBaseline && (
              <span className="text-brand-yellow">
                {" "}
                (+{totalProteinServings - proteinBaseline} extra @ $4 each)
              </span>
            )}
          </p>
        )}
      </div>

      {/* Big Up Feature — Buffet only, 30+ guests */}
      {isBuffet && guestCount >= 30 && (
        <Card
          className={`border-2 transition-colors ${
            bigUpActive ? "border-brand-red" : "border-gray-700"
          }`}
        >
          <CardContent className="p-4">
            <h3 className="font-display text-sm font-bold text-white mb-2">
              Big Up Your Order
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              If you have the budget for it, we recommend Bigging up your order.
              Add 50% more protein for $4 per person. That way you won&apos;t
              run out of meat!
            </p>
            <Button
              variant={bigUpActive ? "default" : "outline"}
              size="sm"
              onClick={onToggleBigUp}
              className={bigUpActive ? "bg-brand-red hover:bg-brand-red/90" : ""}
            >
              {bigUpActive ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Big Up Active
                </>
              ) : (
                "Big Up"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Base Selection */}
      <div>
        <Label className="text-base font-semibold">Base Selection</Label>
        <p className="text-xs text-gray-500 mb-3">
          Total servings should equal {guestCount}.
          {maxBaseTypes < BASES.length && (
            <span>
              {" "}
              (max {maxBaseTypes} base type
              {maxBaseTypes > 1 ? "s" : ""} for your party size)
            </span>
          )}
        </p>

        <div className="space-y-2">
          {BASES.map((base) => {
            const sel = bases.find((b) => b.name === base.name);
            const qty = sel?.quantity ?? 0;
            const disablePlus =
              qty === 0 && activeBaseTypeCount >= maxBaseTypes;

            return (
              <div
                key={base.name}
                className="flex items-center justify-between bg-surface-alt rounded-lg px-4 py-3"
              >
                <span className="text-sm text-white font-medium">
                  {base.name}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full bg-gray-700 text-white text-sm hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    onClick={() => onUpdateBase(base.name, qty - increment)}
                    disabled={qty <= 0}
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-sm text-white font-semibold">
                    {qty}
                  </span>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full bg-gray-700 text-white text-sm hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    onClick={() => onUpdateBase(base.name, qty + increment)}
                    disabled={disablePlus}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {totalBaseServings > 0 && (
          <p
            className={`text-sm mt-2 ${
              totalBaseServings === guestCount
                ? "text-green-400"
                : "text-amber-400"
            }`}
          >
            {totalBaseServings} / {guestCount} base servings selected
          </p>
        )}
      </div>

      {/* Sides — Buffet: quantity controls, Premade: info card */}
      {isBuffet ? (
        <div>
          <Label className="text-base font-semibold">Sides</Label>
          <p className="text-xs text-gray-500 mb-3">
            {totalSides} / {guestCount} sides included free
            {totalSides > guestCount && (
              <span className="text-brand-yellow">
                {" "}
                (extra sides $3 each)
              </span>
            )}
          </p>

          <div className="space-y-2">
            {sides.map((side) => (
              <div
                key={side.name}
                className="flex items-center justify-between bg-surface-alt rounded-lg px-4 py-3"
              >
                <span className="text-sm text-white font-medium">
                  {side.name}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full bg-gray-700 text-white text-sm hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    onClick={() =>
                      onUpdateSideQuantity(side.name, side.quantity - 1)
                    }
                    disabled={side.quantity <= 0}
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-sm text-white font-semibold">
                    {side.quantity}
                  </span>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full bg-gray-700 text-white text-sm hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    onClick={() =>
                      onUpdateSideQuantity(side.name, side.quantity + 1)
                    }
                    disabled={totalSides >= 2 * guestCount}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Egg Roll Cut Toggle */}
          {eggRollTotal > 0 && (
            <div className="mt-3">
              <label className="text-xs text-gray-400 block mb-2">
                Egg Roll Cut
              </label>
              <div className="flex gap-2">
                {(["1/2", "1/4", "Uncut"] as const).map((cut) => (
                  <button
                    key={cut}
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      eggRollCut === cut
                        ? "border-brand-red bg-brand-red/5 text-brand-red"
                        : "border-gray-600 text-gray-300 hover:border-gray-400"
                    }`}
                    onClick={() => onUpdateEggRollCut(cut)}
                  >
                    {cut}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Premade: read-only info card */
        <Card className="border-gray-700">
          <CardContent className="p-4">
            <h3 className="font-display text-sm font-bold text-white mb-3">
              What&apos;s Included in Each Bowl
            </h3>
            <div className="space-y-2 text-sm">
              {PREMADE_BOWL_DEFAULTS.map((d) => (
                <div
                  key={`${d.base}-${d.protein}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-1 text-gray-400"
                >
                  <span className="text-white font-medium">
                    {d.protein === "Any" || d.protein === "Any (non-tofu)"
                      ? d.base + " bowl"
                      : "Tofu " + d.base.toLowerCase() + " bowl"}
                    :
                  </span>
                  <span>
                    {d.side !== "None" && `${d.side} + `}
                    {d.sauce}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toppings */}
      <div>
        <Label className="text-base font-semibold">Toppings</Label>
        <p className="text-sm text-gray-400 mt-1">
          Every serving comes with: lettuce, cucumber, cilantro, bean sprouts,
          mint, pickled daikon and carrots, scallion oil, peanuts
        </p>
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={noPeanuts}
            onChange={(e) => onUpdateNoPeanuts(e.target.checked)}
            className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-brand-red focus:ring-brand-red accent-[#c62828]"
          />
          <span className="text-sm text-white font-medium">NO PEANUTS</span>
        </label>
      </div>

      {/* Sauces — computed display */}
      {(houseSauceCount > 0 || vinaigretteCount > 0) && (
        <div>
          <Label className="text-base font-semibold">Sauces</Label>
          <div className="text-sm text-gray-400 mt-1 space-y-1">
            {houseSauceCount > 0 && (
              <p>
                You&apos;ll receive {houseSauceCount} servings of House Sauce
              </p>
            )}
            {vinaigretteCount > 0 && (
              <p>
                You&apos;ll receive {vinaigretteCount} servings of Vietnoms
                Vinaigrette
              </p>
            )}
          </div>
        </div>
      )}

      {/* Dietary Notes */}
      <div>
        <Label htmlFor="dietaryNotes">Dietary Needs / Notes</Label>
        <Textarea
          id="dietaryNotes"
          value={dietaryNotes}
          onChange={(e) => onUpdateDietaryNotes(e.target.value)}
          placeholder="Allergies, dietary restrictions, special requests..."
          rows={2}
        />
      </div>

      {/* Utensils & Supplies */}
      <div>
        <Label className="text-base font-semibold">Utensils &amp; Supplies</Label>
        <p className="text-xs text-gray-500 mb-2">
          Select any utensils you&apos;d like included with your order.
        </p>
        {(["napkins", "forks", "chopsticks"] as const).map((item) => (
          <label key={item} className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={utensils[item]}
              onChange={(e) =>
                onUpdateUtensils({ ...utensils, [item]: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-brand-red focus:ring-brand-red accent-[#c62828]"
            />
            <span className="text-sm text-white font-medium capitalize">
              {item}
            </span>
          </label>
        ))}
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
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={onContinue}
          className="flex-1"
          disabled={!canContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
