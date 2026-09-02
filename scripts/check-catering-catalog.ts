/**
 * Read-only smoke test for the catering order builder against the live Square catalog.
 *
 * Runs a sample catering order through Square's `orders.calculate` (which creates
 * nothing) and prints the itemized lines, tax, and total. Also checks that Square's
 * pre-tax subtotal matches the wizard's own pricing so customers never see one subtotal
 * on the Customize step and a different one at checkout.
 *
 * Run: npx tsx scripts/check-catering-catalog.ts
 * Reads SQUARE_ACCESS_TOKEN, SQUARE_ENVIRONMENT, NEXT_PUBLIC_SQUARE_LOCATION_ID from
 * the environment or .env.local.
 */
import fs from "fs";
import path from "path";
import { SquareClient, SquareEnvironment } from "square";
import { buildCateringLineItems, type CateringLineItemInput } from "../lib/catering-order";
import { calculateEstimate } from "../lib/catering-pricing";

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

function money(v: bigint | number | null | undefined): string {
  const cents = v == null ? 0 : Number(v);
  return `$${(cents / 100).toFixed(2)}`;
}

async function main() {
  loadEnvLocal();
  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
  if (!token || !locationId) {
    console.error("Set SQUARE_ACCESS_TOKEN and NEXT_PUBLIC_SQUARE_LOCATION_ID");
    process.exit(1);
  }

  const client = new SquareClient({
    token,
    environment:
      process.env.SQUARE_ENVIRONMENT === "production"
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  });

  const samples: { label: string; input: CateringLineItemInput; miles: number }[] = [
    {
      label: "Buffet, 30 guests, Big Up, delivery 3.2 mi",
      miles: 3.2,
      input: {
        guestCount: 30,
        packageType: "buffet",
        items: [
          { itemName: "Lemongrass Chicken", quantity: 20 },
          { itemName: "Grilled Shrimp", quantity: 25 },
        ],
        deliveryType: "delivery",
        deliveryDistance: 3.2,
        deliveryFee: 1000,
        customizations: {
          proteins: [
            { name: "Lemongrass Chicken", quantity: 20, selected: true },
            { name: "Grilled Shrimp", quantity: 25, selected: true },
          ],
          bases: [
            { name: "Rice", quantity: 20 },
            { name: "Vermicelli Noodles", quantity: 10 },
          ],
          sides: [
            { name: "Shredded Pork", quantity: 20 },
            { name: "Pork & Shrimp Egg Roll", quantity: 10 },
          ],
          bigUpActive: true,
          noPeanuts: true,
          eggRollCut: "1/2",
        },
      },
    },
    {
      label: "Pre-made bowls, 12 guests, pickup",
      miles: 0,
      input: {
        guestCount: 12,
        packageType: "premade",
        items: [{ itemName: "Stir-fried Tofu", quantity: 12 }],
        deliveryType: "pickup",
        deliveryFee: 0,
        customizations: {
          proteins: [{ name: "Stir-fried Tofu", quantity: 12, selected: true }],
          bases: [
            { name: "Rice", quantity: 8 },
            { name: "Salad", quantity: 4 },
          ],
          sides: [],
          bigUpActive: false,
        },
      },
    },
  ];

  let ok = true;
  for (const sample of samples) {
    console.log(`\n=== ${sample.label} ===`);
    const { lineItems, taxes, deliveryFee } = buildCateringLineItems(sample.input);
    const res = await client.orders.calculate({ order: { locationId, lineItems, taxes } });
    const order = res.order;
    if (!order) {
      console.error("No order returned");
      ok = false;
      continue;
    }

    for (const li of order.lineItems ?? []) {
      const name = [li.name, li.variationName].filter(Boolean).join(" - ");
      console.log(
        `  ${li.quantity.padStart(3)} x ${name.padEnd(44)} ${money(li.basePriceMoney?.amount).padStart(8)} ea  tax ${money(li.totalTaxMoney?.amount).padStart(7)}  = ${money(li.totalMoney?.amount).padStart(9)}${li.note ? `   [${li.note}]` : ""}`
      );
    }

    const total = Number(order.totalMoney?.amount ?? 0);
    const tax = Number(order.totalTaxMoney?.amount ?? 0);
    const subtotal = total - tax;
    const taxable = subtotal - deliveryFee;
    console.log(`  Subtotal ${money(subtotal)}  (delivery ${money(deliveryFee)})`);
    console.log(`  Tax      ${money(tax)}  (${taxable > 0 ? ((tax / taxable) * 100).toFixed(3) : "0"}% of taxable ${money(taxable)})`);
    console.log(`  Total    ${money(total)}`);

    const wizard = calculateEstimate(
      sample.input.guestCount,
      sample.input.customizations?.proteins ?? [],
      sample.miles,
      !!sample.input.customizations?.bigUpActive,
      sample.input.customizations?.sides ?? [],
      sample.input.packageType as "buffet" | "premade"
    );
    const match = wizard.total === subtotal;
    console.log(`  Wizard pre-tax estimate ${money(wizard.total)} ${match ? "== Square subtotal OK" : "!= Square subtotal MISMATCH"}`);
    if (!match) ok = false;
  }

  console.log(ok ? "\nALL SAMPLES OK" : "\nSOME SAMPLES FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  const detail = err?.errors?.[0]?.detail || err?.body || err?.message || String(err);
  console.error("Square calculate failed:", detail);
  process.exit(1);
});
