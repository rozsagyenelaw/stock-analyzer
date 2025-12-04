/**
 * Pattern Recognition Engine
 *
 * Detects technical chart patterns and candlestick patterns
 * Uses local algorithms - no API keys required
 */

import type { TimeSeriesData } from '../../types';

export interface DetectedPattern {
  name: string;
  type: 'chart' | 'candlestick';
  category: 'bullish' | 'bearish' | 'neutral' | 'reversal' | 'continuation';
  confidence: number; // 0-100
  description: string;
  significance: 'low' | 'medium' | 'high';
  detectedAt: string; // ISO date
  priceLevel: number;
  targetPrice?: number;
  stopLoss?: number;
}

export interface SupportResistanceLevel {
  price: number;
  strength: number; // 0-100
  type: 'support' | 'resistance';
  touches: number;
  lastTouch: string;
}

// ============================================================================
// CANDLESTICK PATTERNS
// ============================================================================

/**
 * Detect Doji candlestick (indecision)
 */
function detectDoji(candles: TimeSeriesData[]): DetectedPattern | null {
  const latest = candles[0];
  const open = parseFloat(latest.open);
  const close = parseFloat(latest.close);
  const high = parseFloat(latest.high);
  const low = parseFloat(latest.low);

  const bodySize = Math.abs(close - open);
  const totalRange = high - low;

  // Doji: very small body relative to range
  if (bodySize / totalRange < 0.1 && totalRange > 0) {
    return {
      name: 'Doji',
      type: 'candlestick',
      category: 'neutral',
      confidence: 75,
      description: 'Indecision in the market. Could signal reversal if at trend extremes.',
      significance: 'medium',
      detectedAt: latest.datetime,
      priceLevel: close,
    };
  }

  return null;
}

/**
 * Detect Hammer (bullish reversal)
 */
function detectHammer(candles: TimeSeriesData[]): DetectedPattern | null {
  const latest = candles[0];
  const open = parseFloat(latest.open);
  const close = parseFloat(latest.close);
  const high = parseFloat(latest.high);
  const low = parseFloat(latest.low);

  const body = Math.abs(close - open);
  const lowerShadow = Math.min(open, close) - low;
  const upperShadow = high - Math.max(open, close);
  const totalRange = high - low;

  // Hammer: small body at top, long lower shadow
  if (
    lowerShadow > body * 2 &&
    upperShadow < body * 0.5 &&
    totalRange > 0
  ) {
    return {
      name: 'Hammer',
      type: 'candlestick',
      category: 'bullish',
      confidence: 80,
      description: 'Bullish reversal pattern. Strong buying pressure after decline.',
      significance: 'high',
      detectedAt: latest.datetime,
      priceLevel: close,
      targetPrice: close * 1.05,
      stopLoss: low,
    };
  }

  return null;
}

/**
 * Detect Shooting Star (bearish reversal)
 */
function detectShootingStar(candles: TimeSeriesData[]): DetectedPattern | null {
  const latest = candles[0];
  const open = parseFloat(latest.open);
  const close = parseFloat(latest.close);
  const high = parseFloat(latest.high);
  const low = parseFloat(latest.low);

  const body = Math.abs(close - open);
  const upperShadow = high - Math.max(open, close);
  const lowerShadow = Math.min(open, close) - low;
  const totalRange = high - low;

  // Shooting Star: small body at bottom, long upper shadow
  if (
    upperShadow > body * 2 &&
    lowerShadow < body * 0.5 &&
    totalRange > 0
  ) {
    return {
      name: 'Shooting Star',
      type: 'candlestick',
      category: 'bearish',
      confidence: 80,
      description: 'Bearish reversal pattern. Sellers rejected higher prices.',
      significance: 'high',
      detectedAt: latest.datetime,
      priceLevel: close,
      targetPrice: close * 0.95,
      stopLoss: high,
    };
  }

  return null;
}

/**
 * Detect Engulfing Pattern (reversal)
 */
