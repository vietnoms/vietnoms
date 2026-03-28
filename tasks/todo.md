# Checkout & Dashboard Improvements

## Phase 1: Quick Fixes (Checkout Flow) - DONE
- [x] Fix confirmation page timezone (render pickup time in America/Los_Angeles)
- [x] Update confirmation page copy (ASAP: "ready in 10-15 min" / Scheduled: "ready at [time]")
- [x] Add "show this receipt to cashier" instruction
- [x] Add SMS error logging (sendSms returns success:false instead of throwing)
- [x] Await post-payment tasks (fixes email, SMS, loyalty)
- [x] Return receiptUrl from checkout, show on confirmation page
- [x] Store receiptUrl and tip in purchase metadata

## Phase 2: Admin Purchases Dashboard - DONE
- [x] Add phone number column
- [x] Show tips separately from total amount
- [x] Conditionally hide Gift Card # column for non-gift-card purchases
- [x] Receipt link column

## Phase 3: Catering Dashboard & Invoicing - DONE
- [x] Add "Generate Square Invoice" button to catering orders
- [x] Store invoice ID on catering request (square_invoice_id column)
- [x] Show invoice payment status on catering dashboard
- [x] Make invoice accessible directly from catering dashboard (View Invoice link)
- [x] API endpoint GET/POST /api/catering/[id]/invoice

## A2P 10DLC Compliance - DONE
- [x] Mandatory SMS consent checkbox with required A2P language
- [x] Privacy policy updated with exact verbatim mobile information clause
- [x] Terms of service updated with exact SMS program language
- [x] SMS consent stored in database (sms_opt_in, sms_opt_in_at columns)

## Remaining
- [ ] Work with user on adding catalog items for invoice line items
- [ ] Loyalty enrollment status/points column in admin dashboard (requires Square API call per customer)
