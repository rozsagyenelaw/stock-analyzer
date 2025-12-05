import express from 'express';
import { getQuote } from '../services/twelveData';
import {
  generateOptionsChain,
  generateOptionsAnalysis,
  analyzeStrategy,
  buildStrategyFromTemplate,
} from '../services/options';
import { simpleCacheMiddleware, CacheTTL } from '../services/redis';

const router = express.Router();

/**
 * GET /api/options/:symbol
 * Get comprehensive options analysis for a symbol
 */
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    // Get current stock price
    const quote = await getQuote(symbol);

    // Generate complete options analysis
    const analysis = generateOptionsAnalysis(symbol.toUpperCase(), quote.close);

    res.json(analysis);
  } catch (error) {
    console.error(`Error fetching options for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch options data' });
  }
});

/**
 * GET /api/options/:symbol/chain
 * Get options chain for a specific expiration (cached for 5 minutes)
 */
router.get('/:symbol/chain', simpleCacheMiddleware(CacheTTL.optionsChain), async (req, res) => {
  try {
    const { symbol } = req.params;
    const { expiration } = req.query;

    if (!expiration || typeof expiration !== 'string') {
      return res.status(400).json({ error: 'Expiration date required (YYYY-MM-DD)' });
    }

    // Get current stock price
    const quote = await getQuote(symbol);

    // Generate options chain
    const chain = generateOptionsChain(symbol.toUpperCase(), quote.close, expiration);

    res.json(chain);
  } catch (error) {
    console.error(`Error fetching options chain for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch options chain' });
  }
});

/**
 * POST /api/options/:symbol/strategy
 * Analyze a custom options strategy
 */
router.post('/:symbol/strategy', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { name, description, legs } = req.body;

    if (!name || !legs || !Array.isArray(legs) || legs.length === 0) {
      return res.status(400).json({ error: 'Strategy name and legs required' });
    }

    // Get current stock price
    const quote = await getQuote(symbol);

    // Analyze the strategy
    const strategy = analyzeStrategy(
      {
        name,
        description: description || '',
        legs,
      },
      quote.close
    );

    res.json(strategy);
  } catch (error) {
    console.error(`Error analyzing strategy for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to analyze strategy' });
  }
});

/**
 * GET /api/options/:symbol/strategy/:template
 * Build a strategy from a template
 */
router.get('/:symbol/strategy/:template', async (req, res) => {
  try {
    const { symbol, template } = req.params;
    const { expiration, dte } = req.query;

    // Get current stock price
    const quote = await getQuote(symbol);

    // Generate options chain
    let expirationDate: string;
    if (expiration && typeof expiration === 'string') {
      expirationDate = expiration;
    } else {
      // Default to 30 days
      const daysToAdd = dte && typeof dte === 'string' ? parseInt(dte) : 30;
      const exp = new Date();
      exp.setDate(exp.getDate() + daysToAdd);
      expirationDate = exp.toISOString().split('T')[0];
    }

    const chain = generateOptionsChain(symbol.toUpperCase(), quote.close, expirationDate);

    // Build strategy from template
    const strategy = buildStrategyFromTemplate(
      template as any,
      chain,
      dte && typeof dte === 'string' ? parseInt(dte) : undefined
    );

    if (!strategy) {
      return res.status(400).json({ error: 'Invalid strategy template or insufficient options' });
    }

    res.json(strategy);
  } catch (error) {
    console.error(`Error building strategy ${req.params.template} for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to build strategy' });
  }
});

export default router;
