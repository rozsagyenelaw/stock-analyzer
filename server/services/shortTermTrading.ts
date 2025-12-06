/**
 * Short-Term Trading Scanner
 * Finds affordable day trade and swing trade opportunities ($5-$50 stocks)
 */

import { getQuote, getTimeSeries } from './twelveData';
import db from './database';

interface TradeIdea {
  id: string;
  symbol: string;
  companyName: string;
  price: number;
  strategy: string;
  tradeType: 'day_trade' | 'swing_trade';
  timeframe: string;
  entry: number;
  target: number;
  stopLoss: number;
  potentialGain: number;
  potentialLoss: number;
  riskReward: number;
  volume: number;
  avgVolume: number;
  relativeVolume: number;
  rsi: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
  setup: string;
  reasoning: string;
  score: number;
  timestamp: string;
}

interface ScanFilters {
  minPrice?: number;
  maxPrice?: number;
  minVolume?: number;
  accountSize?: number;
  symbols?: string[]; // Override symbol list
}

/**
 * Calculate RSI (Relative Strength Index)
 */
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;

  const multiplier = 2 / (period + 1);
  let ema = prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;

  for (let i = prices.length - period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;

  // For signal, we'd need historical MACD values, so simplified here
  const macdValues = [macd]; // In production, calculate for last 9 periods
  const signal = macd; // Simplified - should be EMA of MACD

  return {
    macd,
    signal,
    histogram: macd - signal,
  };
}

/**
 * Calculate SMA (Simple Moving Average)
 */
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((sum, price) => sum + price, 0) / period;
}

/**
 * Find support and resistance levels
 */
function findSupportResistance(prices: number[]): { support: number; resistance: number } {
  const recentPrices = prices.slice(-20);
  const currentPrice = prices[prices.length - 1];

  // Find local minima (support) and maxima (resistance)
  let support = Math.min(...recentPrices);
  let resistance = Math.max(...recentPrices);

  return { support, resistance };
}

/**
 * Get list of stocks to scan (popular stocks across various price ranges)
 */
function getAffordableStocks(filters: ScanFilters): string[] {
  // If symbols are provided in filters, use them directly
  if (filters.symbols && filters.symbols.length > 0) {
    return filters.symbols;
  }

  // Popular stocks in different price ranges for screening
  // This includes stocks from $5-$300+ to give flexibility
  const stockUniverse = [
    // Tech stocks (various prices)
    'AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'AMD', 'INTC', 'PLTR', 'SOFI', 'NIO',

    // Affordable tech & growth
    'F', 'BAC', 'SNAP', 'PINS', 'RBLX', 'UBER', 'LYFT', 'OPEN', 'HOOD', 'SQ',

    // Energy
    'XOM', 'CVX', 'BP', 'COP', 'OXY', 'SLB', 'HAL', 'MRO', 'DVN', 'FANG',

    // Finance
    'JPM', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC', 'TFC', 'ALLY', 'SOFI',

    // Healthcare
    'JNJ', 'PFE', 'ABBV', 'MRK', 'UNH', 'CVS', 'WBA', 'GILD', 'BIIB', 'VRTX',

    // Consumer
    'WMT', 'TGT', 'HD', 'LOW', 'COST', 'KO', 'PEP', 'MCD', 'SBUX', 'DIS',

    // EVs & Auto
    'TSLA', 'RIVN', 'LCID', 'GM', 'FORD', 'NKLA', 'FSR', 'RIDE', 'WKHS', 'GOEV',

    // Meme/Popular
    'AMC', 'GME', 'BB', 'NOK', 'WISH', 'CLOV', 'SPCE', 'TLRY', 'SNDL', 'PTON',

    // Airlines & Travel
    'DAL', 'AAL', 'UAL', 'LUV', 'SAVE', 'JBLU', 'ALK', 'CCL', 'NCLH', 'RCL',

    // Retail
    'AMZN', 'EBAY', 'ETSY', 'W', 'CHWY', 'BBBY', 'M', 'JWN', 'KSS', 'DKS',

    // Semiconductors
    'TSM', 'ASML', 'QCOM', 'AVGO', 'TXN', 'ADI', 'MRVL', 'MU', 'AMAT', 'LRCX',

    // Software/Cloud
    'CRM', 'ORCL', 'ADBE', 'NOW', 'SNOW', 'DDOG', 'NET', 'CRWD', 'ZS', 'OKTA',

    // Chinese ADRs
    'BABA', 'JD', 'PDD', 'BIDU', 'NIO', 'XPEV', 'LI', 'DIDI', 'TME', 'BILI',

    // Biotech
    'MRNA', 'BNTX', 'REGN', 'AMGN', 'GILD', 'VRTX', 'SGEN', 'EXAS', 'BMRN', 'ALNY',

    // REITs
    'SPG', 'O', 'PLD', 'AMT', 'CCI', 'EQIX', 'PSA', 'DLR', 'WELL', 'AVB',
  ];

  // Use database stocks if available, otherwise use universe
  try {
    const dbStocks = db
      .prepare(
        `
      SELECT symbol FROM stock_universe
      WHERE is_active = 1
      ORDER BY market_cap DESC
      LIMIT 50
    `
      )
      .all() as { symbol: string }[];

    const dbSymbols = dbStocks.map(s => s.symbol);

    // Combine database stocks with universe, remove duplicates
    const combined = [...new Set([...dbSymbols, ...stockUniverse])];

    return combined;
  } catch (error) {
    // If database fails, use stock universe
    return stockUniverse;
  }
}

