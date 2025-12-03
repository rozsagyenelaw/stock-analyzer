import { Router } from 'express';
import { watchlistQueries } from '../services/database';
import { getQuote } from '../services/twelveData';

const router = Router();

// Get all watchlist items
router.get('/', async (req, res) => {
  try {
    const watchlist = watchlistQueries.getAll.all();
    res.json(watchlist);
  } catch (error: any) {
    console.error('Watchlist fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist', message: error.message });
  }
});

// Get watchlist with live prices
router.get('/with-prices', async (req, res) => {
  try {
    const watchlist = watchlistQueries.getAll.all() as any[];

    // Fetch live prices for all symbols
    const watchlistWithPrices = await Promise.all(
      watchlist.map(async (item) => {
        try {
          const quote = await getQuote(item.symbol);
          return {
            ...item,
            price: parseFloat(quote.close),
            change: parseFloat(quote.change),
            changePercent: parseFloat(quote.percent_change),
            volume: parseInt(quote.volume),
          };
        } catch (error) {
          console.error(`Failed to fetch price for ${item.symbol}:`, error);
          return {
            ...item,
            price: null,
            change: null,
            changePercent: null,
            volume: null,
            error: 'Failed to fetch price',
          };
        }
      })
    );

    res.json(watchlistWithPrices);
  } catch (error: any) {
    console.error('Watchlist with prices error:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist with prices', message: error.message });
  }
});

// Add to watchlist
router.post('/', async (req, res) => {
  try {
    const { symbol, name, sector, industry } = req.body;

    if (!symbol || !name) {
      return res.status(400).json({ error: 'Symbol and name are required' });
    }

    // Check if already exists
    const exists = watchlistQueries.exists.get(symbol.toUpperCase()) as any;
    if (exists.count > 0) {
      return res.status(409).json({ error: 'Symbol already in watchlist' });
    }

    watchlistQueries.add.run(symbol.toUpperCase(), name, sector || null, industry || null);

    res.status(201).json({ message: 'Added to watchlist', symbol: symbol.toUpperCase() });
  } catch (error: any) {
    console.error('Add to watchlist error:', error);
    res.status(500).json({ error: 'Failed to add to watchlist', message: error.message });
  }
});

// Remove from watchlist
router.delete('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    watchlistQueries.remove.run(symbol.toUpperCase());
    res.json({ message: 'Removed from watchlist', symbol: symbol.toUpperCase() });
  } catch (error: any) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({ error: 'Failed to remove from watchlist', message: error.message });
  }
});

// Update watchlist order
router.put('/order', async (req, res) => {
  try {
    const { items } = req.body; // Array of { symbol, sortOrder }

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    // Update each item's sort order
    for (const item of items) {
      watchlistQueries.updateOrder.run(item.sortOrder, item.symbol);
    }

    res.json({ message: 'Watchlist order updated' });
  } catch (error: any) {
    console.error('Update watchlist order error:', error);
    res.status(500).json({ error: 'Failed to update watchlist order', message: error.message });
  }
});

export default router;
