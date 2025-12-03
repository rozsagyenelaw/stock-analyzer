import { Router } from 'express';
import { tradeQueries } from '../services/database';
import { randomBytes } from 'crypto';

const router = Router();

// Get all trades
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    let trades;
    if (status === 'OPEN') {
      trades = tradeQueries.getOpen.all();
    } else if (status === 'CLOSED') {
      trades = tradeQueries.getClosed.all();
    } else {
      trades = tradeQueries.getAll.all();
    }

    res.json(trades);
  } catch (error: any) {
    console.error('Get trades error:', error);
    res.status(500).json({ error: 'Failed to fetch trades', message: error.message });
  }
});

// Get trade by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const trade = tradeQueries.getById.get(id);

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    res.json(trade);
  } catch (error: any) {
    console.error('Get trade error:', error);
    res.status(500).json({ error: 'Failed to fetch trade', message: error.message });
  }
});

// Get trades by symbol
router.get('/symbol/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const trades = tradeQueries.getBySymbol.all(symbol.toUpperCase());
    res.json(trades);
  } catch (error: any) {
    console.error('Get trades by symbol error:', error);
    res.status(500).json({ error: 'Failed to fetch trades', message: error.message });
  }
});

// Get trade statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = tradeQueries.getStats.get() as any;

    const winRate = stats.total_trades > 0 ? (stats.wins / stats.total_trades) * 100 : 0;
    const profitFactor =
      stats.avg_loss !== null && stats.avg_loss !== 0
        ? Math.abs((stats.wins * stats.avg_win) / (stats.losses * stats.avg_loss))
        : 0;

    res.json({
      totalTrades: stats.total_trades,
      wins: stats.wins,
      losses: stats.losses,
      winRate: Math.round(winRate * 10) / 10,
      avgWin: stats.avg_win || 0,
      avgLoss: stats.avg_loss || 0,
      totalProfitLoss: stats.total_profit_loss || 0,
      largestWin: stats.largest_win || 0,
      largestLoss: stats.largest_loss || 0,
      profitFactor: Math.round(profitFactor * 100) / 100,
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics', message: error.message });
  }
});

// Create new trade
router.post('/', async (req, res) => {
  try {
    const {
      symbol,
      direction,
      entryPrice,
      exitPrice,
      entryDate,
      exitDate,
      shares,
      strategyTag,
      notes,
      status,
    } = req.body;

    if (!symbol || !direction || !entryPrice || !entryDate || !shares) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = randomBytes(16).toString('hex');

    // Calculate profit/loss if trade is closed
    let profitLoss = null;
    let profitLossPercent = null;

    if (status === 'CLOSED' && exitPrice) {
      if (direction === 'LONG') {
        profitLoss = (exitPrice - entryPrice) * shares;
        profitLossPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
      } else {
        // SHORT
        profitLoss = (entryPrice - exitPrice) * shares;
        profitLossPercent = ((entryPrice - exitPrice) / entryPrice) * 100;
      }
    }

    tradeQueries.insert.run(
      id,
      symbol.toUpperCase(),
      direction,
      entryPrice,
      exitPrice || null,
      entryDate,
      exitDate || null,
      shares,
      strategyTag || null,
      notes || null,
      profitLoss,
      profitLossPercent,
      status || 'OPEN'
    );

    res.status(201).json({ message: 'Trade created', id });
  } catch (error: any) {
    console.error('Create trade error:', error);
    res.status(500).json({ error: 'Failed to create trade', message: error.message });
  }
});

// Update/close trade
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { exitPrice, exitDate, notes } = req.body;

    // Get existing trade
    const trade = tradeQueries.getById.get(id) as any;

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    if (!exitPrice) {
      return res.status(400).json({ error: 'Exit price is required to close trade' });
    }

    // Calculate profit/loss
    let profitLoss;
    let profitLossPercent;

    if (trade.direction === 'LONG') {
      profitLoss = (exitPrice - trade.entry_price) * trade.shares;
      profitLossPercent = ((exitPrice - trade.entry_price) / trade.entry_price) * 100;
    } else {
      // SHORT
      profitLoss = (trade.entry_price - exitPrice) * trade.shares;
      profitLossPercent = ((trade.entry_price - exitPrice) / trade.entry_price) * 100;
    }

    tradeQueries.update.run(
      exitPrice,
      exitDate || new Date().toISOString(),
      profitLoss,
      profitLossPercent,
      'CLOSED',
      notes || trade.notes,
      id
    );

    res.json({ message: 'Trade updated', id });
  } catch (error: any) {
    console.error('Update trade error:', error);
    res.status(500).json({ error: 'Failed to update trade', message: error.message });
  }
});

// Delete trade
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    tradeQueries.delete.run(id);
    res.json({ message: 'Trade deleted', id });
  } catch (error: any) {
    console.error('Delete trade error:', error);
    res.status(500).json({ error: 'Failed to delete trade', message: error.message });
  }
});

export default router;
