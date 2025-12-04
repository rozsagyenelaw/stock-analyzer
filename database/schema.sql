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

-- Portfolio management
CREATE TABLE IF NOT EXISTS portfolios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cash_balance REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  shares REAL NOT NULL,
  avg_cost REAL NOT NULL,
  sector TEXT,
  industry TEXT,
  first_purchase_date TEXT NOT NULL,
  last_updated TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('BUY', 'SELL')),
  shares REAL NOT NULL,
  price REAL NOT NULL,
  transaction_date TEXT NOT NULL,
  commission REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portfolio_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  portfolio_id TEXT NOT NULL,
  date TEXT NOT NULL,
  total_value REAL NOT NULL,
  cash_balance REAL NOT NULL,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
  UNIQUE(portfolio_id, date)
);

-- Backtesting strategies
CREATE TABLE IF NOT EXISTS backtest_strategies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  entry_rules TEXT NOT NULL, -- JSON array of entry conditions
  exit_rules TEXT NOT NULL, -- JSON array of exit conditions
  position_sizing TEXT NOT NULL DEFAULT 'FIXED', -- FIXED, PERCENT_CAPITAL, KELLY, VOLATILITY
  position_size_value REAL NOT NULL DEFAULT 100,
  stop_loss_percent REAL,
  take_profit_percent REAL,
  max_positions INTEGER NOT NULL DEFAULT 1,
  commission_percent REAL NOT NULL DEFAULT 0,
  slippage_percent REAL NOT NULL DEFAULT 0,
  initial_capital REAL NOT NULL DEFAULT 10000,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS backtest_runs (
  id TEXT PRIMARY KEY,
  strategy_id TEXT NOT NULL,
  name TEXT,
  symbol TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT '1day',
  optimization_type TEXT, -- NULL for single run, 'WALKFORWARD', 'MONTE_CARLO'
  optimization_params TEXT, -- JSON parameters for optimization
  status TEXT NOT NULL CHECK(status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')) DEFAULT 'PENDING',
  total_trades INTEGER,
  winning_trades INTEGER,
  losing_trades INTEGER,
  total_return REAL,
  total_return_percent REAL,
  sharpe_ratio REAL,
  max_drawdown REAL,
  max_drawdown_percent REAL,
  profit_factor REAL,
  win_rate REAL,
  avg_win REAL,
  avg_loss REAL,
  largest_win REAL,
  largest_loss REAL,
  avg_bars_in_trade REAL,
  final_capital REAL,
  equity_curve TEXT, -- JSON array of {date, equity} points
  monthly_returns TEXT, -- JSON object of month->return
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (strategy_id) REFERENCES backtest_strategies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS backtest_trades (
  id TEXT PRIMARY KEY,
  backtest_run_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('LONG', 'SHORT')),
  entry_date TEXT NOT NULL,
  entry_price REAL NOT NULL,
  exit_date TEXT,
  exit_price REAL,
  shares REAL NOT NULL,
  position_size REAL NOT NULL,
  commission REAL NOT NULL DEFAULT 0,
  slippage REAL NOT NULL DEFAULT 0,
  stop_loss_price REAL,
  take_profit_price REAL,
  exit_reason TEXT, -- SIGNAL, STOP_LOSS, TAKE_PROFIT, END_OF_DATA
  profit_loss REAL,
  profit_loss_percent REAL,
  mae REAL, -- Maximum Adverse Excursion
  mfe REAL, -- Maximum Favorable Excursion
  bars_in_trade INTEGER,
  entry_signal TEXT, -- JSON of indicator values at entry
  exit_signal TEXT, -- JSON of indicator values at exit
  FOREIGN KEY (backtest_run_id) REFERENCES backtest_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS backtest_optimization_results (
  id TEXT PRIMARY KEY,
  backtest_run_id TEXT NOT NULL,
  window_number INTEGER, -- For walk-forward optimization
  train_start_date TEXT NOT NULL,
  train_end_date TEXT NOT NULL,
  test_start_date TEXT,
  test_end_date TEXT,
  optimized_params TEXT NOT NULL, -- JSON of optimized parameter values
  train_return REAL,
  test_return REAL,
  train_sharpe REAL,
  test_sharpe REAL,
  train_max_drawdown REAL,
  test_max_drawdown REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (backtest_run_id) REFERENCES backtest_runs(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_entry_date ON trades(entry_date);
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_alerts_enabled ON alerts(enabled);
CREATE INDEX IF NOT EXISTS idx_watchlist_sort ON watchlist(sort_order);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_portfolio ON portfolio_holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_symbol ON portfolio_holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_portfolio ON portfolio_transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_date ON portfolio_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_portfolio_history_portfolio_date ON portfolio_history(portfolio_id, date);
CREATE INDEX IF NOT EXISTS idx_backtest_trades_run ON backtest_trades(backtest_run_id);
CREATE INDEX IF NOT EXISTS idx_backtest_trades_symbol ON backtest_trades(symbol);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_strategy ON backtest_runs(strategy_id);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_status ON backtest_runs(status);
CREATE INDEX IF NOT EXISTS idx_backtest_optimization_run ON backtest_optimization_results(backtest_run_id);
