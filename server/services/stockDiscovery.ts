/**
 * AI-Powered Stock Discovery Service
 * Automatically finds buying opportunities using pre-built scans
 */

import { v4 as uuidv4 } from 'uuid';
import db from './database';
import { getQuote, getTimeSeries } from './twelveData';
import { generateAIAnalysis } from './aiAnalysis';
import sp500List from '../data/sp500.json';

export interface ScanCriteria {
  rsi?: { min?: number; max?: number };
  pe?: { min?: number; max?: number };
  peg?: { min?: number; max?: number };
  dividendYield?: { min?: number };
  payoutRatio?: { max?: number };
  revenueGrowth?: { min?: number };
  maPosition?: 'above_all' | 'golden_cross' | 'near_high';
  volume?: 'high' | 'above_average';
  priceAction?: 'oversold' | 'momentum' | 'breakout';
  earnings?: 'beat' | 'positive';
}

export interface DiscoveryScan {
  id: string;
  scan_name: string;
  scan_type: string;
  description: string;
  criteria: ScanCriteria;
  is_active: boolean;
}

export interface ScanResult {
  id: string;
  scan_id: string;
  symbol: string;
  score: number;
  rank: number;
  data: any;
  ai_analysis?: string;
  ai_risks?: string;
  ai_entry_exit?: string;
  scanned_at: string;
  expires_at: string;
}

/**
 * Initialize pre-built scans in database
 */
