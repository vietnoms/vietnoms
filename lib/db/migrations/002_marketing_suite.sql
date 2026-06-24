-- Migration 002: Marketing suite (subscribers, review requests, announcements,
-- social posts, job applications, rate limits) + customers opt-in columns.
-- Apply via: turso db shell vietnoms < lib/db/migrations/002_marketing_suite.sql
--
-- NOTE: lib/db/customers.ts has been writing the three customer opt-in columns
-- since the checkout opt-in feature shipped, so the production database may
-- already have them. SQLite's ALTER TABLE errors on duplicate columns — if the
-- ALTER statements below fail with "duplicate column name", that is expected;
-- skip them and run the rest.

ALTER TABLE customers ADD COLUMN sms_opt_in INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN email_opt_in INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN sms_opt_in_at TEXT;

-- Email marketing list

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  source TEXT NOT NULL DEFAULT 'footer',      -- footer|popup|checkout|catering|rewards
  status TEXT NOT NULL DEFAULT 'subscribed',  -- subscribed|unsubscribed
  unsubscribe_token TEXT NOT NULL UNIQUE,
  resend_contact_id TEXT,                     -- optional Resend Audiences sync
  consent_at TEXT NOT NULL DEFAULT (datetime('now')),
  unsubscribed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);
CREATE INDEX IF NOT EXISTS idx_subscribers_source ON subscribers(source);
CREATE INDEX IF NOT EXISTS idx_subscribers_token ON subscribers(unsubscribe_token);

-- Post-purchase review requests

CREATE TABLE IF NOT EXISTS review_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER REFERENCES purchases(id),
  square_order_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  channel TEXT NOT NULL,                 -- email|sms
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued', -- queued|sent|responded|suppressed|cancelled|failed
  scheduled_at TEXT NOT NULL,
  sent_at TEXT,
  responded_at TEXT,
  rating INTEGER,                        -- 1-5 chosen on /feedback page
  routed_to TEXT,                        -- public|private
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_review_requests_due ON review_requests(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_review_requests_token ON review_requests(token);
CREATE INDEX IF NOT EXISTS idx_review_requests_email ON review_requests(customer_email);
CREATE INDEX IF NOT EXISTS idx_review_requests_phone ON review_requests(customer_phone);

CREATE TABLE IF NOT EXISTS private_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_request_id INTEGER REFERENCES review_requests(id),
  rating INTEGER,
  feedback_text TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'new',    -- new|read
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_private_feedback_status ON private_feedback(status);

-- Specials & announcements (scheduled publishing to the website)

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'announcement', -- announcement|special
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  cta_label TEXT,
  cta_href TEXT,
  starts_at TEXT,                        -- NULL = starts immediately
  ends_at TEXT,                          -- NULL = evergreen
  active INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_announcements_window ON announcements(type, active, starts_at, ends_at);

-- Social post scheduler

CREATE TABLE IF NOT EXISTS social_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,                            -- internal label
  body TEXT NOT NULL,
  media_id INTEGER REFERENCES media(id),
  media_url TEXT,                        -- snapshot of image URL at schedule time
  menu_item_id TEXT,
  menu_item_name TEXT,
  platforms TEXT NOT NULL DEFAULT '["facebook"]', -- JSON array: facebook|instagram
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft|scheduled|ready|published|failed|cancelled
  published_at TEXT,
  external_ids TEXT,                     -- JSON {facebook?, instagram?}
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_social_posts_due ON social_posts(status, scheduled_at);

-- Careers

CREATE TABLE IF NOT EXISTS job_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',    -- new|reviewed|archived
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);

-- Fixed-window rate limiting

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,                  -- e.g. "otp:+14085551234", "subscribe:1.2.3.4"
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);
