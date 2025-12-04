import express from 'express';
import { db } from '../services/database';
import { getQuote, getTimeSeries } from '../services/twelveData';
import { calculateRSI, calculateMACD, calculateSMA } from '../services/indicators';

const router = express.Router();

// Pre-built scan templates
const PREBUILT_SCANS = [
  {
    id: 'oversold-rsi',
    name: 'Oversold RSI',
    description: 'Stocks with RSI below 30 (potentially oversold)',
    filters: [
      { field: 'rsi', operator: 'lt', value: 30 }
    ],
    isPrebuilt: true
  },
  {
    id: 'overbought-rsi',
    name: 'Overbought RSI',
    description: 'Stocks with RSI above 70 (potentially overbought)',
    filters: [
      { field: 'rsi', operator: 'gt', value: 70 }
    ],
    isPrebuilt: true
  },
  {
    id: 'golden-cross',
    name: 'Golden Cross',
    description: 'SMA(50) recently crossed above SMA(200)',
    filters: [
      { field: 'sma50', operator: 'gt', value: 0, label: 'SMA50 > SMA200' }
    ],
    isPrebuilt: true
  },
  {
    id: 'death-cross',
    name: 'Death Cross',
    description: 'SMA(50) recently crossed below SMA(200)',
    filters: [
      { field: 'sma50', operator: 'lt', value: 0, label: 'SMA50 < SMA200' }
    ],
    isPrebuilt: true
  },
  {
    id: 'strong-momentum',
    name: 'Strong Momentum',
    description: 'Stocks up >5% with strong volume',
    filters: [
      { field: 'changePercent', operator: 'gt', value: 5 },
      { field: 'volumeRatio', operator: 'gt', value: 1.5 }
    ],
    isPrebuilt: true
  },
  {
    id: 'weak-momentum',
    name: 'Weak Momentum',
    description: 'Stocks down >5% with strong volume',
    filters: [
      { field: 'changePercent', operator: 'lt', value: -5 },
      { field: 'volumeRatio', operator: 'gt', value: 1.5 }
    ],
    isPrebuilt: true
  },
  {
    id: 'value-stocks',
    name: 'Value Stocks',
    description: 'Low P/E ratio stocks (< 15)',
    filters: [
      { field: 'peRatio', operator: 'lt', value: 15 },
      { field: 'peRatio', operator: 'gt', value: 0 }
    ],
    isPrebuilt: true
  },
  {
    id: 'growth-stocks',
    name: 'Growth Stocks',
    description: 'High growth with strong technicals',
    filters: [
      { field: 'changePercent', operator: 'gt', value: 3 },
      { field: 'rsi', operator: 'between', value: [40, 70] }
    ],
    isPrebuilt: true
  },
  {
    id: 'breakout-candidates',
    name: 'Breakout Candidates',
    description: 'Price above SMA(20) with increasing volume',
    filters: [
      { field: 'price', operator: 'gt', value: 0, label: 'Price > SMA20' },
      { field: 'volumeRatio', operator: 'gt', value: 1.2 }
    ],
    isPrebuilt: true
  },
  {
    id: 'strong-buy-signals',
    name: 'Strong Buy Signals',
    description: 'Multiple bullish indicators aligned',
    filters: [
      { field: 'rsi', operator: 'between', value: [30, 70] },
      { field: 'macd', operator: 'gt', value: 0 },
      { field: 'changePercent', operator: 'gt', value: 0 }
    ],
    isPrebuilt: true
  }
];

// Get all pre-built scans
router.get('/scans/prebuilt', (req, res) => {
  res.json(PREBUILT_SCANS);
});

// Get all custom saved scans
router.get('/scans/custom', (req, res) => {
  try {
    const scans = db.prepare(`
      SELECT * FROM screener_scans
      ORDER BY created_at DESC
    `).all();

    scans.forEach((scan: any) => {
      scan.filters = JSON.parse(scan.filters);
    });

    res.json(scans);
  } catch (error) {
    console.error('Error fetching custom scans:', error);
    res.status(500).json({ error: 'Failed to fetch custom scans' });
  }
});

