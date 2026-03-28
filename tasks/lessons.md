# Lessons Learned

## Email Notifications — Resend ENV Verification

**When**: Adding or modifying any feature that sends email via Resend.

**Rule**: Always verify that `RESEND_API_KEY` is set in the Vercel production environment variables and that the sending domain (currently `updates.vietnoms.com`) is verified in Resend before considering the feature complete.

**Why**: The catering email notification feature was deployed without `RESEND_API_KEY` configured in Vercel, and the FROM addresses used `@vietnoms.com` instead of the verified `@updates.vietnoms.com` subdomain. Because email sends are fire-and-forget (`.catch()` swallows errors), failures were completely silent — no errors in logs, no user-facing errors. This went undetected until a real customer (Kate Tu) submitted a catering order and no notification was received.

**How to apply**:
1. After deploying any email-related feature, send a test email through the production endpoint and confirm delivery in the inbox.
2. FROM addresses must use `@updates.vietnoms.com` (the verified Resend subdomain), not `@vietnoms.com`.
3. Admin notifications go TO `catering@vietnoms.com` (the alias that lands in viet@vietnoms.com).
