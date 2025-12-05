import express from 'express';
import {
  scanCoveredCalls,
  scanCashSecuredPuts,
  scanCheapCallsOnBreakouts,
  scanLEAPOpportunities,
  generateOptionAnalysis,
  ScanOptions,
} from '../services/optionsStrategies';
import { getOptionsChain, getOptionsExpirations } from '../services/optionsChain';
import db from '../services/database';

const router = express.Router();

// Get popular stocks for scanning (from stock universe or watchlist)
function getPopularStocks(limit: number = 50): string[] {
  const stocks = db
    .prepare(
      `
    SELECT symbol FROM stock_universe
    WHERE is_active = 1
    ORDER BY market_cap DESC
    LIMIT ?
  `
    )
    .all(limit) as { symbol: string }[];

  return stocks.map(s => s.symbol);
}

/**
 * GET /api/options-ideas/scan/:strategy
 * Scan for options opportunities by strategy
 */
router.get('/scan/:strategy', async (req, res) => {
  try {
    const { strategy } = req.params;
    const {
      accountSize,
      riskLevel = 'moderate',
      maxRiskPerTrade = 2,
      symbols,
      useAI = 'false',
    } = req.query;

    const scanOptions: ScanOptions = {
      accountSize: accountSize ? parseFloat(accountSize as string) : undefined,
      riskLevel: riskLevel as 'conservative' | 'moderate' | 'aggressive',
      maxRiskPerTrade: parseFloat(maxRiskPerTrade as string),
    };

    // Get symbols to scan
    const stocksToScan = symbols
      ? (symbols as string).split(',')
      : getPopularStocks(30); // Scan top 30 by default

    console.log(`Scanning ${stocksToScan.length} stocks for ${strategy} strategy...`);

    let suggestions;

    switch (strategy) {
      case 'covered-calls':
        suggestions = await scanCoveredCalls(stocksToScan, scanOptions);
        break;

      case 'cash-secured-puts':
        suggestions = await scanCashSecuredPuts(stocksToScan, scanOptions);
        break;

      case 'long-calls-breakout':
        suggestions = await scanCheapCallsOnBreakouts(stocksToScan, scanOptions);
        break;

      case 'leaps':
        suggestions = await scanLEAPOpportunities(stocksToScan, scanOptions);
        break;

      default:
        return res.status(400).json({ error: 'Invalid strategy' });
    }

    // Add AI analysis to top suggestions if requested
    if (useAI === 'true' && suggestions.length > 0) {
      console.log('Generating AI analysis for top 5 suggestions...');
      const topSuggestions = suggestions.slice(0, 5);

      for (let i = 0; i < topSuggestions.length; i++) {
        topSuggestions[i] = await generateOptionAnalysis(
          topSuggestions[i],
          scanOptions.accountSize
        );
      }

      // Replace top 5 with AI-enhanced versions
      suggestions = [...topSuggestions, ...suggestions.slice(5)];
    }

    res.json({
      strategy,
      count: suggestions.length,
      stocksScanned: stocksToScan.length,
      suggestions,
    });
  } catch (error: any) {
    console.error('Error scanning options:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/options-ideas/chain/:symbol
 * Get full options chain for a symbol
 */
router.get('/chain/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { expiration } = req.query;

    const chain = await getOptionsChain(symbol, expiration as string | undefined);

    res.json(chain);
  } catch (error: any) {
    console.error('Error fetching options chain:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/options-ideas/expirations/:symbol
 * Get available expiration dates for a symbol
 */
router.get('/expirations/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const expirations = await getOptionsExpirations(symbol);

    res.json({ symbol, expirations });
  } catch (error: any) {
    console.error('Error fetching expirations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/options-ideas/analyze
 * Get AI analysis for a specific option
 */
router.post('/analyze', async (req, res) => {
  try {
    const { suggestion, accountSize } = req.body;

    if (!suggestion) {
      return res.status(400).json({ error: 'Suggestion object required' });
    }

    const analyzed = await generateOptionAnalysis(suggestion, accountSize);

    res.json(analyzed);
  } catch (error: any) {
    console.error('Error analyzing option:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/options-ideas/strategies
 * Get list of available strategies
 */
router.get('/strategies', (req, res) => {
  const strategies = [
    {
      id: 'covered-calls',
      name: 'Best Covered Calls',
      description: 'Sell calls against stocks you own for income',
      category: 'sell_premium',
      difficulty: 'beginner',
      capitalRequired: 'high',
    },
    {
      id: 'cash-secured-puts',
      name: 'Cash-Secured Puts',
      description: 'Sell puts to collect premium or buy stocks at discount',
      category: 'sell_premium',
      difficulty: 'beginner',
      capitalRequired: 'high',
    },
    {
      id: 'long-calls-breakout',
      name: 'Long Calls on Breakouts',
      description: 'Buy calls when stocks break out with low IV',
      category: 'buy_options',
      difficulty: 'intermediate',
      capitalRequired: 'low',
    },
    {
      id: 'leaps',
      name: 'LEAP Opportunities',
      description: 'Long-dated deep ITM calls as stock replacement',
      category: 'buy_options',
      difficulty: 'intermediate',
      capitalRequired: 'medium',
    },
  ];

  res.json(strategies);
});

export default router;
