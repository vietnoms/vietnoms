-- VenueForecast Schema
-- Apply via: turso db shell venue-forecast < lib/db/schema.sql

-- Tenants (customers)
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  api_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Shared canonical venue catalog
CREATE TABLE IF NOT EXISTS venues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT,
  city TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tenant subscribes to venues they care about
CREATE TABLE IF NOT EXISTS tenant_venues (
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  venue_id INTEGER NOT NULL REFERENCES venues(id),
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id, venue_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_venues_venue ON tenant_venues(venue_id);

-- Shared events tied to canonical venue
CREATE TABLE IF NOT EXISTS convention_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id INTEGER NOT NULL REFERENCES venues(id),
  event_name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  expected_attendance INTEGER,
  event_type TEXT,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'csv',
  added_by_tenant INTEGER REFERENCES tenants(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(venue_id, event_name, start_date)
);

CREATE INDEX IF NOT EXISTS idx_events_venue ON convention_events(venue_id);
CREATE INDEX IF NOT EXISTS idx_events_dates ON convention_events(start_date, end_date);

-- Per-tenant starring
CREATE TABLE IF NOT EXISTS tenant_event_stars (
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  event_id INTEGER NOT NULL REFERENCES convention_events(id),
  starred_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id, event_id)
);

-- Per-tenant private daily sales (aggregated anonymously at query time)
CREATE TABLE IF NOT EXISTS daily_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  date TEXT NOT NULL,
  revenue INTEGER NOT NULL,
  transaction_count INTEGER,
  avg_ticket INTEGER,
  pos_source TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, date)
);

CREATE INDEX IF NOT EXISTS idx_sales_tenant ON daily_sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON daily_sales(date);
