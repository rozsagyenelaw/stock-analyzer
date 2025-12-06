import express from 'express';
import { validateTrade, TradeIdea } from '../services/tradeValidation';

const router = express.Router();

/**
 * POST /api/trade-validation
 * Validate a trade idea with AI analysis
 */
router.post('/', async (req, res) => {
  try {
    const trade = req.body as TradeIdea;

    // Validation
    if (!trade.symbol) {
      return res.status(400).json({ error: 'symbol is required' });
    }

    if (!trade.direction || !['long', 'short'].includes(trade.direction)) {
      return res.status(400).json({ error: 'direction must be "long" or "short"' });
    }

    if (!trade.entryPrice || trade.entryPrice <= 0) {
      return res.status(400).json({ error: 'valid entryPrice is required' });
    }

    if (!trade.targetPrice || trade.targetPrice <= 0) {
      return res.status(400).json({ error: 'valid targetPrice is required' });
    }

    if (!trade.stopLoss || trade.stopLoss <= 0) {
      return res.status(400).json({ error: 'valid stopLoss is required' });
    }

    // Validate stop loss placement
    if (trade.direction === 'long') {
      if (trade.stopLoss >= trade.entryPrice) {
        return res.status(400).json({ error: 'stop loss must be below entry price for long trades' });
      }
      if (trade.targetPrice <= trade.entryPrice) {
        return res.status(400).json({ error: 'target must be above entry price for long trades' });
      }
    } else {
      if (trade.stopLoss <= trade.entryPrice) {
        return res.status(400).json({ error: 'stop loss must be above entry price for short trades' });
      }
      if (trade.targetPrice >= trade.entryPrice) {
        return res.status(400).json({ error: 'target must be below entry price for short trades' });
      }
    }

    if (!trade.timeframe) {
      return res.status(400).json({ error: 'timeframe is required' });
    }

    console.log(`Validating ${trade.direction.toUpperCase()} trade: ${trade.symbol} @ $${trade.entryPrice}`);

    const validation = await validateTrade(trade);

    res.json(validation);
  } catch (error: any) {
    console.error('Error validating trade:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/trade-validation/batch
 * Validate multiple trades at once
 */
router.post('/batch', async (req, res) => {
  try {
    const { trades } = req.body as { trades: TradeIdea[] };

    if (!trades || !Array.isArray(trades)) {
      return res.status(400).json({ error: 'trades array is required' });
    }

    if (trades.length === 0) {
      return res.status(400).json({ error: 'at least one trade required' });
    }

    if (trades.length > 5) {
      return res.status(400).json({ error: 'maximum 5 trades allowed for batch validation' });
    }

    console.log(`Validating ${trades.length} trades in batch...`);

    const results = await Promise.all(
      trades.map(async (trade) => {
        try {
          const validation = await validateTrade(trade);
          return {
            symbol: trade.symbol,
            success: true,
            validation
          };
        } catch (error: any) {
          return {
            symbol: trade.symbol,
            success: false,
            error: error.message
          };
        }
      })
    );

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.json({
      total: trades.length,
      successful: successful.length,
      failed: failed.length,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in batch validation:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
