export const BASE_PRICE_PER_PERSON = 2000; // $20.00 in cents

export const PROTEINS = [
  { name: "Lemongrass Chicken", upcharge: 0 },
  { name: "Lemongrass Pork", upcharge: 0 },
  { name: "Red Hot Beef", upcharge: 100 }, // +$1.00
  { name: "Grilled Shrimp", upcharge: 250 }, // +$2.50
  { name: "Stir-fried Tofu", upcharge: 0 },
] as const;

export const DELIVERY_TIERS = [
  { maxMiles: 0, fee: 0, label: "Pickup" },
  { maxMiles: 5, fee: 1000, label: "0-5 miles" },     // $10
  { maxMiles: 15, fee: 1500, label: "5-15 miles" },    // $15
  { maxMiles: 20, fee: 2000, label: "15-20 miles" },   // $20
] as const;

export const MAX_DELIVERY_MILES = 20;
export const BUFFET_MIN_PER_PROTEIN = 10;

export interface ProteinSelection {
  name: string;
  quantity: number;
}

export interface CateringEstimate {
  baseCost: number;         // cents
  proteinUpcharges: number; // cents
  deliveryFee: number;      // cents
  total: number;            // cents
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

export function calculateEstimate(
  guestCount: number,
  proteins: ProteinSelection[],
  deliveryMiles: number
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

  const breakdown: { label: string; amount: number }[] = [
    { label: `${guestCount} guests x $${(BASE_PRICE_PER_PERSON / 100).toFixed(2)}`, amount: baseCost },
  ];

  if (proteinUpcharges > 0) {
    breakdown.push({ label: "Protein upcharges", amount: proteinUpcharges });
  }

  if (deliveryFee > 0) {
    breakdown.push({ label: "Delivery fee", amount: deliveryFee });
  }

  return {
    baseCost,
    proteinUpcharges,
    deliveryFee,
    total: baseCost + proteinUpcharges + deliveryFee,
    breakdown,
  };
}