// Save a custom scan
router.post('/scans/custom', (req, res) => {
  try {
    const { name, description, filters } = req.body;

    if (!name || !filters || !Array.isArray(filters)) {
      return res.status(400).json({ error: 'Name and filters are required' });
    }

    const result = db.prepare(`
      INSERT INTO screener_scans (name, description, filters)
      VALUES (?, ?, ?)
    `).run(name, description || null, JSON.stringify(filters));

    const scan = db.prepare('SELECT * FROM screener_scans WHERE id = ?').get(result.lastInsertRowid);

    if (scan) {
      (scan as any).filters = JSON.parse((scan as any).filters);
    }

    res.json(scan);
  } catch (error) {
    console.error('Error saving custom scan:', error);
    res.status(500).json({ error: 'Failed to save custom scan' });
  }
});

// Delete a custom scan
router.delete('/scans/custom/:id', (req, res) => {
  try {
    const { id } = req.params;

    db.prepare('DELETE FROM screener_scans WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom scan:', error);
    res.status(500).json({ error: 'Failed to delete custom scan' });
  }
});

// Run a screen (simplified version - would need stock universe data)
router.post('/run', async (req, res) => {
  try {
    const { filters, symbols } = req.body;

    if (!filters || !Array.isArray(filters)) {
      return res.status(400).json({ error: 'Filters are required' });
    }

    // For demo purposes, use watchlist symbols or provided symbols
    let stockSymbols: string[] = symbols || [];

    if (stockSymbols.length === 0) {
      // Get from watchlist as fallback
      const watchlist = db.prepare('SELECT symbol FROM watchlist').all();
      stockSymbols = watchlist.map((item: any) => item.symbol);
    }

    if (stockSymbols.length === 0) {
      return res.json([]); // No stocks to screen
    }

    const results = [];

    // Screen each stock (limit to avoid API overload)
    for (const symbol of stockSymbols.slice(0, 20)) {
      try {
        const quote = await getQuote(symbol);
        const timeSeries = await getTimeSeries(symbol, '1day', 100);

        // Calculate indicators
        const rsiData = await calculateRSI(symbol);
        const macdData = await calculateMACD(symbol);
        const sma20 = await calculateSMA(symbol, 20);
        const sma50 = await calculateSMA(symbol, 50);
        const sma200 = await calculateSMA(symbol, 200);

        const stockData = {
          symbol: quote.symbol,
          name: quote.name || symbol,
          price: quote.close,
          change: quote.change,
          changePercent: quote.percent_change,
          volume: quote.volume,
          marketCap: quote.market_cap,
          rsi: rsiData?.value as number,
          macd: typeof macdData?.value === 'object' ? (macdData.value as any).macd : null,
          sma20: sma20?.value as number,
          sma50: sma50?.value as number,
          sma200: sma200?.value as number,
          volumeRatio: quote.volume / (quote.avg_volume || quote.volume),
        };

        // Check if stock passes all filters
        const passesFilters = filters.every((filter: any) => {
          const fieldValue = (stockData as any)[filter.field];

          if (fieldValue === null || fieldValue === undefined) {
            return false;
          }

          switch (filter.operator) {
            case 'gt':
              return fieldValue > filter.value;
            case 'lt':
              return fieldValue < filter.value;
            case 'gte':
              return fieldValue >= filter.value;
            case 'lte':
              return fieldValue <= filter.value;
            case 'eq':
              return fieldValue === filter.value;
            case 'between':
              return fieldValue >= filter.value[0] && fieldValue <= filter.value[1];
            default:
              return false;
          }
        });

        if (passesFilters) {
          results.push(stockData);
        }
      } catch (error) {
        console.error(`Error screening ${symbol}:`, error);
        // Continue with next stock
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error running screen:', error);
    res.status(500).json({ error: 'Failed to run screen' });
  }
});

export default router;
