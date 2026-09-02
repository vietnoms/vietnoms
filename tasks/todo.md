# Catering Checkout Cleanup — Receipt, Order Logging, POS Printing, Pickup Time

## Problem (reported 2026-09-02)
A customer completed a paid catering checkout but (1) never received a receipt, (2) the order
logged in Square was a single vague line item ("Catering - buffet (30 guests)") with the details
crammed into one note, and (3) the pickup time printed on the POS ticket was 3:00 AM.

## Root causes found
- **3:00 AM pickup**: `app/api/catering/checkout/route.ts` built `pickupAt` as
  `new Date(eventDate + "T10:00:00")`. On Vercel (UTC) that is 10:00 UTC = 3:00 AM Pacific. The
  customer's chosen `eventTime` was sent by the wizard but ignored by the API and never stored.
- **Any time allowed**: the wizard offered fixed 8:00 AM–8:00 PM slots regardless of the
  restaurant's hours (11:30 AM open) and let the customer skip picking a time entirely.
- **No receipt**: the confirmation email was fire-and-forget (not awaited) so Vercel could kill
  the function before Resend sent it; Square was not given the buyer's email either, and the
  Square receipt URL was discarded.
- **Vague Square order**: the checkout created one ad-hoc line item for the whole total instead
  of the itemized catalog lines the invoice code already knows how to build; no customer was
  attached; no tax was applied (customer was shown a total with 10% tax but charged the pre-tax
  amount).
- **Duplicate draft invoice**: after a successful payment the route also generated a separate
  Square order + draft invoice for the same event (an unpaid invoice for an already-paid order).

## Plan
- [x] 1. `lib/restaurant-hours.ts`: timezone-safe helpers keyed off a `YYYY-MM-DD` string —
      `getHoursForDateString`, `generateCateringTimeSlots`, `isValidCateringTime`,
      `restaurantLocalToIso` (PT wall clock → ISO UTC), `formatEventDateTime`.
- [x] 2. New `lib/catering-order.ts`: catalog mapping + `buildCateringLineItems()` (moved out of
      `square-invoice.ts`), `buildCateringFulfillment()` (PICKUP with correct PT `pickupAt`, or
      DELIVERY with parsed address), `buildTicketNote()`; `square-invoice.ts` reuses it.
- [x] 3. DB: add `event_time` column (auto-migrated in `ensureCateringTables`), store it from all
      three write paths (checkout, inquiry, save-draft); show in admin table.
- [x] 4. `app/api/catering/checkout/route.ts`: validate `eventTime` against hours + 48h lead;
      itemized order with tax + customer; charge Square's computed total; `buyerEmailAddress`;
      stable idempotency keys; await emails; store receipt URL; drop duplicate draft invoice;
      return `receiptUrl` + totals.
- [x] 5. New `app/api/catering/calculate/route.ts`: `orders.calculate` on the same line items so
      the wizard shows the exact subtotal/tax/total Square will charge.
- [x] 6. `lib/email.ts`: richer confirmation (formatted date/time, pickup address, itemized
      totals, receipt link).
- [x] 7. `components/catering/catering-wizard.tsx`: required time select limited to open hours
      for the chosen date; live totals from calculate endpoint; success screen with receipt link.
- [x] 8. Tests for the pure helpers (hours, ISO conversion, line items, fulfillment, note).
- [x] 9. `tsc --noEmit` clean, `vitest run` green, read-only `orders.calculate` smoke test
      against the real catalog.

## Review

**Verification**
- `npx tsc --noEmit`: clean (after `npm install` restored the missing `framer-motion` package).
- `npx vitest run`: 94/94 pass, including 32 new tests in `tests/lib/restaurant-hours.test.ts`
  and `tests/lib/catering-order.test.ts` (hours, slots, PT-to-UTC conversion incl. the 3 AM
  case, itemized line items, tax scoping, ticket note, address parsing, fulfillments).
- ESLint clean on every touched file.
- Dev server walkthrough of the wizard: Saturday shows "We're open 11:30 AM - 8:00 PM", the
  time dropdown offers only 11:30 AM-7:30 PM, checkout summary reads "Saturday, September 19,
  2026 at 4:00 PM", and when totals can't be fetched the payment form is withheld with a
  "Try again" button.
- NOT verified live: `scripts/check-catering-catalog.ts` (read-only `orders.calculate` against
  the real catalog) could not run because the SQUARE_ACCESS_TOKEN in the local `.env.local`
  is revoked (401 in both environments). Run it with the production token before relying on
  the catalog IDs / tax object; they are the same IDs the existing invoice flow uses.

**Behavior changes to be aware of**
- Paid checkouts now charge Square's computed total (food + catalog sales tax + untaxed
  delivery fee). Previously the customer was shown a 10% tax but charged the pre-tax amount.
- Paid checkouts no longer generate a separate draft invoice (they already have a paid order).
  Email inquiries still get a draft invoice, now itemized through the shared builder.
- Delivery orders are created as Square DELIVERY fulfillments with the parsed address; if
  Square rejects that, the route retries as PICKUP with the address in the ticket note.
- Online payment is now enforced server-side to 10-39 guests and at least 5 days' notice
  (the same rules the wizard already applied client-side).

**Follow-ups (not done)**
- The `save-draft` call still inserts a separate "draft" row before checkout, so each paid
  order also leaves an abandoned-looking draft in the admin table.
- The customer's original order in Square still has the 3:00 AM pickup time; fix it in the
  Square dashboard (I did not modify live Square data).
