import express from 'express';
import { getQuote } from '../services/twelveData';
import { getAllIndicators } from '../services/indicators';
import { generateTradeSignal } from '../services/tradeSignals';
import { compareStrategies, determineMarketOutlook } from '../services/strategyRecommender';
import { simpleCacheMiddleware, CacheTTL } from '../services/redis';

const router = express.Router();

/**
 * GET /api/trading/signals/:symbol
 * Get trade entry/exit signals for a stock
 */
router.get('/signals/:symbol', simpleCacheMiddleware(CacheTTL.stockAnalysis), async (req, res) => {
  try {
    const { symbol } = req.params;
    const { accountSize, riskPercentage } = req.query;

    // Get current stock price and indicators
    const quote = await getQuote(symbol.toUpperCase());
    const currentPrice = parseFloat(quote.close);
    const indicators = await getAllIndicators(symbol.toUpperCase());

    // Generate trade signal
    const signal = generateTradeSignal(
      symbol.toUpperCase(),
      currentPrice,
      indicators,
      accountSize ? parseFloat(accountSize as string) : 10000,
      riskPercentage ? parseFloat(riskPercentage as string) : 1
    );

    res.json({
      symbol: symbol.toUpperCase(),
      currentPrice,
      quote: {
        open: parseFloat(quote.open),
        high: parseFloat(quote.high),
        low: parseFloat(quote.low),
        close: parseFloat(quote.close),
        volume: parseInt(quote.volume),
        change: parseFloat(quote.change),
        changePercent: parseFloat(quote.percent_change),
      },
      signal,
    });
  } catch (error) {
    console.error(`Error generating trade signal for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to generate trade signal' });
  }
});

/**
 * GET /api/trading/strategies/:symbol
 * Get options strategy recommendations
 */
router.get('/strategies/:symbol', simpleCacheMiddleware(CacheTTL.optionsChain), async (req, res) => {
  try {
    const { symbol } = req.params;
    const { expiration } = req.query;

    // Get current stock price and indicators
    const quote = await getQuote(symbol.toUpperCase());
    const currentPrice = parseFloat(quote.close);
    const indicators = await getAllIndicators(symbol.toUpperCase());

    // Determine expiration date
    let expirationDate: string;
    if (expiration && typeof expiration === 'string') {
      expirationDate = expiration;
    } else {
      // Default to 30 days out
      const exp = new Date();
      exp.setDate(exp.getDate() + 30);
      expirationDate = exp.toISOString().split('T')[0];
    }

    // Get strategy recommendations
    const comparison = compareStrategies(
      symbol.toUpperCase(),
      currentPrice,
      indicators,
      expirationDate
    );

    res.json(comparison);
  } catch (error) {
    console.error(`Error generating strategy recommendations for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to generate strategy recommendations' });
  }
});

/**
 * GET /api/trading/outlook/:symbol
 * Get market outlook for a stock
 */
router.get('/outlook/:symbol', simpleCacheMiddleware(CacheTTL.stockAnalysis), async (req, res) => {
  try {
    const { symbol } = req.params;

    // Get current stock price and indicators
    const quote = await getQuote(symbol.toUpperCase());
    const currentPrice = parseFloat(quote.close);
    const indicators = await getAllIndicators(symbol.toUpperCase());

    // Determine market outlook
    const outlook = determineMarketOutlook(indicators, currentPrice);

    res.json({
      symbol: symbol.toUpperCase(),
      currentPrice,
      outlook,
      indicators: {
        rsi: indicators.rsi,
        macd: indicators.macd,
        macdSignal: indicators.macdSignal,
        sma20: indicators.sma20,
        sma50: indicators.sma50,
        adx: indicators.adx,
      },
    });
  } catch (error) {
    console.error(`Error determining market outlook for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to determine market outlook' });
  }
});

export default router;
