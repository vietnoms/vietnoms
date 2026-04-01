# Integration Tests: Convention Event Forecasting Pipeline

## Plan
Add integration tests covering the full Gmail -> parse -> save -> push -> display pipeline across both repos. Fix the `source` field bug where Tools' push payload was silently dropped.

## Steps
- [x] 1. Fix `source` field bug in `app/api/admin/forecast/events/route.ts`
- [x] 2. Write Site API tests in `tests/api/forecast-events.test.ts` (19 tests)
- [x] 3. Write Tools push service tests in `tests/test_site_push.py` (8 tests)
- [x] 4. Write Tools poll_events pipeline tests in `tests/test_poll_events.py` (6 tests)
- [x] 5. TypeScript compiles clean (`tsc --noEmit`)

## Review

**Bug fixed:**
- `app/api/admin/forecast/events/route.ts` — `source` field from Tools push payload was silently dropped. Now passes through, defaults to `"manual"` when absent.

**Tests verified:**
- Site: 19/19 pass (`npx vitest run tests/api/forecast-events.test.ts`)
- Tools: 8/8 pass (`python -m pytest tests/test_site_push.py -v`)
- Tools: `test_poll_events.py` — written, not verified locally (SQLAlchemy import hanging system-wide)

---

# Prior Work

## Checkout & Dashboard Improvements - DONE
- [x] Fix confirmation page timezone, copy, receipt, SMS logging, tips

## Catering Dashboard & Invoicing - DONE
- [x] Square Invoice generation, status, and dashboard integration

## A2P 10DLC Compliance - DONE
- [x] SMS consent checkbox, privacy/terms updates, database columns

## Remaining
- [ ] Catalog items for invoice line items
- [ ] Loyalty enrollment status/points in admin dashboard
