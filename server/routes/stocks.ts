import { Router } from 'express';
import { getQuote, getTimeSeries, searchSymbol, getProfile } from '../services/twelveData';
import { getAllIndicators } from '../services/indicators';
import { calculateSignalAnalysis } from '../services/scoring';

const router = Router();

// Search for stocks
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await searchSymbol(q);
    res.json(results);
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search stocks', message: error.message });
  }
});

// Get stock quote
router.get('/:symbol/quote', async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = await getQuote(symbol.toUpperCase());
    res.json(quote);
  } catch (error: any) {
    console.error('Quote error:', error);
    res.status(500).json({ error: 'Failed to fetch quote', message: error.message });
  }
});

// Get stock time series data
router.get('/:symbol/timeseries', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1day', outputsize = '100' } = req.query;

    const timeSeries = await getTimeSeries(
      symbol.toUpperCase(),
      interval as string,
      parseInt(outputsize as string)
    );

    res.json(timeSeries);
  } catch (error: any) {
    console.error('Time series error:', error);
    res.status(500).json({ error: 'Failed to fetch time series', message: error.message });
  }
});

// Get all technical indicators
router.get('/:symbol/indicators', async (req, res) => {
  try {
    const { symbol } = req.params;
    const indicators = await getAllIndicators(symbol.toUpperCase());
    res.json(indicators);
  } catch (error: any) {
    console.error('Indicators error:', error);
    res.status(500).json({ error: 'Failed to fetch indicators', message: error.message });
  }
});

// Get complete analysis with signals
router.get('/:symbol/analysis', async (req, res) => {
  try {
    const { symbol } = req.params;
    const symbolUpper = symbol.toUpperCase();

    // Fetch quote and indicators in parallel
    const [quote, indicators] = await Promise.all([
      getQuote(symbolUpper),
      getAllIndicators(symbolUpper),
    ]);

    const currentPrice = parseFloat(quote.close);

    // Calculate signal analysis
    const analysis = await calculateSignalAnalysis(symbolUpper, indicators, currentPrice);

    res.json({
      symbol: symbolUpper,
      name: quote.name,
      price: currentPrice,
      change: parseFloat(quote.change),
      changePercent: parseFloat(quote.percent_change),
      volume: parseInt(quote.volume),
      avgVolume: parseInt(quote.average_volume),
      marketCap: null, // Would need additional endpoint
      ...analysis,
    });
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to fetch analysis', message: error.message });
  }
});

// Get stock profile/company info
router.get('/:symbol/profile', async (req, res) => {
  try {
    const { symbol } = req.params;
    const profile = await getProfile(symbol.toUpperCase());
    res.json(profile);
  } catch (error: any) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile', message: error.message });
  }
});

export default router;
