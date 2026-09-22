/**
 * Copy for the collapsible "How this works" panels (see section-explainer.tsx).
 * Keep these in sync with behavior when a section changes.
 */

export interface Explainer {
  summary: string;
  sections: { title: string; points: string[] }[];
}

export const EXPLAINERS = {
  homepage: {
    summary:
      "Edits the text and photos on the public homepage. Every field falls back to the default copy (shown greyed out as the placeholder) when left blank.",
    sections: [
      {
        title: "Editing",
        points: [
          "Fields are grouped by the homepage section they control: Hero, Featured Dishes, About, Order Callout, and Catering Banner.",
          "Featured Items takes menu item names separated by commas. Each name is matched against the Square menu (case-insensitive, partial match OK). Names that match nothing are skipped.",
          "Photo fields pick from the Media Library. Upload new photos there first.",
        ],
      },
      {
        title: "Publishing",
        points: [
          "Nothing goes live until you click Save. After that the homepage picks up the changes on its next load.",
          "The rotating hero videos and images are managed separately under Hero.",
        ],
      },
    ],
  },

  hero: {
    summary:
      "Controls the rotating videos and images at the top of the homepage and the catering page. Each page has its own list.",
    sections: [
      {
        title: "Slides",
        points: [
          "Add slides from the Media Library or upload new files. Drag to change the play order.",
          "The eye icon hides a slide from the slideshow without deleting it. The trash icon removes it from the hero and moves the file back to Uncategorized in the Media Library.",
          "Pick the transition style (Crossfade, Slide, or Ken Burns zoom) and check it in the Preview panel.",
        ],
      },
      {
        title: "Video variants",
        points: [
          "Each video can have several encodings. Visitors' browsers pick the best one they support: AV1 WebM (smallest, desktop), VP9 WebM (desktop fallback), and H.264 MP4 (phones).",
          "Always add a Poster image. It shows while the video loads, so visitors never see a blank frame.",
          "Keep mobile MP4s under about 1 MB so the page loads fast on cellular.",
        ],
      },
    ],
  },

  catering: {
    summary:
      "Every catering request and online catering order lands here. Use the status tabs to work through them from new to done.",
    sections: [
      {
        title: "Statuses",
        points: [
          "Draft: the customer started online checkout but hasn't paid, or saved the form partway. The ⚠ icon marks these. Follow up if the event is soon.",
          "Submitted: an inquiry sent through the catering form. It needs a quote or invoice from you.",
          "Paid: set automatically when an online catering checkout succeeds. When a customer pays a Square invoice, the Invoice column shows Paid, but the request status doesn't change on its own.",
          "Completed / Cancelled: set these by hand once the event is over or called off. Both are final and hide the action buttons.",
        ],
      },
      {
        title: "Invoices",
        points: [
          "Generate Square Invoice creates an itemized invoice in Square as a draft. It isn't sent yet: review it and send it from the Square dashboard.",
          "Invoice status (Draft, Sent, Paid) is pulled from Square every time this page loads. View Invoice opens the customer-facing copy.",
          "Expand a row to see everything the customer picked (bowls or bases, sides, sauces, options, utensils) along with contact, delivery, and Square payment details.",
        ],
      },
    ],
  },

  purchases: {
    summary:
      "A log of every payment taken on the website: online orders, catering checkouts, and gift cards. It's read-only. Handle refunds and disputes in Square.",
    sections: [
      {
        title: "Reading the table",
        points: [
          "Filter by type with the tabs, or by status with the dropdown.",
          "Pending: the payment was started but not confirmed yet. If a row stays pending, the customer probably left checkout.",
          "Completed: the payment was captured. Failed: the card was declined or Square returned an error (hover the red text to see why).",
          "Refunded: the site refunded the payment automatically, for example when a gift card failed to activate. Refunds you issue in the Square dashboard don't show up here.",
        ],
      },
      {
        title: "Reconciling",
        points: [
          "Tips are shown in their own column. Match totals against the Square dashboard for payouts and fees.",
          "In-store Square payments don't show up here. Only website checkouts do.",
        ],
      },
    ],
  },

  subscribers: {
    summary:
      "Your email list. People are added automatically when they sign up from the footer, the popup, checkout, the catering form, or the rewards page.",
    sections: [
      {
        title: "Signup popup",
        points: [
          "When it's turned on, the popup shows once per visitor after the delay you set, or when they scroll halfway down the page, whichever comes first.",
          "It never shows on checkout, feedback, or admin pages.",
          "Replace any [FILL IN…] placeholder with a real offer before turning it on. A concrete incentive gets many more signups.",
        ],
      },
      {
        title: "The list",
        points: [
          "Source shows which signup point each person came from. Use it to see which capture points are working.",
          "Export CSV downloads everyone matching the current source and status filters (the search box isn't applied), ready to import into your email tool.",
          "Unsubscribe marks someone as opted out without deleting their record. Anyone who clicks the unsubscribe link in an email is marked the same way automatically.",
        ],
      },
    ],
  },

  reviews: {
    summary:
      "Handles customer feedback in one place: reviews of individual dishes, your public Google reviews, and automatic \"How was it?\" requests sent after orders.",
    sections: [
      {
        title: "Dish Reviews",
        points: [
          "Customers can review individual menu items. New reviews wait under Pending and aren't public until you approve them.",
          "Approved reviews show on that dish's menu page. Rejected ones stay hidden, but you can still see them here.",
        ],
      },
      {
        title: "Google Reviews",
        points: [
          "Shows your live Google rating and recent reviews, pulled from the Google Places API. Reply to them on Google Business Profile, not here.",
        ],
      },
      {
        title: "Review Requests",
        points: [
          "After each paid online order, the customer gets a short rating request once the delay you set has passed.",
          "Customers who give 4–5★ are sent to Google/Yelp to leave a public review. Customers who give 1–3★ go to a private feedback form, and their messages land in this tab. The red badge counts unread feedback.",
          "Response rate is the share of requests sent that got a rating back.",
        ],
      },
      {
        title: "Settings",
        points: [
          "Turn requests on or off, and set the delay, the channel (email, or text for customers who opted in to SMS), and the minimum number of days before the same customer is asked again.",
          "Due requests are sent by the daily scheduled job and after each checkout, so they go out close to, but not exactly at, the delay you set. See OWNER-GUIDE.md for hourly timing.",
        ],
      },
    ],
  },

  specials: {
    summary:
      "Time-boxed promotions and site-wide notices. Set a start and end time and each one goes live and comes down on its own.",
    sections: [
      {
        title: "Two types",
        points: [
          "Special: a card with an image and a button, shown on the homepage and the /specials page.",
          "Announcement: a thin bar across the top of the homepage. Use it for holiday hours, closures, and events.",
        ],
      },
      {
        title: "Status and ordering",
        points: [
          "Live: active and within its time window. Scheduled: the start time hasn't come yet. Expired: the end time has passed. Disabled: turned off by hand.",
          "When several are live at once, the highest priority number shows first.",
          "Leave the end time blank for an open-ended special. Running one special at a time with an end date usually works best.",
        ],
      },
    ],
  },

  content: {
    summary:
      "Generates drafts of SEO content (blog posts, meta tags, recipes, Google Business posts, FAQ copy, local SEO posts) using Claude.",
    sections: [
      {
        title: "Using it",
        points: [
          "Pick a content type, enter a topic and target keywords, then click Generate. Blank keywords default to \"vietnamese food, vietnamese restaurant\".",
          "Output is not saved. Copy it somewhere before you leave or generate again.",
          "Treat everything it writes as a first draft. Check prices, hours, and claims before publishing.",
        ],
      },
    ],
  },

  media: {
    summary:
      "The shared image and video library. Every photo picker in the admin (Homepage, Hero, Specials, Calendar) pulls from here.",
    sections: [
      {
        title: "Embedded Photos",
        points: [
          "Fixed photo slots used around the site: the social share thumbnail, the homepage About and Catering photos, and the catering page images.",
          "Click a slot to swap in a different library image. The change goes live right away.",
        ],
      },
      {
        title: "Library",
        points: [
          "Drag files onto the upload area or click it to browse. Large files upload straight to storage, so video is fine.",
          "Give each file a category and alt text. Alt text is read by screen readers and search engines.",
          "Items set to visible in the gallery appear on the public /gallery page, lowest gallery order first.",
          "Deleting permanently removes the file from storage, which breaks it anywhere it's still used (Hero, Specials, embedded photos). Swap it out in those places first.",
        ],
      },
    ],
  },

  seo: {
    summary:
      "A checklist of SEO tasks, grouped by category. It's a tracker only. Checking an item doesn't change the site.",
    sections: [
      {
        title: "How to use it",
        points: [
          "Tick items off as they're done. Progress is saved to the database, so everyone on the team sees the same state.",
          "Items are grouped into Technical, Local SEO, and Content. Do the Critical-impact items first.",
        ],
      },
    ],
  },

  forecast: {
    summary:
      "Forecasts busy days from the convention center's event calendar so you can plan staffing and prep ahead of time.",
    sections: [
      {
        title: "Adding data",
        points: [
          "Import Events CSV needs at least \"Event Name\" and \"Start Date\" columns. It also reads End Date, attendance (attend/guest/count), type, and notes if they're there.",
          "Add Event enters a single event by hand.",
          "Import Sales CSV (date plus revenue, and optionally transaction count) stores daily sales. Revenue shows next to any forecast day that has a matching date.",
        ],
      },
      {
        title: "How days are scored",
        points: [
          "Each event gets an impact score based on expected attendance. For example, under 500 attendees is a minor bump and over 10,000 is a major one.",
          "Scores from overlapping events add up for each day. Normal is below 20, Moderate is 20–44, Busy is 45–69, and Very Busy is 70 or above.",
          "The forecast covers the next 3 months. Busy Weeks lists any week with at least one Busy or Very Busy day. Click a day in the calendar to see which events are driving it.",
        ],
      },
    ],
  },

  calendar: {
    summary:
      "Plan, write, and schedule Facebook and Instagram posts.",
    sections: [
      {
        title: "Writing posts",
        points: [
          "Pick a menu item and click Draft to generate a caption. Click again for another version. Attach a photo from the Media Library.",
          "Late morning (around 11am) on 2–3 days a week is a good default schedule.",
        ],
      },
      {
        title: "What happens at the scheduled time",
        points: [
          "Auto mode (Meta API keys set): the post publishes itself and turns Published, or Failed with the reason if Meta rejects it.",
          "Manual mode (no keys): the post turns Ready and moves into the Ready queue. Copy the caption, post it yourself, then mark it Published.",
          "Scheduled posts are processed by the daily job, so they can go out a few hours after the time you set unless hourly cron is set up (see OWNER-GUIDE.md).",
          "Open the SEO Content Strategy Guide at the bottom of the page for the weekly publishing schedule and the topic-cluster tracker.",
        ],
      },
    ],
  },

  schema: {
    summary:
      "Builds JSON-LD structured data, the hidden markup that lets Google show rich results such as hours, ratings, and FAQs.",
    sections: [
      {
        title: "Using it",
        points: [
          "Pick a schema type, fill in the form, and copy the generated JSON.",
          "Nothing here is published automatically. The site already includes core Restaurant schema, so use this for extra pages or to test changes.",
          "Paste the output into Google's Rich Results Test before adding it to any page.",
        ],
      },
    ],
  },

  studio: {
    summary:
      "Image Studio is a separate app embedded in the admin for creating marketing images.",
    sections: [
      {
        title: "Using it",
        points: [
          "Images made here aren't added to the Media Library automatically. Download them, then upload them in Media to use them on the site.",
        ],
      },
    ],
  },
} satisfies Record<string, Explainer>;

export type ExplainerKey = keyof typeof EXPLAINERS;