function detectEngulfing(candles: TimeSeriesData[]): DetectedPattern | null {
  if (candles.length < 2) return null;

  const current = candles[0];
  const previous = candles[1];

  const currOpen = parseFloat(current.open);
  const currClose = parseFloat(current.close);
  const prevOpen = parseFloat(previous.open);
  const prevClose = parseFloat(previous.close);

  const currBody = Math.abs(currClose - currOpen);
  const prevBody = Math.abs(prevClose - prevOpen);

  // Bullish Engulfing
  if (
    prevClose < prevOpen && // Previous red
    currClose > currOpen && // Current green
    currOpen < prevClose &&
    currClose > prevOpen &&
    currBody > prevBody * 1.2
  ) {
    return {
      name: 'Bullish Engulfing',
      type: 'candlestick',
      category: 'bullish',
      confidence: 85,
      description: 'Strong bullish reversal. Bulls overwhelmed bears.',
      significance: 'high',
      detectedAt: current.datetime,
      priceLevel: currClose,
      targetPrice: currClose * 1.08,
    };
  }

  // Bearish Engulfing
  if (
    prevClose > prevOpen && // Previous green
    currClose < currOpen && // Current red
    currOpen > prevClose &&
    currClose < prevOpen &&
    currBody > prevBody * 1.2
  ) {
    return {
      name: 'Bearish Engulfing',
      type: 'candlestick',
      category: 'bearish',
      confidence: 85,
      description: 'Strong bearish reversal. Bears overwhelmed bulls.',
      significance: 'high',
      detectedAt: current.datetime,
      priceLevel: currClose,
      targetPrice: currClose * 0.92,
    };
  }

  return null;
}

/**
 * Detect Morning Star / Evening Star (3-candle reversal)
 */
function detectStar(candles: TimeSeriesData[]): DetectedPattern | null {
  if (candles.length < 3) return null;

  const third = candles[0];
  const second = candles[1];
  const first = candles[2];

  const firstOpen = parseFloat(first.open);
  const firstClose = parseFloat(first.close);
  const secondBody = Math.abs(parseFloat(second.close) - parseFloat(second.open));
  const thirdOpen = parseFloat(third.open);
  const thirdClose = parseFloat(third.close);

  // Morning Star (bullish)
  if (
    firstClose < firstOpen && // First candle red
    secondBody < Math.abs(firstClose - firstOpen) * 0.3 && // Small second candle
    thirdClose > thirdOpen && // Third candle green
    thirdClose > (firstOpen + firstClose) / 2 // Third closes above midpoint
  ) {
    return {
      name: 'Morning Star',
      type: 'candlestick',
      category: 'bullish',
      confidence: 90,
      description: 'Very strong bullish reversal pattern.',
      significance: 'high',
      detectedAt: third.datetime,
      priceLevel: thirdClose,
      targetPrice: thirdClose * 1.10,
    };
  }

  // Evening Star (bearish)
  if (
    firstClose > firstOpen && // First candle green
    secondBody < Math.abs(firstClose - firstOpen) * 0.3 && // Small second candle
    thirdClose < thirdOpen && // Third candle red
    thirdClose < (firstOpen + firstClose) / 2 // Third closes below midpoint
  ) {
    return {
      name: 'Evening Star',
      type: 'candlestick',
      category: 'bearish',
      confidence: 90,
      description: 'Very strong bearish reversal pattern.',
      significance: 'high',
      detectedAt: third.datetime,
      priceLevel: thirdClose,
      targetPrice: thirdClose * 0.90,
    };
  }

  return null;
}

// ============================================================================
// CHART PATTERNS
// ============================================================================

/**
 * Detect Head and Shoulders pattern
 */
function detectHeadAndShoulders(candles: TimeSeriesData[]): DetectedPattern | null {
  if (candles.length < 50) return null;

  const prices = candles.slice(0, 50).map(c => parseFloat(c.close));
  const highs = candles.slice(0, 50).map(c => parseFloat(c.high));

  // Find three peaks
  const peaks: Array<{ index: number; price: number }> = [];
  for (let i = 2; i < highs.length - 2; i++) {
    if (
      highs[i] > highs[i - 1] &&
      highs[i] > highs[i - 2] &&
      highs[i] > highs[i + 1] &&
      highs[i] > highs[i + 2]
    ) {
      peaks.push({ index: i, price: highs[i] });
    }
  }

  if (peaks.length >= 3) {
    // Check if middle peak is highest (head) and shoulders are similar
    const sorted = [...peaks].sort((a, b) => b.price - a.price);
    const head = sorted[0];
    const shoulder1 = peaks.find(p => p.index < head.index);
    const shoulder2 = peaks.find(p => p.index > head.index);

    if (shoulder1 && shoulder2) {
      const shoulderDiff = Math.abs(shoulder1.price - shoulder2.price) / shoulder1.price;

      if (shoulderDiff < 0.05 && head.price > shoulder1.price * 1.05) {
        const neckline = Math.min(shoulder1.price, shoulder2.price);

        return {
          name: 'Head and Shoulders',
          type: 'chart',
          category: 'bearish',
          confidence: 85,
          description: 'Classic bearish reversal pattern. Breakdown below neckline confirms.',
          significance: 'high',
          detectedAt: candles[0].datetime,
          priceLevel: prices[0],
          targetPrice: neckline - (head.price - neckline),
          stopLoss: head.price,
        };
      }
    }
  }

  return null;
}

