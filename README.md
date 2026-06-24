# Vietnoms.com

Full-stack restaurant website for **Vietnoms** (Vietnamese fast-casual, SoFa Market, downtown San Jose): direct online ordering, catering, gift cards, loyalty, and a built-in restaurant-marketing suite (review management, email capture, specials scheduling, social post scheduling).

## Stack

- **Next.js 14** (App Router) + React 18 + TypeScript
- **Tailwind CSS** + Radix UI + Framer Motion (dark brand theme: red `#ff3333`, yellow `#fdd05c`)
- **Square**: menu catalog, payments, customers, gift cards, loyalty
- **Turso (LibSQL)**: local data (subscribers, reviews, catering, specials, social posts, …)
- **Resend**: transactional + marketing email · **Twilio**: OTP auth + SMS
- **Vercel**: hosting, cron, blob storage · **Google Places API**: reviews

## Local development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (+ sitemap via postbuild)
npm run lint
npx vitest run     # unit tests
```

The site builds and runs with **zero env vars** — every integration degrades gracefully (menu shows an "updating" message, popup stays off, social posts run in manual mode, emails/SMS are skipped).

## Database

Schema lives in `lib/db/schema.sql` (canonical) with incremental migrations in `lib/db/migrations/`.

```bash
turso db shell vietnoms < lib/db/schema.sql              # fresh database
turso db shell vietnoms < lib/db/migrations/002_marketing_suite.sql  # existing database
```

Note for migration 002: production may already have the three `customers` opt-in columns — "duplicate column name" errors on the ALTER statements are expected; run the rest.

## Environment variables

| Variable | Required for | Without it |
|---|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | All local data | DB-backed features off; site still renders |
| `SQUARE_ACCESS_TOKEN`, `NEXT_PUBLIC_SQUARE_APP_ID`, `NEXT_PUBLIC_SQUARE_LOCATION_ID`, `SQUARE_ENVIRONMENT` | Menu, ordering, gift cards, loyalty | Menu/order pages show fallback states |
| `RESEND_API_KEY` | All email | Emails skipped (queued review requests wait) |
| `RESEND_AUDIENCE_ID` | Resend Audiences sync | Subscribers stored locally only |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, `TWILIO_PHONE_NUMBER` | OTP login, SMS | Phone login/SMS unavailable |
| `GOOGLE_PLACES_API_KEY` | Live Google reviews | Curated fallback reviews shown |
| `GOOGLE_PLACE_ID` | "Review us on Google" deep links | Generic Google Maps search link |
| `GOOGLE_MAPS_API_KEY` | Address autocomplete / delivery distance | Catering delivery quotes degrade |
| `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN` | Auto-posting to Facebook | Social posts go to manual copy/paste mode |
| `META_IG_USER_ID` | Auto-posting to Instagram | Instagram in manual mode |
| `CRON_SECRET` | Protecting cron endpoints | Endpoints respond without auth |
| `NEXT_PUBLIC_GA_ID` | Google Analytics | No analytics |
| `ADMIN_PHONE_NUMBERS` | Admin OTP login allowlist | No admin access |

## Cron

`vercel.json` schedules one daily job: `GET /api/cron/tick` (Bearer `CRON_SECRET`), which revalidates the menu, sends due review requests, publishes due social posts, and cancels stale queue items. The same tick also runs opportunistically after each checkout, so queues drain with real traffic even on Vercel's once-daily Hobby cron. For tighter timing, point an external pinger (e.g. cron-job.org) at the endpoint hourly — see `OWNER-GUIDE.md`.

## Admin

`/admin` (OTP-protected): Homepage, Hero, Catering, Purchases, **Subscribers** (email list + popup settings + CSV export), **Reviews** (dish review moderation, Google reviews, automated review requests, private feedback), **Specials** (scheduled announcements/specials), Content, Media, SEO Audit, Forecast, **Calendar** (social post scheduler), Schema, Studio.

## Owner content checklist

Everything that needs the owner's real words/data is marked `[FILL IN: …]` in code and `site_content` defaults — grep for `FILL IN` or read **`OWNER-GUIDE.md`**.
