import express from 'express';
import { getDailyRecommendations, ScanOptions } from '../services/dailyRecommendations';

const router = express.Router();

/**
 * GET /api/daily-picks
 * Get AI-powered daily trade recommendations
 */
router.get('/', async (req, res) => {
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

    console.log('Fetching daily recommendations with options:', options);

    const recommendations = await getDailyRecommendations(options);

    res.json(recommendations);
  } catch (error: any) {
    console.error('Error fetching daily recommendations:', error);
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

export default router;
