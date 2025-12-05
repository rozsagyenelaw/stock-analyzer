import express from 'express';
import { getQuote } from '../services/twelveData';
import { analyzeOptionsFlow, getFlowAlerts } from '../services/optionsFlow';
import { simpleCacheMiddleware, CacheTTL } from '../services/redis';

const router = express.Router();

/**
 * GET /api/options-flow/:symbol
 * Get options flow analysis for a specific symbol
 */
router.get('/:symbol', simpleCacheMiddleware(CacheTTL.optionsChain), async (req, res) => {
  try {
    const { symbol } = req.params;

    // Get current stock price
    const quote = await getQuote(symbol);
    const currentPrice = parseFloat(quote.close);

    // Analyze options flow
    const analysis = analyzeOptionsFlow(symbol.toUpperCase(), currentPrice);

    res.json(analysis);
  } catch (error) {
    console.error(`Error fetching options flow for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch options flow data' });
  }
});

/**
 * GET /api/options-flow/alerts/watchlist
 * Get options flow alerts for watchlist symbols
 */
router.get('/alerts/watchlist', async (req, res) => {
  try {
    const { symbols } = req.query;

    if (!symbols || typeof symbols !== 'string') {
      return res.status(400).json({ error: 'Symbols parameter required (comma-separated)' });
    }

    const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());

    // Get current prices for all symbols
    const prices: { [symbol: string]: number } = {};

    for (const symbol of symbolList) {
      try {
        const quote = await getQuote(symbol);
        prices[symbol] = parseFloat(quote.close);
      } catch (error) {
        console.error(`Failed to get price for ${symbol}:`, error);
      }
    }

    // Get flow alerts
    const alerts = getFlowAlerts(symbolList, prices);

    res.json({ alerts });
  } catch (error) {
    console.error('Error fetching options flow alerts:', error);
    res.status(500).json({ error: 'Failed to fetch options flow alerts' });
  }
});

export default router;