/**
 * Scan 1: Cheap Momentum Breakouts
 */
export async function scanMomentumBreakouts(filters: ScanFilters = {}): Promise<TradeIdea[]> {
  const ideas: TradeIdea[] = [];
  const symbols = getAffordableStocks(filters);

  console.log(`Scanning ${symbols.length} stocks for momentum breakouts...`);

  for (const symbol of symbols) {
    try {
      const quote = await getQuote(symbol);
      const price = parseFloat(quote.close);

      // Filter by price range
      if (price < (filters.minPrice || 5) || price > (filters.maxPrice || 50)) {
        continue;
      }

      // Get historical data
      const timeSeriesData = await getTimeSeries(symbol, '1day', 50);
      const timeSeries = timeSeriesData.values || [];

      if (timeSeries.length < 20) continue;

      const closes = timeSeries.map((d: any) => parseFloat(d.close));
      const volumes = timeSeries.map((d: any) => parseFloat(d.volume));

      const currentVolume = volumes[volumes.length - 1];
      const avgVolume = volumes.slice(-20).reduce((sum, v) => sum + v, 0) / 20;
      const relativeVolume = currentVolume / avgVolume;

      // Check volume requirement
      if (avgVolume < (filters.minVolume || 500000)) continue;

      const rsi = calculateRSI(closes, 14);
      const { support, resistance } = findSupportResistance(closes);

      // Breakout criteria:
      // 1. Price breaking above recent resistance
      // 2. Volume 2x average
      // 3. RSI between 50-70 (not overbought)
      const isBreakout = price > resistance * 0.98; // Within 2% of resistance
      const hasVolume = relativeVolume >= 1.5; // At least 1.5x volume
      const rsiOk = rsi >= 50 && rsi <= 70;

      if (isBreakout && hasVolume && rsiOk) {
        const entry = price;
        const target = price * 1.03; // 3% target
        const stopLoss = resistance * 0.98; // 2% below resistance

        const idea: TradeIdea = {
          id: `momentum_${symbol}_${Date.now()}`,
          symbol,
          companyName: quote.name || symbol,
          price,
          strategy: 'Cheap Momentum Breakout',
          tradeType: 'day_trade',
          timeframe: 'Minutes to hours',
          entry,
          target,
          stopLoss,
          potentialGain: ((target - entry) / entry) * 100,
          potentialLoss: ((entry - stopLoss) / entry) * 100,
          riskReward: (target - entry) / (entry - stopLoss),
          volume: currentVolume,
          avgVolume,
          relativeVolume,
          rsi,
          setup: `Breaking above $${resistance.toFixed(2)} resistance with ${relativeVolume.toFixed(1)}x volume`,
          reasoning: `Strong breakout setup with high volume confirmation. RSI at ${rsi.toFixed(0)} shows room to run. Volume spike indicates institutional interest.`,
          score: calculateScore({ rsi, relativeVolume, riskReward: (target - entry) / (entry - stopLoss) }),
          timestamp: new Date().toISOString(),
        };

        ideas.push(idea);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      console.error(`Error scanning ${symbol}:`, error.message);
    }
  }

  return ideas.sort((a, b) => b.score - a.score).slice(0, 10);
}

/**
 * Scan 2: Affordable Oversold Bounce
 */
export async function scanOversoldBounce(filters: ScanFilters = {}): Promise<TradeIdea[]> {
  const ideas: TradeIdea[] = [];
  const symbols = getAffordableStocks(filters);

  console.log(`Scanning ${symbols.length} stocks for oversold bounces...`);

  for (const symbol of symbols) {
    try {
      const quote = await getQuote(symbol);
      const price = parseFloat(quote.close);

      if (price < (filters.minPrice || 5) || price > (filters.maxPrice || 50)) continue;

      const timeSeriesData = await getTimeSeries(symbol, '1day', 30);
      const timeSeries = timeSeriesData.values || [];
      if (timeSeries.length < 20) continue;

      const closes = timeSeries.map((d: any) => parseFloat(d.close));
      const volumes = timeSeries.map((d: any) => parseFloat(d.volume));

      const avgVolume = volumes.slice(-20).reduce((sum, v) => sum + v, 0) / 20;
      if (avgVolume < (filters.minVolume || 500000)) continue;

      const rsi = calculateRSI(closes, 14);
      const { support } = findSupportResistance(closes);

      // Oversold bounce criteria:
      // 1. RSI < 30 (oversold)
      // 2. Price near support
      // 3. Not in long-term downtrend
      const sma50 = calculateSMA(closes, 20);
      const isOversold = rsi < 30;
      const atSupport = price <= support * 1.02; // Within 2% of support
      const notDowntrending = price > sma50 * 0.85; // Not more than 15% below SMA

      if (isOversold && atSupport && notDowntrending) {
        const entry = price;
        const target = price * 1.05; // 5% bounce target
        const stopLoss = support * 0.97; // 3% below support

        const idea: TradeIdea = {
          id: `oversold_${symbol}_${Date.now()}`,
          symbol,
          companyName: quote.name || symbol,
          price,
          strategy: 'Affordable Oversold Bounce',
          tradeType: 'swing_trade',
          timeframe: '1-3 days',
          entry,
          target,
          stopLoss,
          potentialGain: ((target - entry) / entry) * 100,
          potentialLoss: ((entry - stopLoss) / entry) * 100,
          riskReward: (target - entry) / (entry - stopLoss),
          volume: volumes[volumes.length - 1],
          avgVolume,
          relativeVolume: volumes[volumes.length - 1] / avgVolume,
          rsi,
          setup: `Oversold at $${support.toFixed(2)} support with RSI ${rsi.toFixed(0)}`,
          reasoning: `Deeply oversold condition at key support level. High probability of mean reversion bounce. Risk is well-defined below support.`,
          score: calculateScore({ rsi: 100 - rsi, relativeVolume: 1, riskReward: (target - entry) / (entry - stopLoss) }),
          timestamp: new Date().toISOString(),
        };

        ideas.push(idea);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      console.error(`Error scanning ${symbol}:`, error.message);
    }
  }

  return ideas.sort((a, b) => b.score - a.score).slice(0, 10);
}

/**
 * Scan 3: Cheap MACD Crossover (Swing Trades)
 */
export async function scanMACDCrossover(filters: ScanFilters = {}): Promise<TradeIdea[]> {
  const ideas: TradeIdea[] = [];
  const symbols = getAffordableStocks(filters);

  console.log(`Scanning ${symbols.length} stocks for MACD crossovers...`);

  for (const symbol of symbols) {
    try {
      const quote = await getQuote(symbol);
      const price = parseFloat(quote.close);

      if (price < (filters.minPrice || 5) || price > (filters.maxPrice || 50)) continue;

      const timeSeriesData = await getTimeSeries(symbol, '1day', 50);
      const timeSeries = timeSeriesData.values || [];
      if (timeSeries.length < 30) continue;

      const closes = timeSeries.map((d: any) => parseFloat(d.close));
      const volumes = timeSeries.map((d: any) => parseFloat(d.volume));

      const avgVolume = volumes.slice(-20).reduce((sum, v) => sum + v, 0) / 20;
      if (avgVolume < (filters.minVolume || 500000)) continue;

      const macd = calculateMACD(closes);
      const ema20 = calculateEMA(closes, 20);
      const rsi = calculateRSI(closes, 14);

      // MACD crossover criteria:
      // 1. MACD histogram turning positive
      // 2. Price above 20 EMA
      // 3. RSI > 40 (not too weak)
      const bullishCrossover = macd.histogram > 0 && macd.histogram < 0.5; // Recent crossover
      const aboveEMA = price > ema20;
      const rsiOk = rsi > 40 && rsi < 70;

      if (bullishCrossover && aboveEMA && rsiOk) {
        const entry = price;
        const target = price * 1.07; // 7% target for swing trade
        const stopLoss = ema20 * 0.98; // Below 20 EMA

        const idea: TradeIdea = {
          id: `macd_${symbol}_${Date.now()}`,
          symbol,
          companyName: quote.name || symbol,
          price,
          strategy: 'Cheap MACD Crossover',
          tradeType: 'swing_trade',
          timeframe: '3-7 days',
          entry,
          target,
          stopLoss,
          potentialGain: ((target - entry) / entry) * 100,
          potentialLoss: ((entry - stopLoss) / entry) * 100,
          riskReward: (target - entry) / (entry - stopLoss),
          volume: volumes[volumes.length - 1],
          avgVolume,
          relativeVolume: volumes[volumes.length - 1] / avgVolume,
          rsi,
          macd,
          setup: `MACD bullish crossover, price above $${ema20.toFixed(2)} EMA`,
          reasoning: `Fresh MACD bullish crossover signals momentum shift. Price holding above key moving average. Good setup for multi-day swing.`,
          score: calculateScore({ rsi, relativeVolume: 1, riskReward: (target - entry) / (entry - stopLoss) }),
          timestamp: new Date().toISOString(),
        };

        ideas.push(idea);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      console.error(`Error scanning ${symbol}:`, error.message);
    }
  }

  return ideas.sort((a, b) => b.score - a.score).slice(0, 10);
}

/**
 * Scan 4: Budget Pullback Play
 */
export async function scanPullbackPlay(filters: ScanFilters = {}): Promise<TradeIdea[]> {
  const ideas: TradeIdea[] = [];
  const symbols = getAffordableStocks(filters);

  console.log(`Scanning ${symbols.length} stocks for pullback plays...`);

  for (const symbol of symbols) {
    try {
      const quote = await getQuote(symbol);
      const price = parseFloat(quote.close);

      if (price < (filters.minPrice || 5) || price > (filters.maxPrice || 50)) continue;

      const timeSeriesData = await getTimeSeries(symbol, '1day', 50);
      const timeSeries = timeSeriesData.values || [];
      if (timeSeries.length < 30) continue;

      const closes = timeSeries.map((d: any) => parseFloat(d.close));
      const volumes = timeSeries.map((d: any) => parseFloat(d.volume));

      const avgVolume = volumes.slice(-20).reduce((sum, v) => sum + v, 0) / 20;
      if (avgVolume < (filters.minVolume || 500000)) continue;

      const ema20 = calculateEMA(closes, 20);
      const ema50 = calculateEMA(closes, 50);
      const rsi = calculateRSI(closes, 14);

      // Pullback criteria:
      // 1. Strong uptrend (20 EMA > 50 EMA)
      // 2. Price pulled back to 20 EMA
      // 3. RSI 35-50 (healthy pullback, not breakdown)
      const inUptrend = ema20 > ema50 * 1.02;
      const atEMA = price >= ema20 * 0.98 && price <= ema20 * 1.02;
      const healthyPullback = rsi >= 35 && rsi <= 55;

      if (inUptrend && atEMA && healthyPullback) {
        const entry = price;
        const target = price * 1.08; // 8% target
        const stopLoss = ema20 * 0.96; // 4% below EMA

        const idea: TradeIdea = {
          id: `pullback_${symbol}_${Date.now()}`,
          symbol,
          companyName: quote.name || symbol,
          price,
          strategy: 'Budget Pullback Play',
          tradeType: 'swing_trade',
          timeframe: '1-2 weeks',
          entry,
          target,
          stopLoss,
          potentialGain: ((target - entry) / entry) * 100,
          potentialLoss: ((entry - stopLoss) / entry) * 100,
          riskReward: (target - entry) / (entry - stopLoss),
          volume: volumes[volumes.length - 1],
          avgVolume,
          relativeVolume: volumes[volumes.length - 1] / avgVolume,
          rsi,
          setup: `Uptrend pullback to $${ema20.toFixed(2)} support (20 EMA)`,
          reasoning: `Healthy pullback in established uptrend. Buying the dip at moving average support. Trend likely to resume after consolidation.`,
          score: calculateScore({ rsi, relativeVolume: 1, riskReward: (target - entry) / (entry - stopLoss) }),
          timestamp: new Date().toISOString(),
        };

        ideas.push(idea);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      console.error(`Error scanning ${symbol}:`, error.message);
    }
  }

  return ideas.sort((a, b) => b.score - a.score).slice(0, 10);
}

/**
 * Calculate trade idea score (0-100)
 */
function calculateScore(params: { rsi?: number; relativeVolume?: number; riskReward?: number }): number {
  let score = 50; // Base score

  // RSI contribution (20 points)
  if (params.rsi !== undefined) {
    if (params.rsi >= 50 && params.rsi <= 65) {
      score += 20; // Ideal RSI
    } else if (params.rsi >= 40 && params.rsi < 50) {
      score += 15;
    } else if (params.rsi > 65 && params.rsi <= 75) {
      score += 10;
    }
  }

  // Volume contribution (20 points)
  if (params.relativeVolume !== undefined) {
    if (params.relativeVolume >= 2) {
      score += 20;
    } else if (params.relativeVolume >= 1.5) {
      score += 15;
    } else if (params.relativeVolume >= 1) {
      score += 10;
    }
  }

  // Risk/Reward contribution (30 points)
  if (params.riskReward !== undefined) {
    if (params.riskReward >= 3) {
      score += 30;
    } else if (params.riskReward >= 2) {
      score += 20;
    } else if (params.riskReward >= 1.5) {
      score += 10;
    }
  }

  return Math.min(Math.round(score), 100);
}

export type { TradeIdea, ScanFilters };
