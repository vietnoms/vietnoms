# Lessons Learned

## Email Notifications — Resend ENV Verification

**When**: Adding or modifying any feature that sends email via Resend.

**Rule**: Always verify that `RESEND_API_KEY` is set in the Vercel production environment variables and that the sending domain (currently `updates.vietnoms.com`) is verified in Resend before considering the feature complete.

**Why**: The catering email notification feature was deployed without `RESEND_API_KEY` configured in Vercel, and the FROM addresses used `@vietnoms.com` instead of the verified `@updates.vietnoms.com` subdomain. Because email sends are fire-and-forget (`.catch()` swallows errors), failures were completely silent — no errors in logs, no user-facing errors. This went undetected until a real customer (Kate Tu) submitted a catering order and no notification was received.

**How to apply**:
1. After deploying any email-related feature, send a test email through the production endpoint and confirm delivery in the inbox.
2. FROM addresses must use `@updates.vietnoms.com` (the verified Resend subdomain), not `@vietnoms.com`.
3. Admin notifications go TO `catering@vietnoms.com` (the alias that lands in viet@vietnoms.com).

## Timezone — never build a Date from a wall-clock string on the server

**When**: Any server code that turns a customer-entered date/time into a timestamp for Square,
emails, or the DB.

**Rule**: Treat "YYYY-MM-DD" + "HH:MM" as restaurant wall-clock time and convert with
`restaurantLocalToIso()` in `lib/restaurant-hours.ts`. Never call `new Date("2026-09-12T10:00:00")`
on the server and never let the server ignore a time the customer chose.

**Why**: Vercel runs in UTC, so `new Date(eventDate + "T10:00:00")` in the catering checkout
became 10:00 UTC = 3:00 AM Pacific on the POS ticket. The wizard's chosen time was also dropped
by the API, and the fixed 8 AM-8 PM slot list ignored the restaurant's hours.

**How to apply**: Offer time slots from `generateCateringTimeSlots(dateStr)`, validate with
`isValidCateringTime()`, convert with `restaurantLocalToIso()`, and cover the conversion with a
test that asserts the UTC string (see `tests/lib/restaurant-hours.test.ts`).

## Post-payment work must be awaited before the API route returns

**Rule**: In Vercel API routes, `await Promise.allSettled([...])` every email/SMS/DB write that
happens after a payment; a fire-and-forget `.catch()` can be killed when the function returns.

**Why**: The catering confirmation email was fire-and-forget, which is one reason a paying
customer received no receipt.
