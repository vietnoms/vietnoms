"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Info } from "lucide-react";
import {
  PROTEINS,
  BASES,
  SIDES,
  SAUCES,
  PREMADE_BOWL_DEFAULTS,
  BUFFET_MIN_PER_PROTEIN,
  type ProteinSelection,
  type CateringEstimate,
} from "@/lib/catering-pricing";

interface BaseSelection {
  name: string;
  quantity: number;
}

interface SideSelection {
  baseName: string;
  side: string;
}

interface SauceSelection {
  baseName: string;
  sauce: string;
}

interface CustomizeStepProps {
  guestCount: number;
  packageType: "buffet" | "premade";
  proteins: ProteinSelection[];
  bases: BaseSelection[];
  sides: SideSelection[];
  sauces: SauceSelection[];
  dietaryNotes: string;
  estimate: CateringEstimate;
  onUpdateProtein: (name: string, quantity: number) => void;
  onUpdateBase: (name: string, quantity: number) => void;
  onUpdateSide: (baseName: string, side: string) => void;
  onUpdateSauce: (baseName: string, sauce: string) => void;
  onUpdateDietaryNotes: (notes: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CustomizeStep({
  guestCount,
  packageType,
  proteins,
  bases,
  sides,
  sauces,
  dietaryNotes,
  estimate,
  onUpdateProtein,
  onUpdateBase,
  onUpdateSide,
  onUpdateSauce,
  onUpdateDietaryNotes,
  onContinue,
  onBack,
}: CustomizeStepProps) {
  const isBuffet = packageType === "buffet";
  const increment = isBuffet ? 10 : 1;

  const totalProteinServings = useMemo(
    () => proteins.reduce((s, p) => s + p.quantity, 0),
    [proteins]
  );

  const totalBaseServings = useMemo(
    () => bases.reduce((s, b) => s + b.quantity, 0),
    [bases]
  );

  const hasTofuSelected = useMemo(
    () => proteins.find((p) => p.name === "Stir-fried Tofu")?.quantity ?? 0 > 0,
    [proteins]
  );

  const canContinue =
    totalProteinServings === guestCount && totalBaseServings === guestCount;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-white">
          Customize Your Order
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          {guestCount} guests &mdash; select proteins and bases totaling{" "}
          {guestCount} servings each.
        </p>
      </div>

      {/* Protein Selection */}
      <div>
        <Label className="text-base font-semibold">
          Protein Selection
          {isBuffet && (
            <span className="text-xs font-normal text-gray-400 ml-2">
              (min {BUFFET_MIN_PER_PROTEIN} per protein for buffet)
            </span>
          )}
        </Label>
        <p className="text-xs text-gray-500 mb-3">
          Total servings should equal {guestCount}.
        </p>

        <div className="space-y-2">
          {PROTEINS.map((protein) => {
            const sel = proteins.find((p) => p.name === protein.name);
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
                      onUpdateProtein(
                        protein.name,
                        (sel?.quantity ?? 0) - increment
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
                      onUpdateProtein(
                        protein.name,
                        (sel?.quantity ?? 0) + increment
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
              totalProteinServings === guestCount
                ? "text-green-400"
                : "text-amber-400"
            }`}
          >
            {totalProteinServings} / {guestCount} protein servings selected
          </p>
        )}
      </div>

      {/* Base Selection */}
      <div>
        <Label className="text-base font-semibold">Base Selection</Label>
        <p className="text-xs text-gray-500 mb-3">
          Total servings should equal {guestCount}.
        </p>

        <div className="space-y-2">
          {BASES.map((base) => {
            const sel = bases.find((b) => b.name === base.name);
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
                    className="h-8 w-8 rounded-full bg-gray-700 text-white text-sm hover:bg-gray-600"
                    onClick={() =>
                      onUpdateBase(base.name, (sel?.quantity ?? 0) - increment)
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
                      onUpdateBase(base.name, (sel?.quantity ?? 0) + increment)
                    }
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

      {/* Sides & Sauces — Buffet: editable, Premade: info card */}
      {isBuffet ? (
        <>
          {/* Buffet sides */}
          {bases.some((b) => b.quantity > 0) && (
            <div>
              <Label className="text-base font-semibold">Sides</Label>
              <p className="text-xs text-gray-500 mb-3">
                One side per base type.
              </p>

              {hasTofuSelected && (
                <div className="flex items-start gap-2 p-3 mb-3 bg-brand-yellow/10 border border-brand-yellow/30 rounded-lg text-sm text-brand-yellow">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    We have vegan egg rolls available for tofu orders.
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {bases
                  .filter((b) => b.quantity > 0 && b.name !== "Salad")
                  .map((b) => {
                    const sel = sides.find((s) => s.baseName === b.name);
                    return (
                      <div key={b.name} className="bg-surface-alt rounded-lg px-4 py-3">
                        <label className="text-xs text-gray-400 block mb-1">
                          Side for {b.name}
                        </label>
                        <select
                          className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-brand-red outline-none"
                          value={sel?.side ?? ""}
                          onChange={(e) => onUpdateSide(b.name, e.target.value)}
                        >
                          {SIDES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                {bases.find((b) => b.name === "Salad" && b.quantity > 0) && (
                  <div className="bg-surface-alt rounded-lg px-4 py-3">
                    <label className="text-xs text-gray-400 block mb-1">
                      Side for Salad
                    </label>
                    <p className="text-sm text-gray-500 italic">No side</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Buffet sauces */}
          {bases.some((b) => b.quantity > 0) && (
            <div>
              <Label className="text-base font-semibold">Sauces</Label>
              <p className="text-xs text-gray-500 mb-3">
                One sauce per base type. Served on the side.
              </p>
              <div className="space-y-3">
                {bases
                  .filter((b) => b.quantity > 0)
                  .map((b) => {
                    const sel = sauces.find((s) => s.baseName === b.name);
                    const isSalad = b.name === "Salad";
                    return (
                      <div key={b.name} className="bg-surface-alt rounded-lg px-4 py-3">
                        <label className="text-xs text-gray-400 block mb-1">
                          Sauce for {b.name}{" "}
                          <span className="text-gray-500">
                            ({isSalad ? "20oz" : "24oz"} per 10 servings)
                          </span>
                        </label>
                        {isSalad ? (
                          <p className="text-sm text-gray-300">
                            Vietnoms Vinaigrette
                          </p>
                        ) : (
                          <select
                            className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-brand-red outline-none"
                            value={sel?.sauce ?? ""}
                            onChange={(e) =>
                              onUpdateSauce(b.name, e.target.value)
                            }
                          >
                            {SAUCES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
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
