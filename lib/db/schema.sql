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
