import { v4 as uuidv4 } from 'uuid';
import db from './database';

// Standard US sectors
export const SECTORS = [
  'Technology',
  'Healthcare',
  'Financials',
  'Consumer Discretionary',
  'Communication Services',
  'Industrials',
  'Consumer Staples',
  'Energy',
  'Utilities',
  'Real Estate',
  'Materials',
];

/**
 * Get mock economic events (in production, integrate with economic calendar API)
 */
export function getMockEconomicEvents(days: number = 30): any[] {
  const events = [];
  const now = new Date();

  const eventTemplates = [
    { name: 'Federal Reserve Interest Rate Decision', type: 'FED_MEETING', impact: 'HIGH' },
    { name: 'Non-Farm Payrolls', type: 'UNEMPLOYMENT', impact: 'HIGH' },
    { name: 'Consumer Price Index (CPI)', type: 'INFLATION', impact: 'HIGH' },
    { name: 'Gross Domestic Product (GDP)', type: 'GDP', impact: 'HIGH' },
    { name: 'Retail Sales', type: 'RETAIL_SALES', impact: 'MEDIUM' },
    { name: 'Initial Jobless Claims', type: 'JOBLESS_CLAIMS', impact: 'MEDIUM' },
    { name: 'Producer Price Index (PPI)', type: 'PPI', impact: 'MEDIUM' },
    { name: 'Manufacturing PMI', type: 'PMI', impact: 'MEDIUM' },
    { name: 'Housing Starts', type: 'HOUSING', impact: 'LOW' },
  ];

  for (let i = 0; i < days; i++) {
    const eventDate = new Date(now);
    eventDate.setDate(eventDate.getDate() + i - Math.floor(days / 2));

    // Add 1-2 events per week
    if (Math.random() > 0.7) {
      const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];

      events.push({
        id: uuidv4(),
        event_name: template.name,
        event_type: template.type,
        country: 'US',
        impact: template.impact,
        event_date: eventDate.toISOString().split('T')[0],
        event_time: '08:30',
        description: `${template.name} data release`,
        source: 'Economic Calendar',
      });
    }
  }

  return events.sort((a, b) => a.event_date.localeCompare(b.event_date));
}

/**
 * Store economic event
 */
