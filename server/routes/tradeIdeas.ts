import express from 'express';
import {
  scanMomentumBreakouts,
  scanOversoldBounce,
  scanMACDCrossover,
  scanPullbackPlay,
  ScanFilters,
} from '../services/shortTermTrading';

const router = express.Router();

/**
 * GET /api/trade-ideas/scan/:strategy
 * Scan for short-term trade opportunities
 */
router.get('/scan/:strategy', async (req, res) => {
  try {
    const { strategy } = req.params;
    const { minPrice, maxPrice, minVolume, accountSize } = req.query;

    const filters: ScanFilters = {
      minPrice: minPrice ? parseFloat(minPrice as string) : 5,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : 50,
      minVolume: minVolume ? parseFloat(minVolume as string) : 500000,
      accountSize: accountSize ? parseFloat(accountSize as string) : undefined,
    };

    console.log(`Scanning for ${strategy} with filters:`, filters);

    let ideas;

    switch (strategy) {
      case 'momentum-breakout':
        ideas = await scanMomentumBreakouts(filters);
        break;

      case 'oversold-bounce':
        ideas = await scanOversoldBounce(filters);
        break;

      case 'macd-crossover':
        ideas = await scanMACDCrossover(filters);
        break;

      case 'pullback-play':
        ideas = await scanPullbackPlay(filters);
        break;

      default:
        return res.status(400).json({ error: 'Invalid strategy' });
    }

    res.json({
      strategy,
      count: ideas.length,
      filters,
      ideas,
    });
  } catch (error: any) {
    console.error('Error scanning trade ideas:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/trade-ideas/strategies
 * Get list of available trade strategies
 */
router.get('/strategies', (req, res) => {
  const strategies = [
    {
      id: 'momentum-breakout',
      name: 'Momentum Breakouts',
      description: 'Breaking above resistance with high volume',
      tradeType: 'day_trade',
      timeframe: 'Minutes to hours',
      difficulty: 'beginner',
      targetGain: '2-3%',
    },
    {
      id: 'oversold-bounce',
      name: 'Oversold Bounce',
      description: 'Deeply oversold stocks at support levels',
      tradeType: 'swing_trade',
      timeframe: '1-3 days',
      difficulty: 'beginner',
      targetGain: '3-5%',
    },
    {
      id: 'macd-crossover',
      name: 'MACD Crossover',
      description: 'Fresh bullish MACD signals in uptrend',
      tradeType: 'swing_trade',
      timeframe: '3-7 days',
      difficulty: 'intermediate',
      targetGain: '5-7%',
    },
    {
      id: 'pullback-play',
      name: 'Pullback to EMA',
      description: 'Buying dips in established uptrends',
      tradeType: 'swing_trade',
      timeframe: '1-2 weeks',
      difficulty: 'intermediate',
      targetGain: '7-10%',
    },
  ];

  res.json(strategies);
});

export default router;