/**
 * Detect Double Top/Bottom pattern
 */
function detectDoubleTopBottom(candles: TimeSeriesData[]): DetectedPattern | null {
  if (candles.length < 30) return null;

  const highs = candles.slice(0, 30).map(c => parseFloat(c.high));
  const lows = candles.slice(0, 30).map(c => parseFloat(c.low));
  const current = parseFloat(candles[0].close);

  // Find two similar peaks (Double Top)
  const peaks: Array<{ index: number; price: number }> = [];
  for (let i = 2; i < highs.length - 2; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) {
      peaks.push({ index: i, price: highs[i] });
    }
  }

  if (peaks.length >= 2) {
    for (let i = 0; i < peaks.length - 1; i++) {
      const priceDiff = Math.abs(peaks[i].price - peaks[i + 1].price) / peaks[i].price;
      if (priceDiff < 0.02) {
        // Two peaks within 2%
        return {
          name: 'Double Top',
          type: 'chart',
          category: 'bearish',
          confidence: 75,
          description: 'Bearish reversal pattern. Resistance level confirmed twice.',
          significance: 'high',
          detectedAt: candles[0].datetime,
          priceLevel: current,
          targetPrice: current * 0.92,
        };
      }
    }
  }

  // Find two similar troughs (Double Bottom)
  const troughs: Array<{ index: number; price: number }> = [];
  for (let i = 2; i < lows.length - 2; i++) {
    if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1]) {
      troughs.push({ index: i, price: lows[i] });
    }
  }

  if (troughs.length >= 2) {
    for (let i = 0; i < troughs.length - 1; i++) {
      const priceDiff = Math.abs(troughs[i].price - troughs[i + 1].price) / troughs[i].price;
      if (priceDiff < 0.02) {
        return {
          name: 'Double Bottom',
          type: 'chart',
          category: 'bullish',
          confidence: 75,
          description: 'Bullish reversal pattern. Support level confirmed twice.',
          significance: 'high',
          detectedAt: candles[0].datetime,
          priceLevel: current,
          targetPrice: current * 1.08,
        };
      }
    }
  }

  return null;
}

/**
 * Detect Triangle patterns (Ascending, Descending, Symmetrical)
 */
function detectTriangle(candles: TimeSeriesData[]): DetectedPattern | null {
  if (candles.length < 20) return null;

  const highs = candles.slice(0, 20).map(c => parseFloat(c.high));
  const lows = candles.slice(0, 20).map(c => parseFloat(c.low));
  const current = parseFloat(candles[0].close);

  // Calculate trendlines
  const highTrend = calculateTrendSlope(highs);
  const lowTrend = calculateTrendSlope(lows);

  // Ascending Triangle: Flat top, rising lows
  if (Math.abs(highTrend) < 0.001 && lowTrend > 0.001) {
    return {
      name: 'Ascending Triangle',
      type: 'chart',
      category: 'bullish',
      confidence: 70,
      description: 'Bullish continuation pattern. Breakout above resistance expected.',
      significance: 'medium',
      detectedAt: candles[0].datetime,
      priceLevel: current,
      targetPrice: current * 1.08,
    };
  }

  // Descending Triangle: Flat bottom, declining highs
  if (Math.abs(lowTrend) < 0.001 && highTrend < -0.001) {
    return {
      name: 'Descending Triangle',
      type: 'chart',
      category: 'bearish',
      confidence: 70,
      description: 'Bearish continuation pattern. Breakdown below support expected.',
      significance: 'medium',
      detectedAt: candles[0].datetime,
      priceLevel: current,
      targetPrice: current * 0.92,
    };
  }

  // Symmetrical Triangle: Converging highs and lows
  if (highTrend < -0.0005 && lowTrend > 0.0005) {
    return {
      name: 'Symmetrical Triangle',
      type: 'chart',
      category: 'neutral',
      confidence: 65,
      description: 'Consolidation pattern. Breakout direction uncertain.',
      significance: 'medium',
      detectedAt: candles[0].datetime,
      priceLevel: current,
    };
  }

  return null;
}

