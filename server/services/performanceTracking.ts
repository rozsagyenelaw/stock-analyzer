import { db } from './database';

export interface PerformanceStats {
  winRate: number;
  avgGain: number;
  avgLoss: number;
  totalTrades: number;
  winners: number;
  losers: number;
  pending: number;
}

export interface TradeRecommendation {
  id?: number;
  symbol: string;
  entryPrice: number;
  targetPrice: number;
  stopPrice: number;
  aiScore: number;
  strategyType: string;
  category: string;
  recommendedDate: string;
  status: 'pending' | 'won' | 'lost';
  exitPrice?: number;
  exitDate?: string;
  gainLossPercent?: number;
}

export function initializePerformanceTracking(): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS trade_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        entry_price REAL NOT NULL,
        target_price REAL NOT NULL,
        stop_price REAL NOT NULL,
        ai_score INTEGER NOT NULL,
        strategy_type TEXT NOT NULL,
        category TEXT NOT NULL,
        recommended_date TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        exit_price REAL,
        exit_date TEXT,
        gain_loss_percent REAL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_recommendations_symbol
      ON trade_recommendations(symbol);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_recommendations_status
      ON trade_recommendations(status);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_recommendations_date
      ON trade_recommendations(recommended_date);
    `);

    console.log('✓ Performance tracking tables initialized');
  } catch (error) {
    console.error('Error initializing performance tracking:', error);
  }
}

export function saveRecommendation(rec: TradeRecommendation): number {
  try {
    const result = db.prepare(`
      INSERT INTO trade_recommendations (
        symbol, entry_price, target_price, stop_price,
        ai_score, strategy_type, category, recommended_date, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      rec.symbol,
      rec.entryPrice,
      rec.targetPrice,
      rec.stopPrice,
      rec.aiScore,
      rec.strategyType,
      rec.category,
      rec.recommendedDate,
      rec.status || 'pending'
    );

    return result.lastInsertRowid as number;
  } catch (error) {
    console.error('Error saving recommendation:', error);
    throw error;
  }
}

export function updateTradeOutcome(
  id: number,
  status: 'won' | 'lost',
  exitPrice: number,
  exitDate: string
): void {
  try {
    const trade = db.prepare('SELECT entry_price FROM trade_recommendations WHERE id = ?')
      .get(id) as { entry_price: number } | undefined;

    if (!trade) {
      console.error(`Trade ${id} not found`);
      return;
    }

    const gainLossPercent = ((exitPrice - trade.entry_price) / trade.entry_price) * 100;

    db.prepare(`
      UPDATE trade_recommendations
      SET status = ?, exit_price = ?, exit_date = ?, gain_loss_percent = ?
      WHERE id = ?
    `).run(status, exitPrice, exitDate, gainLossPercent, id);

    console.log(`Updated trade ${id}: ${status} with ${gainLossPercent.toFixed(2)}% gain/loss`);
  } catch (error) {
    console.error('Error updating trade outcome:', error);
  }
}

export async function checkPendingTrades(getQuoteFn: (symbol: string) => Promise<any>): Promise<void> {
  try {
    const pendingTrades = db.prepare(`
      SELECT * FROM trade_recommendations
      WHERE status = 'pending'
      AND recommended_date >= date('now', '-30 days')
    `).all() as any[];

    console.log(`Checking ${pendingTrades.length} pending trades...`);

    for (const trade of pendingTrades) {
      try {
        const quote = await getQuoteFn(trade.symbol);
        const currentPrice = parseFloat(quote.close);

        // Check if target hit (win)
        if (currentPrice >= trade.target_price) {
          updateTradeOutcome(
            trade.id,
            'won',
            trade.target_price,
            new Date().toISOString().split('T')[0]
          );
          console.log(`✓ ${trade.symbol} hit target: $${trade.target_price}`);
        }
        // Check if stop hit (loss)
        else if (currentPrice <= trade.stop_price) {
          updateTradeOutcome(
            trade.id,
            'lost',
            trade.stop_price,
            new Date().toISOString().split('T')[0]
          );
          console.log(`✗ ${trade.symbol} hit stop: $${trade.stop_price}`);
        }
      } catch (error) {
        console.error(`Error checking ${trade.symbol}:`, error);
      }
    }
  } catch (error) {
    console.error('Error checking pending trades:', error);
  }
}

export function getPerformanceStats(days: number = 30): PerformanceStats {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as winners,
        SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as losers,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        AVG(CASE WHEN status = 'won' THEN gain_loss_percent ELSE NULL END) as avg_gain,
        AVG(CASE WHEN status = 'lost' THEN gain_loss_percent ELSE NULL END) as avg_loss
      FROM trade_recommendations
      WHERE recommended_date >= ?
    `).get(cutoffStr) as any;

    const totalCompleted = (stats.winners || 0) + (stats.losers || 0);
    const winRate = totalCompleted > 0 ? ((stats.winners || 0) / totalCompleted) * 100 : 0;

    return {
      winRate: Math.round(winRate),
      avgGain: stats.avg_gain || 0,
      avgLoss: stats.avg_loss || 0,
      totalTrades: stats.total || 0,
      winners: stats.winners || 0,
      losers: stats.losers || 0,
      pending: stats.pending || 0,
    };
  } catch (error) {
    console.error('Error getting performance stats:', error);
    return {
      winRate: 0,
      avgGain: 0,
      avgLoss: 0,
      totalTrades: 0,
      winners: 0,
      losers: 0,
      pending: 0,
    };
  }
}

export function getRecentRecommendations(days: number = 30): TradeRecommendation[] {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const rows = db.prepare(`
      SELECT
        id, symbol, entry_price as entryPrice, target_price as targetPrice,
        stop_price as stopPrice, ai_score as aiScore, strategy_type as strategyType,
        category, recommended_date as recommendedDate, status,
        exit_price as exitPrice, exit_date as exitDate, gain_loss_percent as gainLossPercent
      FROM trade_recommendations
      WHERE recommended_date >= ?
      ORDER BY recommended_date DESC
    `).all(cutoffStr) as TradeRecommendation[];

    return rows;
  } catch (error) {
    console.error('Error getting recent recommendations:', error);
    return [];
  }
}
