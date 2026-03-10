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
  blob_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'uncategorized',
  tags TEXT,
  source TEXT NOT NULL DEFAULT 'upload',  -- 'upload' | 'generated'
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_media_category ON media(category);
CREATE INDEX IF NOT EXISTS idx_media_source ON media(source);