/**
 * Detect Bull/Bear Flag pattern
 */
function detectFlag(candles: TimeSeriesData[]): DetectedPattern | null {
  if (candles.length < 15) return null;

  const prices = candles.slice(0, 15).map(c => parseFloat(c.close));
  const current = prices[0];

  // Look for strong move followed by consolidation
  const recentMove = (prices[10] - prices[14]) / prices[14];
  const consolidationRange = Math.max(...prices.slice(0, 5)) - Math.min(...prices.slice(0, 5));
  const avgPrice = prices.slice(0, 5).reduce((a, b) => a + b, 0) / 5;

  if (Math.abs(recentMove) > 0.05 && consolidationRange / avgPrice < 0.03) {
    if (recentMove > 0) {
      return {
        name: 'Bull Flag',
        type: 'chart',
        category: 'continuation',
        confidence: 75,
        description: 'Bullish continuation pattern. Expect upward breakout.',
        significance: 'medium',
        detectedAt: candles[0].datetime,
        priceLevel: current,
        targetPrice: current * (1 + Math.abs(recentMove)),
      };
    } else {
      return {
        name: 'Bear Flag',
        type: 'chart',
        category: 'continuation',
        confidence: 75,
        description: 'Bearish continuation pattern. Expect downward breakdown.',
        significance: 'medium',
        detectedAt: candles[0].datetime,
        priceLevel: current,
        targetPrice: current * (1 - Math.abs(recentMove)),
      };
    }
  }

  return null;
}

/**
 * Calculate trend slope for a series of prices
 */
function calculateTrendSlope(prices: number[]): number {
  const n = prices.length;
  const indices = Array.from({ length: n }, (_, i) => i);

  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = prices.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * prices[i], 0);
  const sumXX = indices.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return slope;
}

// ============================================================================
// SUPPORT & RESISTANCE
// ============================================================================

/**
 * Detect support and resistance levels
 */
export function detectSupportResistance(
  candles: TimeSeriesData[],
  threshold: number = 0.02
): SupportResistanceLevel[] {
  if (candles.length < 50) return [];

  const prices = candles.map(c => parseFloat(c.close));
  const levels: Map<number, { touches: number; type: Set<'support' | 'resistance'>; lastTouch: string }> = new Map();

  // Group similar price levels
  for (let i = 0; i < Math.min(prices.length, 100); i++) {
    const price = prices[i];
    let foundLevel = false;

    for (const [levelPrice, data] of levels.entries()) {
      if (Math.abs(price - levelPrice) / levelPrice < threshold) {
        data.touches++;
        data.lastTouch = candles[i].datetime;
        foundLevel = true;
        break;
      }
    }

    if (!foundLevel) {
      levels.set(price, {
        touches: 1,
        type: new Set(),
        lastTouch: candles[i].datetime,
      });
    }
  }

  // Identify support vs resistance
  const currentPrice = prices[0];
  const result: SupportResistanceLevel[] = [];

  for (const [price, data] of levels.entries()) {
    if (data.touches >= 2) {
      const type: 'support' | 'resistance' = price < currentPrice ? 'support' : 'resistance';
      const strength = Math.min(100, data.touches * 20);

      result.push({
        price,
        strength,
        type,
        touches: data.touches,
        lastTouch: data.lastTouch,
      });
    }
  }

  return result.sort((a, b) => b.strength - a.strength).slice(0, 10);
}

// ============================================================================
// MAIN PATTERN DETECTION
// ============================================================================

/**
 * Detect all patterns in the given candle data
 */
export function detectAllPatterns(candles: TimeSeriesData[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Candlestick patterns
  const doji = detectDoji(candles);
  if (doji) patterns.push(doji);

  const hammer = detectHammer(candles);
  if (hammer) patterns.push(hammer);

  const shootingStar = detectShootingStar(candles);
  if (shootingStar) patterns.push(shootingStar);

  const engulfing = detectEngulfing(candles);
  if (engulfing) patterns.push(engulfing);

  const star = detectStar(candles);
  if (star) patterns.push(star);

  // Chart patterns
  const headAndShoulders = detectHeadAndShoulders(candles);
  if (headAndShoulders) patterns.push(headAndShoulders);

  const doubleTopBottom = detectDoubleTopBottom(candles);
  if (doubleTopBottom) patterns.push(doubleTopBottom);

  const triangle = detectTriangle(candles);
  if (triangle) patterns.push(triangle);

  const flag = detectFlag(candles);
  if (flag) patterns.push(flag);

  return patterns;
}
