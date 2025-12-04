import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const dbPath = process.env.DATABASE_URL || join(__dirname, '../../database/stockanalyzer.db');

// Ensure the database directory exists
const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Initialize database schema
export function initializeDatabase(): void {
  // Check if database is already initialized by checking for tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

  if (tables.length === 0) {
    // Database is empty, run schema
    console.log('Initializing new database...');

    // In production (dist), schema.sql is in dist/database/
    // In development, it's in ../database/
    const schemaPath = existsSync(join(__dirname, '../database/schema.sql'))
      ? join(__dirname, '../database/schema.sql')
      : join(__dirname, '../../database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    db.exec(schema);
    console.log('Database initialized successfully');
  } else {
    console.log('Database already exists, skipping initialization');
  }

  // Add ai_reasoning column to alerts table if it doesn't exist
  try {
    const columns = db.prepare("PRAGMA table_info(alerts)").all() as Array<{ name: string }>;
    const hasAiReasoning = columns.some(col => col.name === 'ai_reasoning');

    if (!hasAiReasoning) {
      console.log('Adding ai_reasoning column to alerts table...');
      db.exec('ALTER TABLE alerts ADD COLUMN ai_reasoning TEXT');
      console.log('ai_reasoning column added successfully');
    }
  } catch (error) {
    // Ignore if table doesn't exist yet or column already exists
    console.log('Skipping ai_reasoning column migration');
  }
}

// Initialize the database immediately
initializeDatabase();

// Watchlist queries
export const watchlistQueries = {
  getAll: db.prepare('SELECT * FROM watchlist ORDER BY sort_order ASC'),

  add: db.prepare(`
    INSERT INTO watchlist (symbol, name, sector, industry, sort_order)
    VALUES (?, ?, ?, ?, COALESCE((SELECT MAX(sort_order) FROM watchlist), 0) + 1)
  `),

  remove: db.prepare('DELETE FROM watchlist WHERE symbol = ?'),

  updateOrder: db.prepare('UPDATE watchlist SET sort_order = ? WHERE symbol = ?'),

  exists: db.prepare('SELECT COUNT(*) as count FROM watchlist WHERE symbol = ?')
};

// Trade journal queries
export const tradeQueries = {
  getAll: db.prepare('SELECT * FROM trades ORDER BY entry_date DESC'),

  getById: db.prepare('SELECT * FROM trades WHERE id = ?'),

  getOpen: db.prepare("SELECT * FROM trades WHERE status = 'OPEN' ORDER BY entry_date DESC"),

  getClosed: db.prepare("SELECT * FROM trades WHERE status = 'CLOSED' ORDER BY exit_date DESC"),

  getBySymbol: db.prepare('SELECT * FROM trades WHERE symbol = ? ORDER BY entry_date DESC'),

  insert: db.prepare(`
    INSERT INTO trades (
      id, symbol, direction, entry_price, exit_price, entry_date, exit_date,
      shares, strategy_tag, notes, profit_loss, profit_loss_percent, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  update: db.prepare(`
    UPDATE trades SET
      exit_price = ?, exit_date = ?, profit_loss = ?,
      profit_loss_percent = ?, status = ?, notes = ?
    WHERE id = ?
  `),

  delete: db.prepare('DELETE FROM trades WHERE id = ?'),

  getStats: db.prepare(`
    SELECT
      COUNT(*) as total_trades,
      SUM(CASE WHEN status = 'CLOSED' AND profit_loss > 0 THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN status = 'CLOSED' AND profit_loss < 0 THEN 1 ELSE 0 END) as losses,
      AVG(CASE WHEN status = 'CLOSED' AND profit_loss > 0 THEN profit_loss ELSE NULL END) as avg_win,
      AVG(CASE WHEN status = 'CLOSED' AND profit_loss < 0 THEN profit_loss ELSE NULL END) as avg_loss,
      SUM(CASE WHEN status = 'CLOSED' THEN profit_loss ELSE 0 END) as total_profit_loss,
      MAX(CASE WHEN status = 'CLOSED' THEN profit_loss ELSE NULL END) as largest_win,
      MIN(CASE WHEN status = 'CLOSED' THEN profit_loss ELSE NULL END) as largest_loss
    FROM trades
  `)
};

// Alert queries
export const alertQueries = {
  getAll: db.prepare('SELECT * FROM alerts ORDER BY created_at DESC'),

  getActive: db.prepare('SELECT * FROM alerts WHERE enabled = 1 AND triggered = 0'),

  getById: db.prepare('SELECT * FROM alerts WHERE id = ?'),

  insert: db.prepare(`
    INSERT INTO alerts (
      id, symbol, condition, threshold, delivery_method, user_email
    ) VALUES (?, ?, ?, ?, ?, ?)
  `),

  updateEnabled: db.prepare('UPDATE alerts SET enabled = ? WHERE id = ?'),

  markTriggered: db.prepare(`
    UPDATE alerts SET triggered = 1, triggered_at = datetime('now')
    WHERE id = ?
  `),

  updateAIReasoning: db.prepare(`
    UPDATE alerts SET ai_reasoning = ?
    WHERE id = ?
  `),

  reset: db.prepare('UPDATE alerts SET triggered = 0, triggered_at = NULL WHERE id = ?'),

  delete: db.prepare('DELETE FROM alerts WHERE id = ?')
};

// Settings queries
export const settingsQueries = {
  get: db.prepare('SELECT * FROM settings WHERE id = 1'),

  update: db.prepare(`
    UPDATE settings SET
      email = ?,
      default_delivery_method = ?,
      dark_mode = ?,
      default_risk_percent = ?,
      indicator_weights = ?
    WHERE id = 1
  `)
};

export default db;