export function storeEconomicEvent(event: any): string {
  const id = event.id || uuidv4();

  db.prepare(`
    INSERT OR REPLACE INTO economic_events (
      id, event_name, event_type, country, impact, actual_value,
      forecast_value, previous_value, event_date, event_time,
      description, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    event.event_name,
    event.event_type,
    event.country || 'US',
    event.impact,
    event.actual_value || null,
    event.forecast_value || null,
    event.previous_value || null,
    event.event_date,
    event.event_time || null,
    event.description || null,
    event.source || null
  );

  return id;
}

/**
 * Get economic events
 */
export function getEconomicEvents(startDate?: string, endDate?: string, impact?: string): any[] {
  let query = 'SELECT * FROM economic_events WHERE 1=1';
  const params: any[] = [];

  if (startDate) {
    query += ' AND event_date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND event_date <= ?';
    params.push(endDate);
  }

  if (impact) {
    query += ' AND impact = ?';
    params.push(impact);
  }

  query += ' ORDER BY event_date ASC, event_time ASC';

  return db.prepare(query).all(...params);
}

/**
 * Generate mock sector performance data
 */
export function generateMockSectorPerformance(date: string = new Date().toISOString().split('T')[0]): any[] {
  const sectors = [];

  for (const sector of SECTORS) {
    const change = (Math.random() - 0.5) * 10; // -5% to +5%
    const momentum = 50 + (Math.random() - 0.5) * 100; // 0-100

    let rotation_signal: 'ROTATE_IN' | 'ROTATE_OUT' | 'HOLD' = 'HOLD';
    if (momentum > 70) rotation_signal = 'ROTATE_IN';
    else if (momentum < 30) rotation_signal = 'ROTATE_OUT';

    sectors.push({
      id: uuidv4(),
      sector,
      date,
      timeframe: 'daily',
      price_change: change,
      price_change_percent: change,
      momentum_score: momentum,
      rotation_signal,
      volume: Math.random() * 1000000000,
      market_cap: Math.random() * 5000000000000,
    });
  }

  return sectors;
}

/**
 * Store sector performance
 */
export function storeSectorPerformance(data: any): string {
  const id = data.id || uuidv4();

  db.prepare(`
    INSERT OR REPLACE INTO sector_performance (
      id, sector, date, timeframe, price_change, price_change_percent,
      volume, market_cap, pe_ratio, dividend_yield, momentum_score,
      rotation_signal, top_performers, bottom_performers
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.sector,
    data.date,
    data.timeframe || 'daily',
    data.price_change,
    data.price_change_percent,
    data.volume || null,
    data.market_cap || null,
    data.pe_ratio || null,
    data.dividend_yield || null,
    data.momentum_score || null,
    data.rotation_signal || null,
    data.top_performers ? JSON.stringify(data.top_performers) : null,
    data.bottom_performers ? JSON.stringify(data.bottom_performers) : null
  );

  return id;
}

/**
 * Get sector performance
 */
export function getSectorPerformance(timeframe: string = 'daily', limit: number = 100): any[] {
  const data = db.prepare(`
    SELECT * FROM sector_performance
    WHERE timeframe = ?
    ORDER BY date DESC, momentum_score DESC
    LIMIT ?
  `).all(timeframe, limit);

  return data.map((row: any) => ({
    ...row,
    top_performers: row.top_performers ? JSON.parse(row.top_performers) : [],
    bottom_performers: row.bottom_performers ? JSON.parse(row.bottom_performers) : [],
  }));
}

/**
 * Calculate sector correlations
 */
export function calculateSectorCorrelations(periodDays: number = 90): any[] {
  const correlations: any[] = [];
  const date = new Date().toISOString().split('T')[0];

  // Generate mock correlations for now
  for (let i = 0; i < SECTORS.length; i++) {
    for (let j = i + 1; j < SECTORS.length; j++) {
      const correlation = (Math.random() - 0.5) * 2; // -1 to 1

      correlations.push({
        id: uuidv4(),
        sector_a: SECTORS[i],
        sector_b: SECTORS[j],
        correlation,
        period_days: periodDays,
        date,
      });
    }
  }

  return correlations;
}

/**
 * Detect market regime
 */
export function detectMarketRegime(): any {
  const date = new Date().toISOString().split('T')[0];

  // Simple regime detection (in production, use VIX, breadth indicators, etc.)
  const volatilityIndex = 15 + Math.random() * 20; // VIX-like
  const trendStrength = Math.random() * 100;
  const marketBreadth = Math.random() * 100;

  let regime: 'BULL' | 'BEAR' | 'SIDEWAYS' | 'VOLATILE' = 'SIDEWAYS';
  if (volatilityIndex > 25) {
    regime = 'VOLATILE';
  } else if (trendStrength > 70 && marketBreadth > 60) {
    regime = 'BULL';
  } else if (trendStrength < 30 && marketBreadth < 40) {
    regime = 'BEAR';
  }

  const riskOnScore = ((100 - volatilityIndex) + trendStrength + marketBreadth) / 3;

  const sectorPerformance = generateMockSectorPerformance(date);
  const sortedByMomentum = sectorPerformance.sort((a, b) => (b.momentum_score || 0) - (a.momentum_score || 0));

  return {
    id: uuidv4(),
    date,
    regime,
    volatility_index: volatilityIndex,
    trend_strength: trendStrength,
    market_breadth: marketBreadth,
    leading_sectors: sortedByMomentum.slice(0, 3).map(s => s.sector),
    lagging_sectors: sortedByMomentum.slice(-3).map(s => s.sector),
    risk_on_score: riskOnScore,
    description: `Market is in ${regime} mode with ${volatilityIndex.toFixed(1)}% volatility`,
  };
}

/**
 * Store market regime
 */
export function storeMarketRegime(data: any): string {
  const id = data.id || uuidv4();

  db.prepare(`
    INSERT OR REPLACE INTO market_regime (
      id, date, regime, volatility_index, trend_strength, market_breadth,
      leading_sectors, lagging_sectors, risk_on_score, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.date,
    data.regime,
    data.volatility_index || null,
    data.trend_strength || null,
    data.market_breadth || null,
    data.leading_sectors ? JSON.stringify(data.leading_sectors) : null,
    data.lagging_sectors ? JSON.stringify(data.lagging_sectors) : null,
    data.risk_on_score || null,
    data.description || null
  );

  return id;
}

/**
 * Get market regime
 */
export function getMarketRegime(limit: number = 30): any[] {
  const data = db.prepare(`
    SELECT * FROM market_regime
    ORDER BY date DESC
    LIMIT ?
  `).all(limit);

  return data.map((row: any) => ({
    ...row,
    leading_sectors: row.leading_sectors ? JSON.parse(row.leading_sectors) : [],
    lagging_sectors: row.lagging_sectors ? JSON.parse(row.lagging_sectors) : [],
  }));
}
