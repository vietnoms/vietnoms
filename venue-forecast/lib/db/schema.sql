-- VenueForecast Multi-Tenant Schema
-- Apply via: turso db shell venue-forecast < lib/db/schema.sql

CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  api_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS venues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  address TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_venues_tenant ON venues(tenant_id);

CREATE TABLE IF NOT EXISTS convention_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  venue_id INTEGER REFERENCES venues(id),
  event_name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  expected_attendance INTEGER,
  event_type TEXT,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'csv',
  starred INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_tenant ON convention_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_dates ON convention_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_events_venue ON convention_events(venue_id);

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
