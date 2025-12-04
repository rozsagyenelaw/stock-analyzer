-- Watchlist stocks
CREATE TABLE IF NOT EXISTS watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sector TEXT,
  industry TEXT,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Trade journal
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('LONG', 'SHORT')),
  entry_price REAL NOT NULL,
  exit_price REAL,
  entry_date TEXT NOT NULL,
  exit_date TEXT,
  shares INTEGER NOT NULL,
  strategy_tag TEXT,
  notes TEXT,
  profit_loss REAL,
  profit_loss_percent REAL,
  status TEXT NOT NULL CHECK(status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Custom alerts
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  condition TEXT NOT NULL,
  threshold REAL,
  enabled INTEGER NOT NULL DEFAULT 1,
  triggered INTEGER NOT NULL DEFAULT 0,
  triggered_at TEXT,
  delivery_method TEXT NOT NULL CHECK(delivery_method IN ('PUSH', 'EMAIL', 'BOTH')),
  user_email TEXT,
  ai_reasoning TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Add ai_reasoning column to existing alerts table if not exists
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we'll handle this in code if needed

-- User settings
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  email TEXT,
  default_delivery_method TEXT NOT NULL DEFAULT 'PUSH',
  dark_mode INTEGER NOT NULL DEFAULT 1,
  default_risk_percent REAL NOT NULL DEFAULT 1.0,
  indicator_weights TEXT NOT NULL DEFAULT '{"rsi":1,"macd":1,"movingAverages":1,"bollingerBands":1,"volume":1,"stochastic":1,"obv":1}'
);

-- Insert default settings
INSERT OR IGNORE INTO settings (id) VALUES (1);

-- Screener saved scans
CREATE TABLE IF NOT EXISTS screener_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  filters TEXT NOT NULL, -- JSON array of filters
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_entry_date ON trades(entry_date);
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_alerts_enabled ON alerts(enabled);
CREATE INDEX IF NOT EXISTS idx_watchlist_sort ON watchlist(sort_order);
