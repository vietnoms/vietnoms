# Vietnoms Owner Guide

Everything on the site that needs **your** real words, data, or accounts — plus how to run the new marketing tools. Placeholders in code and settings are written exactly as `[FILL IN: …]` so you can grep for them; placeholder copy is never shown raw to visitors (sections fall back to safe generic text until you fill them in).

---

## 1. Verify these facts (10 minutes, do first)

All in `lib/constants.ts` unless noted:

- [ ] **Social links** — currently best guesses and may 404:
  - `instagram.com/vietnoms`, `facebook.com/vietnoms`, `yelp.com/biz/vietnoms-san-jose`, `tiktok.com/@vietnoms`, Twitter handle `@vietnoms` (in `SEO_DEFAULTS`). Replace each with your actual profile URL (the Yelp one also powers the "Review on Yelp" button in review requests).
- [ ] **Hours** — site says Mon–Thu 11:30–7, Fri–Sat 11:30–8, Sun 11:30–7. Correct?
- [ ] **Phone** `(408) 827-5812` and email `catering@vietnoms.com`.

## 2. Your writing (the site works without it, but this is your voice)

| What | Where | Notes |
|---|---|---|
| Popup incentive offer | Admin → Subscribers → Signup Popup | e.g. "10% off your first online order". The popup ships **disabled** — write the offer, then flip it on. |
| Loyalty program terms | Admin → Content (`loyalty_terms`) or leave the generic default | Earning rate, redemption, expiration |
| Allergen note | Admin → Content (`allergen_note`) | Shown atop the menu once set |
| Staff picks | Admin → Content (`staff_picks`, JSON array of exact item names) | Badges those dishes on the menu |
| Press mentions | Admin → Content (`press_mentions`, JSON: `[{"outlet":"Mercury News","quote":"…","url":"…"}]`) | Homepage shows your live Google rating until you add these |
| Careers roles | Admin → Content (`careers_roles`, JSON: `[{"title":"Line Cook","type":"Part-time","description":"…"}]`) | /careers shows a general-application note until set |
| FAQ details | `app/faq/page.tsx` | Three answers have `[FILL IN]` markers: parking specifics, catering lead time/minimums, large-group policy |
| About page team section | `app/about/page.tsx` | Real names + photos |
| Our Story page | `app/our-story/page.tsx` | Currently `noindex` ("hidden while in development") — when you're happy with it, remove the `robots` block so Google can index it, and consider adding it to the nav |

## 3. Accounts & keys to connect (each unlocks a feature)

- **`GOOGLE_PLACE_ID`** — makes "Review us on Google" buttons open your review box directly. Find it at <https://developers.google.com/maps/documentation/places/web-service/place-id> (search "Vietnoms San Jose").
- **Resend domain + `RESEND_AUDIENCE_ID`** — welcome emails and review requests already work with `RESEND_API_KEY`; add an Audience ID to mirror your list into Resend for sending campaigns/broadcasts.
- **Meta auto-posting** — without keys, scheduled posts queue up for one-click copy/paste ("manual mode"). To auto-post:
  1. Create a Meta app, connect your Facebook Page, generate a **Page access token** with `pages_manage_posts` (+ link your Instagram Business account and add `instagram_content_publish` for IG).
  2. Set `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN`, `META_IG_USER_ID` in Vercel.
  3. **Tokens expire (~60 days)** — when posts start failing with an auth error in Admin → Calendar, regenerate the token. (A long-lived token how-to: <https://developers.facebook.com/docs/pages-api/getting-started>)
- **Replying to Google reviews** — Google's API can't post replies. Use Admin → Reviews → Google Reviews: pick a tone, edit, **Copy reply**, then paste it in [Google Business Profile](https://business.google.com/reviews).

## 4. Daily/weekly marketing rhythm (the PopMenu-style playbook)

1. **Turn on review requests** (Admin → Reviews → Settings). Every paid online order gets a "How was it?" email a few hours later. 4–5★ customers are pushed to Google/Yelp; 1–3★ go to your **private** inbox (Admin → Reviews) — answer those personally.
2. **Moderate dish reviews** when the Reviews tab shows a badge (approve = visible on the menu item page).
3. **Run one special at a time** (Admin → Specials) with an end date — it auto-appears on the homepage + /specials and auto-expires. Pair it with an announcement bar for big news (holiday hours, events).
4. **Schedule 2–3 social posts a week** (Admin → Calendar): pick a menu item → "Draft" writes the caption → schedule for ~11am. In manual mode, copy/paste when they turn "Ready".
5. **Watch the list grow** (Admin → Subscribers) and **export CSV** monthly into your email tool — or send via Resend if synced. Source chips tell you which capture point (footer/popup/checkout/catering/rewards) is working.

## 5. Cron timing (important on Vercel Hobby)

Vercel Hobby runs the daily job once (`/api/cron/tick`, 18:00 UTC ≈ 10–11am PT). The site also drains queues after every checkout, so most review requests go out near their scheduled time on busy days. For hourly precision either:
- upgrade to Vercel Pro and add more cron entries, or
- create a free [cron-job.org](https://cron-job.org) job: `GET https://vietnoms.com/api/cron/tick` hourly with header `Authorization: Bearer <your CRON_SECRET>`.

## 6. One-time technical cleanups (ask any developer, ~1 hour)

- [ ] Apply the DB migration: `turso db shell vietnoms < lib/db/migrations/002_marketing_suite.sql` (duplicate-column errors on the first three lines are expected).
- [ ] Recompress `public/images/hero.jpg` (528 KB → target <200 KB WebP/JPEG q70) — it loads as a raw CSS background on the homepage fallback.
- [ ] Confirm `NEXT_PUBLIC_GA_ID` is set in Vercel if you want Google Analytics.
- [ ] Set `CRON_SECRET` in Vercel so the cron endpoint requires auth.
