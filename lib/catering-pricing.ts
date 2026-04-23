export const BASE_PRICE_PER_PERSON = 2000; // $20.00 in cents
export const CATERING_TAX_RATE = 0.10; // 10% sales tax

export const RESTAURANT_ORIGIN = "387 S 1st St, San Jose, CA 95113";

export const EXTRA_PROTEIN_PRICE = 400;       // $4/serving
export const BIG_UP_PRICE_PER_PERSON = 400;   // $4/person
export const EXTRA_SIDE_PRICE = 300;           // $3/side
export const BIG_UP_MULTIPLIER = 1.5;

export const PROTEINS = [
  { name: "Lemongrass Chicken", upcharge: 0, badges: ["Customer Favorite"] },
  { name: "Lemongrass Pork", upcharge: 0, badges: ["Customer Favorite"] },
  { name: "Red Hot Beef", upcharge: 100, badges: ["Spicy", "Gluten-Free"] },
  { name: "Grilled Shrimp", upcharge: 250, badges: [] as string[] },
  { name: "Stir-fried Tofu", upcharge: 0, badges: ["Vegan", "Vegetarian"] },
];

export const BASES = [
  { name: "Rice", defaultSide: "Shredded Pork", defaultSauce: "House Sauce" },
  { name: "Vermicelli Noodles", defaultSide: "Pork & Shrimp Egg Rolls", defaultSauce: "House Sauce" },
  { name: "Salad", defaultSide: "None", defaultSauce: "Vietnoms Vinaigrette" },
] as const;

export const SIDE_TYPES = [
  "Shredded Pork",
  "Pork & Shrimp Egg Roll",
  "Vegan Egg Roll",
] as const;

export const PREMADE_BOWL_DEFAULTS = [
  { base: "Vermicelli Noodles", protein: "Any (non-tofu)", side: "Pork & shrimp egg roll", sauce: "2oz house sauce" },
  { base: "Vermicelli Noodles", protein: "Stir-fried Tofu", side: "Vegan egg roll", sauce: "2oz vegan soy sauce" },
  { base: "Rice", protein: "Any", side: "Shredded pork", sauce: "2oz house sauce" },
  { base: "Salad", protein: "Any", side: "None", sauce: "2oz Vietnoms vinaigrette" },
] as const;

export const DELIVERY_TIERS = [
  { maxMiles: 0, fee: 0, label: "Pickup" },
  { maxMiles: 5, fee: 1000, label: "0-5 miles" },     // $10
  { maxMiles: 15, fee: 1500, label: "5-15 miles" },    // $15
  { maxMiles: 20, fee: 2000, label: "15-20 miles" },   // $20
] as const;

export const MAX_DELIVERY_MILES = 20;

export interface ProteinSelection {
  name: string;
  quantity: number;
  selected: boolean;
}

export interface SideSelection {
  name: string;
  quantity: number;
}

export interface CateringEstimate {
  baseCost: number;
  proteinUpcharges: number;
  deliveryFee: number;
  bigUpSurcharge: number;
  extraProteinSurcharge: number;
  extraSideSurcharge: number;
  total: number;
  breakdown: {
    label: string;
    amount: number;
  }[];
}

export function getDeliveryFee(miles: number): number | null {
  if (miles <= 0) return 0; // pickup
  for (const tier of DELIVERY_TIERS) {
    if (tier.maxMiles === 0) continue;
    if (miles <= tier.maxMiles) return tier.fee;
  }
  return null; // over 20 miles — must inquire
}

export function distributeEqually(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function getMaxBaseTypes(guestCount: number): number {
  return Math.min(BASES.length, Math.floor(guestCount / 20) + 1);
}

export function calculateEstimate(
  guestCount: number,
  proteins: ProteinSelection[],
  deliveryMiles: number,
  bigUpActive: boolean,
  sides: SideSelection[],
  packageType: "buffet" | "premade" | ""
): CateringEstimate {
  const baseCost = guestCount * BASE_PRICE_PER_PERSON;

  let proteinUpcharges = 0;
  for (const sel of proteins) {
    const protein = PROTEINS.find((p) => p.name === sel.name);
    if (protein && protein.upcharge > 0) {
      proteinUpcharges += protein.upcharge * sel.quantity;
    }
  }

  const deliveryFee = getDeliveryFee(deliveryMiles) ?? 0;

  const bigUpSurcharge = bigUpActive ? BIG_UP_PRICE_PER_PERSON * guestCount : 0;

  const totalProtein = proteins.reduce((s, p) => s + p.quantity, 0);
  const proteinBaseline = bigUpActive
    ? Math.ceil(BIG_UP_MULTIPLIER * guestCount)
    : guestCount;
  const extraProteinSurcharge =
    Math.max(0, totalProtein - proteinBaseline) * EXTRA_PROTEIN_PRICE;

  const totalSides =
    packageType === "buffet"
      ? sides.reduce((s, sd) => s + sd.quantity, 0)
      : 0;
  const extraSideSurcharge =
    packageType === "buffet"
      ? Math.max(0, totalSides - guestCount) * EXTRA_SIDE_PRICE
      : 0;

  const breakdown: { label: string; amount: number }[] = [
    {
      label: `${guestCount} guests \u00d7 $${(BASE_PRICE_PER_PERSON / 100).toFixed(2)}`,
      amount: baseCost,
    },
  ];

  if (proteinUpcharges > 0) {
    breakdown.push({ label: "Protein upcharges", amount: proteinUpcharges });
  }

  if (bigUpSurcharge > 0) {
    breakdown.push({
      label: "Big Up (+50% protein)",
      amount: bigUpSurcharge,
    });
  }

  const extraProteinCount = Math.max(0, totalProtein - proteinBaseline);
  if (extraProteinSurcharge > 0) {
    breakdown.push({
      label: `Extra protein (${extraProteinCount} servings)`,
      amount: extraProteinSurcharge,
    });
  }

  const extraSideCount = Math.max(0, totalSides - guestCount);
  if (extraSideSurcharge > 0) {
    breakdown.push({
      label: `Extra sides (${extraSideCount} servings)`,
      amount: extraSideSurcharge,
    });
  }

  if (deliveryFee > 0) {
    breakdown.push({ label: "Delivery fee", amount: deliveryFee });
  }

  const total =
    baseCost +
    proteinUpcharges +
    deliveryFee +
    bigUpSurcharge +
    extraProteinSurcharge +
    extraSideSurcharge;

  return {
    baseCost,
    proteinUpcharges,
    deliveryFee,
    bigUpSurcharge,
    extraProteinSurcharge,
    extraSideSurcharge,
    total,
    breakdown,
  };
}
