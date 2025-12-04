import express from 'express';
import { getQuote } from '../services/twelveData';
import { generateMockFundamentals, calculateDCF } from '../services/fundamentals';

const router = express.Router();

// Get comprehensive fundamental analysis for a stock
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    // Get current price and market cap
    const quote = await getQuote(symbol);

    // Generate fundamental analysis
    // Note: In production, this would fetch real data from financial APIs
    const fundamentals = generateMockFundamentals(
      symbol.toUpperCase(),
      quote.name || symbol,
      quote.close,
      quote.market_cap || quote.close * 1000000 // Fallback market cap estimate
    );

    res.json(fundamentals);
  } catch (error) {
    console.error(`Error fetching fundamentals for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch fundamental data' });
  }
});

// Calculate custom DCF valuation
router.post('/:symbol/dcf', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { revenueGrowthRate, terminalGrowthRate, discountRate, projectionYears, fcfMargin } = req.body;

    // Get current data
    const quote = await getQuote(symbol);
    const marketCap = quote.market_cap || quote.close * 1000000;
    const estimatedRevenue = marketCap * 2; // Rough estimate
    const sharesOutstanding = marketCap / quote.close;

    const dcf = calculateDCF(
      estimatedRevenue,
      quote.close,
      sharesOutstanding,
      {
        revenueGrowthRate: revenueGrowthRate || 0.15,
        terminalGrowthRate: terminalGrowthRate || 0.03,
        discountRate: discountRate || 0.10,
        projectionYears: projectionYears || 5,
        fcfMargin: fcfMargin || 0.15,
      }
    );

    res.json(dcf);
  } catch (error) {
    console.error(`Error calculating DCF for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to calculate DCF valuation' });
  }
});

export default router;