export function initializeScans(): void {
  const scans: Omit<DiscoveryScan, 'id'>[] = [
    {
      scan_name: 'Oversold Quality Stocks',
      scan_type: 'VALUE_MOMENTUM',
      description: 'Quality stocks that are temporarily oversold - RSI < 35, reasonable valuation',
      criteria: {
        rsi: { max: 35 },
        priceAction: 'oversold',
      },
      is_active: true,
    },
    {
      scan_name: 'Golden Cross Today',
      scan_type: 'MOMENTUM',
      description: '50-day MA just crossed above 200-day MA - classic bullish signal',
      criteria: {
        maPosition: 'golden_cross',
      },
      is_active: true,
    },
    {
      scan_name: 'Breakout Candidates',
      scan_type: 'BREAKOUT',
      description: 'Price near 52-week high with strong volume - potential breakouts',
      criteria: {
        priceAction: 'breakout',
      },
      is_active: true,
    },
    {
      scan_name: 'Undervalued Growth',
      scan_type: 'GROWTH_VALUE',
      description: 'PEG < 1, revenue growth > 15% - growth at reasonable price',
      criteria: {
        peg: { max: 1 },
        revenueGrowth: { min: 15 },
      },
      is_active: true,
    },
    {
      scan_name: 'Dividend Value',
      scan_type: 'DIVIDEND',
      description: 'Yield > 3%, payout ratio < 60%, positive momentum - sustainable dividends',
      criteria: {
        dividendYield: { min: 3 },
        payoutRatio: { max: 60 },
        rsi: { min: 40 },
      },
      is_active: true,
    },
    {
      scan_name: 'Momentum Leaders',
      scan_type: 'MOMENTUM',
      description: 'RSI 50-70, above all moving averages, strong volume - trending stocks',
      criteria: {
        rsi: { min: 50, max: 70 },
        maPosition: 'above_all',
        volume: 'above_average',
      },
      is_active: true,
    },
    {
      scan_name: 'Earnings Beats',
      scan_type: 'EARNINGS',
      description: 'Stocks that beat earnings estimates in last 30 days',
      criteria: {
        earnings: 'beat',
      },
      is_active: true,
    },
    {
      scan_name: 'Recent Insider Buying',
      scan_type: 'INSIDER',
      description: 'Stocks with recent insider purchases - management confidence',
      criteria: {},
      is_active: false, // Requires insider data API
    },
  ];

  scans.forEach(scan => {
    try {
      // Check if scan exists
      const existing = db.prepare(`
        SELECT id FROM discovery_scans WHERE scan_name = ?
      `).get(scan.scan_name) as { id: string } | undefined;

      if (existing) {
        // Update existing scan with new criteria
        db.prepare(`
          UPDATE discovery_scans
          SET scan_type = ?, description = ?, criteria = ?, is_active = ?
          WHERE scan_name = ?
        `).run(
          scan.scan_type,
          scan.description,
          JSON.stringify(scan.criteria),
          scan.is_active ? 1 : 0,
          scan.scan_name
        );
      } else {
        // Insert new scan
        const id = uuidv4();
        db.prepare(`
          INSERT INTO discovery_scans (id, scan_name, scan_type, description, criteria, is_active)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          id,
          scan.scan_name,
          scan.scan_type,
          scan.description,
          JSON.stringify(scan.criteria),
          scan.is_active ? 1 : 0
        );
      }
    } catch (error) {
      console.log(`Error initializing scan "${scan.scan_name}":`, error);
    }
  });

  console.log('✓ Discovery scans initialized');
}

/**
 * Initialize stock universe from S&P 500 list
 */
export function initializeStockUniverse(): void {
  sp500List.forEach(stock => {
    try {
      db.prepare(`
        INSERT OR REPLACE INTO stock_universe (symbol, name, sector, industry, is_sp500, is_active)
        VALUES (?, ?, ?, ?, 1, 1)
      `).run(stock.symbol, stock.name, stock.sector, stock.industry);
    } catch (error) {
      console.error(`Error adding ${stock.symbol}:`, error);
    }
  });

  console.log(`✓ Stock universe initialized with ${sp500List.length} symbols`);
}

/**
 * Get active stocks from universe
 */
export function getStockUniverse(limit: number = 50): string[] {
  const stocks = db.prepare(`
    SELECT symbol FROM stock_universe
    WHERE is_active = 1 AND is_sp500 = 1
    ORDER BY symbol
    LIMIT ?
  `).all(limit) as { symbol: string }[];

  return stocks.map(s => s.symbol);
}

/**
 * Calculate technical indicators for a stock
 */
async function calculateIndicators(symbol: string): Promise<any> {
  try {
    // Get current quote
    const quote = await getQuote(symbol);

    // Get historical data for MA calculations
    const timeSeries = await getTimeSeries(symbol, '1day', 250);

    if (!timeSeries || !timeSeries.values || timeSeries.values.length < 50) {
      return null;
    }

    const prices = timeSeries.values.map((v: any) => parseFloat(v.close));
    const volumes = timeSeries.values.map((v: any) => parseFloat(v.volume));

    // Calculate RSI (14-period)
    const rsi = calculateRSI(prices, 14);

    // Calculate Moving Averages
    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);
    const sma200 = calculateSMA(prices, 200);

    // Calculate volume average
    const avgVolume = volumes.slice(0, 20).reduce((a, b) => a + b, 0) / 20;
    const currentVolume = volumes[0];

    // Price relative to 52-week high
    const high52Week = Math.max(...prices.slice(0, 252));
    const currentPrice = prices[0];
    const percentFromHigh = ((currentPrice - high52Week) / high52Week) * 100;

    // Golden Cross detection
    const prevSMA50 = calculateSMA(prices.slice(1), 50);
    const prevSMA200 = calculateSMA(prices.slice(1), 200);
    const goldenCross = sma50 > sma200 && prevSMA50 <= prevSMA200;

    return {
      symbol,
      price: currentPrice,
      rsi,
      sma20,
      sma50,
      sma200,
      volume: currentVolume,
      avgVolume,
      high52Week,
      percentFromHigh,
      goldenCross,
      aboveAllMAs: currentPrice > sma20 && currentPrice > sma50 && currentPrice > sma200,
      pe: quote.pe_ratio || null,
      dividendYield: quote.dividend_yield || null,
      marketCap: quote.market_cap || null,
    };
  } catch (error) {
    console.error(`Error calculating indicators for ${symbol}:`, error);
    return null;
  }
}

/**
 * Calculate Simple Moving Average
 */
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[0];
  const slice = prices.slice(0, period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/**
 * Calculate RSI
 */
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 0; i < period; i++) {
    const change = prices[i] - prices[i + 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Check if stock matches scan criteria
 */
function matchesCriteria(data: any, criteria: ScanCriteria): { matches: boolean; score: number } {
  let score = 0;
  let maxScore = 0;

  // RSI check
  if (criteria.rsi) {
    maxScore += 20;
    if (data.rsi !== null) {
      if ((criteria.rsi.min === undefined || data.rsi >= criteria.rsi.min) &&
          (criteria.rsi.max === undefined || data.rsi <= criteria.rsi.max)) {
        score += 20;
      }
    }
  }

  // P/E check
  if (criteria.pe) {
    maxScore += 15;
    if (data.pe !== null) {
      if ((criteria.pe.min === undefined || data.pe >= criteria.pe.min) &&
          (criteria.pe.max === undefined || data.pe <= criteria.pe.max)) {
        score += 15;
      }
    }
  }

  // Dividend yield
  if (criteria.dividendYield) {
    maxScore += 15;
    if (data.dividendYield && data.dividendYield >= criteria.dividendYield.min) {
      score += 15;
    }
  }

  // MA position
  if (criteria.maPosition) {
    maxScore += 25;
    if (criteria.maPosition === 'golden_cross' && data.goldenCross) {
      score += 25;
    } else if (criteria.maPosition === 'above_all' && data.aboveAllMAs) {
      score += 25;
    } else if (criteria.maPosition === 'near_high' && data.percentFromHigh > -5) {
      score += 25;
    }
  }

  // Volume
  if (criteria.volume) {
    maxScore += 15;
    if (criteria.volume === 'high' && data.volume > data.avgVolume * 1.5) {
      score += 15;
    } else if (criteria.volume === 'above_average' && data.volume > data.avgVolume) {
      score += 15;
    }
  }

  // Price action
  if (criteria.priceAction) {
    maxScore += 20;
    if (criteria.priceAction === 'oversold' && data.rsi < 35) {
      score += 20;
    } else if (criteria.priceAction === 'momentum' && data.rsi >= 50 && data.rsi <= 70) {
      score += 20;
    } else if (criteria.priceAction === 'breakout' && data.percentFromHigh > -3) {
      score += 20;
    }
  }

  const normalizedScore = maxScore > 0 ? (score / maxScore) * 100 : 0;
  return {
    matches: normalizedScore >= 50, // 50% threshold (lowered to find more opportunities)
    score: normalizedScore,
  };
}

/**
 * Run a discovery scan
 */
export async function runScan(scanId: string, useAI: boolean = false): Promise<ScanResult[]> {
  const startTime = Date.now();

  // Get scan configuration
  const scan = db.prepare('SELECT * FROM discovery_scans WHERE id = ?').get(scanId) as any;
  if (!scan) {
    throw new Error('Scan not found');
  }

  const criteria: ScanCriteria = JSON.parse(scan.criteria);

  // Get stock universe (limit to 50 for now to avoid rate limits)
  const symbols = getStockUniverse(50);

  const results: ScanResult[] = [];
  let stocksScanned = 0;
  let errorCount = 0;

  console.log(`\n========================================`);
  console.log(`Running scan: ${scan.scan_name}`);
  console.log(`Scanning ${symbols.length} stocks`);
  console.log(`Criteria:`, JSON.stringify(criteria, null, 2));
  console.log(`========================================\n`);

  for (const symbol of symbols) {
    try {
      const data = await calculateIndicators(symbol);
      if (!data) {
        console.log(`⚠ ${symbol}: No data returned`);
        continue;
      }

      stocksScanned++;

      const { matches, score } = matchesCriteria(data, criteria);

      if (matches) {
        const resultId = uuidv4();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour cache

        const result: ScanResult = {
          id: resultId,
          scan_id: scanId,
          symbol,
          score,
          rank: 0, // Will be set after sorting
          data: JSON.stringify(data),
          scanned_at: new Date().toISOString(),
          expires_at: expiresAt,
        };

        // Add AI analysis if requested
        if (useAI && results.length < 5) { // Only analyze top 5 to save costs
          try {
            const aiAnalysis = await generateOpportunityAnalysis(symbol, data, scan.scan_name);
            result.ai_analysis = aiAnalysis.summary;
            result.ai_risks = aiAnalysis.risks;
            result.ai_entry_exit = aiAnalysis.entryExit;
          } catch (error) {
            console.error(`AI analysis failed for ${symbol}:`, error);
          }
        }

        results.push(result);
        console.log(`✓ ${symbol}: Score ${score.toFixed(1)} - MATCH (Price: $${data.price?.toFixed(2)}, RSI: ${data.rsi?.toFixed(1)})`);
      } else {
        console.log(`  ${symbol}: Score ${score.toFixed(1)} (Price: $${data.price?.toFixed(2)}, RSI: ${data.rsi?.toFixed(1)})`);
      }

      // Rate limiting - small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      errorCount++;
      console.error(`✗ ${symbol}: ${error.message}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`Scan Complete: ${scan.scan_name}`);
  console.log(`Successfully scanned: ${stocksScanned}/${symbols.length}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Opportunities found: ${results.length}`);
  console.log(`========================================\n`);

  // Sort by score and assign ranks
  results.sort((a, b) => b.score - a.score);
  results.forEach((r, i) => r.rank = i + 1);

  // Store results in database
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO scan_results
    (id, scan_id, symbol, score, rank, data, ai_analysis, ai_risks, ai_entry_exit, scanned_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  results.forEach(r => {
    stmt.run(
      r.id, r.scan_id, r.symbol, r.score, r.rank,
      r.data, r.ai_analysis || null, r.ai_risks || null, r.ai_entry_exit || null,
      r.scanned_at, r.expires_at
    );
  });

  // Log execution
  const executionTime = Date.now() - startTime;
  db.prepare(`
    INSERT INTO scan_executions (id, scan_id, executed_at, stocks_scanned, opportunities_found, execution_time_ms, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    scanId,
    new Date().toISOString(),
    stocksScanned,
    results.length,
    executionTime,
    'SUCCESS'
  );

  console.log(`✓ Scan complete: ${results.length} opportunities found in ${executionTime}ms`);

  return results;
}

/**
 * Generate AI analysis for an opportunity
 */
async function generateOpportunityAnalysis(symbol: string, data: any, scanName: string): Promise<{
  summary: string;
  risks: string;
  entryExit: string;
}> {
  const prompt = `Analyze this stock opportunity found by the "${scanName}" scan:

Symbol: ${symbol}
Current Price: $${data.price?.toFixed(2)}
RSI: ${data.rsi?.toFixed(1)}
P/E Ratio: ${data.pe?.toFixed(1) || 'N/A'}
Position: ${data.aboveAllMAs ? 'Above all MAs' : 'Below some MAs'}
52-Week High: $${data.high52Week?.toFixed(2)}
Distance from High: ${data.percentFromHigh?.toFixed(1)}%
Volume vs Average: ${((data.volume / data.avgVolume) * 100).toFixed(0)}%

Provide:
1. A brief 2-3 sentence summary of why this is interesting
2. Top 2-3 risks to watch
3. Suggested entry/exit strategy

Keep it concise and actionable.`;

  const aiResponse = await generateAIAnalysis(prompt);

  // Parse the AI response (assuming it's structured)
  const lines = aiResponse.split('\n').filter(l => l.trim());

  return {
    summary: lines.slice(0, 3).join(' '),
    risks: lines.filter(l => l.toLowerCase().includes('risk')).join('; '),
    entryExit: lines.filter(l => l.toLowerCase().includes('entry') || l.toLowerCase().includes('exit')).join('; '),
  };
}

/**
 * Get cached scan results
 */
export function getScanResults(scanId: string, limit: number = 20): ScanResult[] {
  const now = new Date().toISOString();

  const results = db.prepare(`
    SELECT * FROM scan_results
    WHERE scan_id = ? AND expires_at > ?
    ORDER BY rank ASC
    LIMIT ?
  `).all(scanId, now, limit) as any[];

  return results.map(r => ({
    ...r,
    data: JSON.parse(r.data),
  }));
}

/**
 * Get all active scans
 */
export function getActiveScans(): DiscoveryScan[] {
  const scans = db.prepare(`
    SELECT * FROM discovery_scans
    WHERE is_active = 1
    ORDER BY scan_name
  `).all() as any[];

  return scans.map(s => ({
    ...s,
    criteria: JSON.parse(s.criteria),
    is_active: s.is_active === 1,
  }));
}

/**
 * Delete expired scan results
 */
export function cleanupExpiredResults(): number {
  const now = new Date().toISOString();
  const result = db.prepare('DELETE FROM scan_results WHERE expires_at <= ?').run(now);
  return result.changes;
}
