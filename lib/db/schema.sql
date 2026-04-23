-- Vietnoms Turso Database Schema
-- Apply via: turso db shell vietnoms < lib/db/schema.sql

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,               -- Square customer_id
  phone TEXT NOT NULL UNIQUE,
  given_name TEXT,
  family_name TEXT,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS item_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  square_item_id TEXT NOT NULL,
  square_customer_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  review_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, rejected
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (square_customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_item ON item_reviews(square_item_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON item_reviews(square_customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON item_reviews(status);

CREATE TABLE IF NOT EXISTS item_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  square_item_id TEXT NOT NULL,
  square_customer_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(square_item_id, square_customer_id),
  FOREIGN KEY (square_customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_likes_item ON item_likes(square_item_id);

-- Catering

CREATE TABLE IF NOT EXISTS catering_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft|submitted|paid|cancelled|completed
  event_date TEXT NOT NULL,
  guest_count INTEGER NOT NULL,
  package_type TEXT NOT NULL,
  customizations TEXT,                    -- JSON
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  delivery_type TEXT NOT NULL DEFAULT 'pickup',  -- pickup|delivery
  delivery_address TEXT,
  delivery_distance REAL,                 -- miles
  delivery_fee INTEGER DEFAULT 0,         -- cents
  total_amount INTEGER,                   -- cents, NULL for email-only
  square_order_id TEXT,
  square_payment_id TEXT,
  notes TEXT,
  fulfillment_type TEXT NOT NULL DEFAULT 'email',  -- payment|email
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS catering_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  catering_request_id INTEGER NOT NULL REFERENCES catering_requests(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER,                     -- cents
  notes TEXT
);

-- Media Library

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blob_url TEXT NOT NULL,                 -- desktop H.264 MP4 (canonical fallback)
  filename TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'uncategorized',
  tags TEXT,
  source TEXT NOT NULL DEFAULT 'upload',  -- 'upload' | 'generated'
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER,
  blob_url_av1 TEXT,                      -- desktop AV1 WebM variant
  blob_url_webm TEXT,                     -- desktop VP9 WebM variant
  blob_url_mobile TEXT,                   -- mobile H.264 MP4 (720p, <1MB)
  poster_url TEXT,                        -- WebP poster still
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_media_category ON media(category);
CREATE INDEX IF NOT EXISTS idx_media_source ON media(source);

-- Purchases

-- Gift Card Group Contributions

CREATE TABLE IF NOT EXISTS gift_card_contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  gift_card_id TEXT NOT NULL,
  gift_card_gan TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  organizer_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  suggested_amount INTEGER,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contributions_token ON gift_card_contributions(token);

CREATE TABLE IF NOT EXISTS contribution_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contribution_id INTEGER NOT NULL REFERENCES gift_card_contributions(id),
  invitee_email TEXT NOT NULL,
  invited_at TEXT NOT NULL DEFAULT (datetime('now')),
  contributed_at TEXT,
  amount INTEGER,
  square_payment_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_invites_contribution ON contribution_invites(contribution_id);

-- Convention Events & Forecast

CREATE TABLE IF NOT EXISTS convention_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  start_date TEXT NOT NULL,             -- YYYY-MM-DD
  end_date TEXT NOT NULL,               -- YYYY-MM-DD
  expected_attendance INTEGER,
  event_type TEXT,                       -- convention, conference, trade_show, concert, festival, etc.
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'csv',    -- csv, manual
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_convention_events_dates ON convention_events(start_date, end_date);

CREATE TABLE IF NOT EXISTS daily_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,             -- YYYY-MM-DD
  revenue INTEGER NOT NULL,              -- cents
  transaction_count INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales(date);

-- Purchases

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,                     -- 'gift_card' | 'catering' | 'order'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'completed' | 'failed' | 'refunded'
  amount INTEGER NOT NULL,               -- cents
  square_payment_id TEXT,
  square_order_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  gift_card_id TEXT,
  gift_card_gan TEXT,
  metadata TEXT,                          -- JSON for extra context
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
