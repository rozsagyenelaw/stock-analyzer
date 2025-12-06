import express from 'express';
import { getDailyRecommendations, ScanOptions } from '../services/dailyRecommendations';
import { getPerformanceStats, getRecentRecommendations } from '../services/performanceTracking';

const router = express.Router();

/**
 * GET /api/daily-picks
 * Get AI-powered daily trade recommendations
 */
router.get('/', async (req, res) => {
  console.log('[dailyPicks] ===== REQUEST RECEIVED =====');
  console.log('[dailyPicks] URL:', req.url);
  console.log('[dailyPicks] Query params:', req.query);
  console.log('[dailyPicks] Headers:', req.headers);

  try {
    const { accountSize, riskLevel, categories, minScore } = req.query;

    const options: ScanOptions = {
      accountSize: accountSize ? parseFloat(accountSize as string) : 10000,
      riskLevel: (riskLevel as 'conservative' | 'moderate' | 'aggressive') || 'moderate',
      minScore: minScore ? parseFloat(minScore as string) : 60,
    };

    // Parse categories if provided
    if (categories) {
      const cats = (categories as string).split(',');
      options.categories = cats.filter(c => c === 'stock_trade' || c === 'options_trade') as any;
    }

    console.log('[dailyPicks] Fetching daily recommendations with options:', options);

    const recommendations = await getDailyRecommendations(options);

    console.log('[dailyPicks] Success! Returning', recommendations.topPicks.length, 'recommendations');
    res.json(recommendations);
  } catch (error: any) {
    console.error('[dailyPicks] ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/daily-picks/quick
 * Get just the top 5 picks (faster)
 */
router.get('/quick', async (req, res) => {
  try {
    const { accountSize, riskLevel } = req.query;

    const options: ScanOptions = {
      accountSize: accountSize ? parseFloat(accountSize as string) : 10000,
      riskLevel: (riskLevel as 'conservative' | 'moderate' | 'aggressive') || 'moderate',
      minScore: 70, // Higher threshold for quick picks
    };

    console.log('Fetching quick daily picks...');

    const recommendations = await getDailyRecommendations(options);

    // Return only top 5
    res.json({
      date: recommendations.date,
      topPicks: recommendations.topPicks.slice(0, 5),
      aiInsights: recommendations.aiInsights,
      summary: recommendations.summary,
    });
  } catch (error: any) {
    console.error('Error fetching quick picks:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/daily-picks/performance
 * Get performance statistics for Daily Picks recommendations
 */
router.get('/performance', async (req, res) => {
  try {
    const { days } = req.query;
    const dayCount = days ? parseInt(days as string) : 30;

    const stats = getPerformanceStats(dayCount);
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching performance stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/daily-picks/history
 * Get recent recommendations with outcomes
 */
router.get('/history', async (req, res) => {
  try {
    const { days } = req.query;
    const dayCount = days ? parseInt(days as string) : 30;

    const recommendations = getRecentRecommendations(dayCount);
    res.json({ recommendations });
  } catch (error: any) {
    console.error('Error fetching recommendation history:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
