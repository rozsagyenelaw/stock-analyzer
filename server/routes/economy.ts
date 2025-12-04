import { Router } from 'express';
import {
  getMockEconomicEvents,
  storeEconomicEvent,
  getEconomicEvents,
  generateMockSectorPerformance,
  storeSectorPerformance,
  getSectorPerformance,
  calculateSectorCorrelations,
  detectMarketRegime,
  storeMarketRegime,
  getMarketRegime,
} from '../services/economicCalendar';

const router = Router();

/**
 * GET /api/economy/calendar - Get economic calendar events
 */
router.get('/calendar', async (req, res) => {
  try {
    const { start_date, end_date, impact } = req.query;

    let events = getEconomicEvents(
      start_date as string,
      end_date as string,
      impact as string
    );

    // If no events, generate mock data
    if (events.length === 0) {
      const mockEvents = getMockEconomicEvents(60);
      mockEvents.forEach(event => storeEconomicEvent(event));
      events = getEconomicEvents(start_date as string, end_date as string, impact as string);
    }

    res.json(events);
  } catch (error: any) {
    console.error('Error fetching calendar:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/economy/sectors - Get sector performance
 */
router.get('/sectors', async (req, res) => {
  try {
    const { timeframe = 'daily', limit = 100 } = req.query;

    let sectors = getSectorPerformance(timeframe as string, parseInt(limit as string));

    // Generate mock data if none exists
    if (sectors.length === 0) {
      const mockSectors = generateMockSectorPerformance();
      mockSectors.forEach(sector => storeSectorPerformance(sector));
      sectors = getSectorPerformance(timeframe as string, parseInt(limit as string));
    }

    res.json(sectors);
  } catch (error: any) {
    console.error('Error fetching sectors:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/economy/correlations - Get sector correlations
 */
router.get('/correlations', async (req, res) => {
  try {
    const { period = 90 } = req.query;

    const correlations = calculateSectorCorrelations(parseInt(period as string));

    res.json(correlations);
  } catch (error: any) {
    console.error('Error calculating correlations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/economy/regime - Get market regime
 */
router.get('/regime', async (req, res) => {
  try {
    let regimes = getMarketRegime(30);

    // Generate current regime if none exists
    if (regimes.length === 0) {
      const currentRegime = detectMarketRegime();
      storeMarketRegime(currentRegime);
      regimes = getMarketRegime(30);
    }

    res.json(regimes);
  } catch (error: any) {
    console.error('Error fetching regime:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/economy/rotation - Get sector rotation analysis
 */
router.get('/rotation', async (req, res) => {
  try {
    const sectors = getSectorPerformance('daily', 100);
    const regimes = getMarketRegime(1);
    const correlations = calculateSectorCorrelations(90);

    // Generate if missing
    if (sectors.length === 0) {
      const mockSectors = generateMockSectorPerformance();
      mockSectors.forEach(s => storeSectorPerformance(s));
    }

    if (regimes.length === 0) {
      const currentRegime = detectMarketRegime();
      storeMarketRegime(currentRegime);
    }

    const latestSectors = getSectorPerformance('daily', 20);
    const latestRegime = getMarketRegime(1)[0];

    // Identify rotation opportunities
    const opportunities = latestSectors
      .filter(s => s.rotation_signal && s.rotation_signal !== 'HOLD')
      .map(s => ({
        sector: s.sector,
        signal: s.rotation_signal,
        momentum: s.momentum_score || 50,
        reason: s.rotation_signal === 'ROTATE_IN'
          ? `Strong momentum (${s.momentum_score?.toFixed(0)}) and positive trend`
          : `Weak momentum (${s.momentum_score?.toFixed(0)}) and negative trend`,
      }));

    res.json({
      date: new Date().toISOString().split('T')[0],
      sectors: latestSectors,
      market_regime: latestRegime,
      rotation_opportunities: opportunities,
      correlations,
    });
  } catch (error: any) {
    console.error('Error fetching rotation:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
