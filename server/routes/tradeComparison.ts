import express from 'express';
import { compareTrades, TradeToCompare } from '../services/tradeComparison';

const router = express.Router();

/**
 * POST /api/trade-comparison
 * Compare multiple trades side-by-side
 */
router.post('/', async (req, res) => {
  try {
    const { trades } = req.body as { trades: TradeToCompare[] };

    if (!trades || !Array.isArray(trades)) {
      return res.status(400).json({ error: 'trades array is required' });
    }

    if (trades.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 trades to compare' });
    }

    if (trades.length > 4) {
      return res.status(400).json({ error: 'Can compare maximum 4 trades at once' });
    }

    console.log(`Comparing ${trades.length} trades:`, trades.map(t => t.symbol).join(', '));

    const comparison = await compareTrades(trades);

    res.json(comparison);
  } catch (error: any) {
    console.error('Error comparing trades:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
