/**
 * Technical Sentiment Scoring Engine
 *
 * Aggregates multiple technical signals into a comprehensive sentiment score:
 * - Technical indicators (RSI, MACD, Moving Averages)
 * - Volume analysis
 * - Price action patterns
 * - Options flow
 * - Detected patterns
 */

import { TimeSeriesData } from '../../types';
import { DetectedPattern } from './patternRecognition';

export interface SentimentScore {
  overall: number; // -100 (very bearish) to +100 (very bullish)
  sentiment: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
  confidence: number; // 0-100
  components: {
    technical: ComponentScore;
    volume: ComponentScore;
    priceAction: ComponentScore;
    patterns: ComponentScore;
    optionsFlow?: ComponentScore;
  };
  signals: string[]; // Human-readable signals
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  generatedAt: string;
}

export interface ComponentScore {
  score: number; // -100 to +100
  weight: number; // 0-1 (importance)
  signals: string[];
}

/**
 * Calculate comprehensive technical sentiment
 */
export function calculateTechnicalSentiment(
  candles: TimeSeriesData[],
  patterns?: DetectedPattern[],
  optionsData?: {
    putCallRatio: number;
    sentiment: string;
    flow: number;
  }
): SentimentScore {
  if (candles.length < 50) {
    throw new Error('Insufficient data for sentiment analysis (minimum 50 candles)');
  }

  // Calculate component scores
  const technicalScore = analyzeTechnicalIndicators(candles);
  const volumeScore = analyzeVolume(candles);
  const priceActionScore = analyzePriceAction(candles);
  const patternsScore = analyzePatterns(patterns || []);
  const optionsScore = optionsData ? analyzeOptionsFlow(optionsData) : undefined;

  // Weighted average calculation
  let totalWeight = 0;
  let weightedSum = 0;

  const components = {
    technical: technicalScore,
    volume: volumeScore,
    priceAction: priceActionScore,
    patterns: patternsScore,
    ...(optionsScore && { optionsFlow: optionsScore }),
  };

  // Calculate weighted average
  Object.values(components).forEach(component => {
    weightedSum += component.score * component.weight;
    totalWeight += component.weight;
  });

  const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Collect all signals
  const allSignals = [
    ...technicalScore.signals,
    ...volumeScore.signals,
    ...priceActionScore.signals,
    ...patternsScore.signals,
    ...(optionsScore?.signals || []),
  ];

  return {
    overall: Math.round(overallScore),
    sentiment: scoresToSentiment(overallScore),
    confidence: calculateConfidence(components),
    components,
    signals: allSignals,
    recommendation: scoreToRecommendation(overallScore),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Analyze technical indicators (RSI, MACD, MAs)
 */
function analyzeTechnicalIndicators(candles: TimeSeriesData[]): ComponentScore {
  const signals: string[] = [];
  let score = 0;
  let signalCount = 0;

  const closes = candles.map(c => parseFloat(c.close));
  const currentPrice = closes[0];

  // RSI Analysis
  const rsi = calculateRSI(closes, 14);
  if (rsi < 30) {
    signals.push(`RSI oversold (${rsi.toFixed(1)}) - bullish signal`);
    score += 25;
    signalCount++;
  } else if (rsi > 70) {
    signals.push(`RSI overbought (${rsi.toFixed(1)}) - bearish signal`);
    score -= 25;
    signalCount++;
  } else if (rsi > 50) {
    signals.push(`RSI bullish (${rsi.toFixed(1)})`);
    score += 10;
    signalCount++;
  } else {
    signals.push(`RSI bearish (${rsi.toFixed(1)})`);
    score -= 10;
    signalCount++;
  }

  // MACD Analysis
  const macd = calculateMACD(closes);
  if (macd.histogram > 0 && macd.signal > 0) {
    signals.push('MACD bullish crossover');
    score += 20;
    signalCount++;
  } else if (macd.histogram < 0 && macd.signal < 0) {
    signals.push('MACD bearish crossover');
    score -= 20;
    signalCount++;
  }

  // Moving Average Analysis
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);

  if (currentPrice > sma20 && currentPrice > sma50 && currentPrice > sma200) {
    signals.push('Price above all major MAs - strong uptrend');
    score += 30;
    signalCount++;
  } else if (currentPrice < sma20 && currentPrice < sma50 && currentPrice < sma200) {
    signals.push('Price below all major MAs - strong downtrend');
    score -= 30;
    signalCount++;
  } else if (currentPrice > sma20 && currentPrice > sma50) {
    signals.push('Price above 20 & 50 MA - uptrend');
    score += 15;
    signalCount++;
  } else if (currentPrice < sma20 && currentPrice < sma50) {
    signals.push('Price below 20 & 50 MA - downtrend');
    score -= 15;
    signalCount++;
  }

  // Golden Cross / Death Cross
  if (sma50 > sma200 && sma50 < sma200 * 1.02) {
    signals.push('Golden Cross forming - bullish');
    score += 25;
    signalCount++;
  } else if (sma50 < sma200 && sma50 > sma200 * 0.98) {
    signals.push('Death Cross forming - bearish');
    score -= 25;
    signalCount++;
  }

  const avgScore = signalCount > 0 ? score / signalCount : 0;

  return {
    score: Math.max(-100, Math.min(100, avgScore)),
    weight: 0.35, // 35% of total sentiment
    signals,
  };
}

/**
 * Analyze volume patterns
 */
function analyzeVolume(candles: TimeSeriesData[]): ComponentScore {
  const signals: string[] = [];
  let score = 0;

  const volumes = candles.map(c => parseFloat(c.volume));
  const closes = candles.map(c => parseFloat(c.close));

  // Volume trend
  const avgVolume20 = calculateSMA(volumes, 20);
  const currentVolume = volumes[0];

  if (currentVolume > avgVolume20 * 1.5) {
    const priceChange = ((closes[0] - closes[1]) / closes[1]) * 100;
    if (priceChange > 0) {
      signals.push('High volume on up-day - bullish accumulation');
      score += 30;
    } else {
      signals.push('High volume on down-day - bearish distribution');
      score -= 30;
    }
  } else if (currentVolume < avgVolume20 * 0.5) {
    signals.push('Low volume - weak conviction');
    score -= 10;
  }

  // Volume Price Trend (VPT)
  const vpt = calculateVPT(candles);
  if (vpt > 0) {
    signals.push('Volume price trend positive - buying pressure');
    score += 20;
  } else {
    signals.push('Volume price trend negative - selling pressure');
    score -= 20;
  }

  // On-Balance Volume (OBV)
  const obv = calculateOBV(candles);
  const obvSMA = calculateSMA(obv, 10);
  if (obv[0] > obvSMA) {
    signals.push('OBV above average - accumulation');
    score += 15;
  } else {
    signals.push('OBV below average - distribution');
    score -= 15;
  }

  return {
    score: Math.max(-100, Math.min(100, score)),
    weight: 0.25, // 25% of total sentiment
    signals,
  };
}

/**
 * Analyze price action
 */
function analyzePriceAction(candles: TimeSeriesData[]): ComponentScore {
  const signals: string[] = [];
  let score = 0;

  const closes = candles.map(c => parseFloat(c.close));
  const highs = candles.map(c => parseFloat(c.high));
  const lows = candles.map(c => parseFloat(c.low));

  // Momentum
  const momentum = ((closes[0] - closes[10]) / closes[10]) * 100;
  if (momentum > 5) {
    signals.push(`Strong upward momentum (+${momentum.toFixed(1)}%)`);
    score += 25;
  } else if (momentum < -5) {
    signals.push(`Strong downward momentum (${momentum.toFixed(1)}%)`);
    score -= 25;
  }

  // Volatility
  const atr = calculateATR(candles, 14);
  const atrPercent = (atr / closes[0]) * 100;
  if (atrPercent > 3) {
    signals.push(`High volatility (${atrPercent.toFixed(1)}% ATR) - increased risk`);
    score -= 10;
  }

  // Higher highs / Lower lows
  const recentHighs = highs.slice(0, 10);
  const recentLows = lows.slice(0, 10);
  const higherHighs = recentHighs[0] === Math.max(...recentHighs);
  const lowerLows = recentLows[0] === Math.min(...recentLows);

  if (higherHighs) {
    signals.push('Making higher highs - bullish structure');
    score += 20;
  }
  if (lowerLows) {
    signals.push('Making lower lows - bearish structure');
    score -= 20;
  }

  // Price range
  const range = ((highs[0] - lows[0]) / closes[0]) * 100;
  if (range > 3) {
    signals.push('Wide price range - high volatility');
  }

  return {
    score: Math.max(-100, Math.min(100, score)),
    weight: 0.20, // 20% of total sentiment
    signals,
  };
}

/**
 * Analyze detected patterns
 */
function analyzePatterns(patterns: DetectedPattern[]): ComponentScore {
  const signals: string[] = [];
  let score = 0;

  if (patterns.length === 0) {
    return {
      score: 0,
      weight: 0.15, // 15% of total sentiment
      signals: ['No significant patterns detected'],
    };
  }

  patterns.forEach(pattern => {
    const patternScore = (pattern.confidence / 100) *
      (pattern.category === 'bullish' ? 30 : pattern.category === 'bearish' ? -30 : 0);

    score += patternScore;
    signals.push(`${pattern.name} detected (${pattern.confidence}% confidence) - ${pattern.category}`);
  });

  // Average score if multiple patterns
  const avgScore = patterns.length > 0 ? score / patterns.length : 0;

  return {
    score: Math.max(-100, Math.min(100, avgScore)),
    weight: 0.15, // 15% of total sentiment
    signals,
  };
}

/**
 * Analyze options flow data
 */
function analyzeOptionsFlow(optionsData: {
  putCallRatio: number;
  sentiment: string;
  flow: number;
}): ComponentScore {
  const signals: string[] = [];
  let score = 0;

  // Put/Call Ratio Analysis
  if (optionsData.putCallRatio < 0.7) {
    signals.push(`Low P/C ratio (${optionsData.putCallRatio.toFixed(2)}) - bullish`);
    score += 30;
  } else if (optionsData.putCallRatio > 1.3) {
    signals.push(`High P/C ratio (${optionsData.putCallRatio.toFixed(2)}) - bearish`);
    score -= 30;
  } else {
    signals.push(`Neutral P/C ratio (${optionsData.putCallRatio.toFixed(2)})`);
  }

  // Options sentiment
  if (optionsData.sentiment === 'bullish') {
    signals.push('Options sentiment: Bullish');
    score += 20;
  } else if (optionsData.sentiment === 'bearish') {
    signals.push('Options sentiment: Bearish');
    score -= 20;
  }

  // Net flow
  if (optionsData.flow > 0) {
    signals.push('Positive options flow - institutional buying');
    score += 25;
  } else if (optionsData.flow < 0) {
    signals.push('Negative options flow - institutional selling');
    score -= 25;
  }

  return {
    score: Math.max(-100, Math.min(100, score)),
    weight: 0.20, // 20% of total sentiment (when available)
    signals,
  };
}

/**
 * Calculate RSI (Relative Strength Index)
 */
function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 0; i < period; i++) {
    const change = closes[i] - closes[i + 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return rsi;
}

/**
 * Calculate MACD
 */
function calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macd = ema12 - ema26;

  // Signal line (9-period EMA of MACD)
  const macdValues = closes.map((_, i) => {
    const slice = closes.slice(i);
    if (slice.length < 26) return 0;
    return calculateEMA(slice, 12) - calculateEMA(slice, 26);
  });
  const signal = calculateEMA(macdValues, 9);

  return {
    macd,
    signal,
    histogram: macd - signal,
  };
}

/**
 * Calculate Simple Moving Average
 */
function calculateSMA(values: number[], period: number): number {
  if (values.length < period) return values[0] || 0;
  const slice = values.slice(0, period);
  return slice.reduce((sum, val) => sum + val, 0) / period;
}

/**
 * Calculate Exponential Moving Average
 */
function calculateEMA(values: number[], period: number): number {
  if (values.length < period) return values[0] || 0;

  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(values.slice(0, period), period);

  for (let i = period; i < Math.min(values.length, period * 2); i++) {
    ema = (values[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Calculate Volume Price Trend
 */
function calculateVPT(candles: TimeSeriesData[]): number {
  if (candles.length < 2) return 0;

  let vpt = 0;
  for (let i = 0; i < Math.min(candles.length - 1, 20); i++) {
    const priceChange = parseFloat(candles[i].close) - parseFloat(candles[i + 1].close);
    const percentChange = priceChange / parseFloat(candles[i + 1].close);
    vpt += parseFloat(candles[i].volume) * percentChange;
  }

  return vpt;
}

/**
 * Calculate On-Balance Volume
 */
function calculateOBV(candles: TimeSeriesData[]): number[] {
  const obv: number[] = [0];

  for (let i = 1; i < candles.length; i++) {
    const currentClose = parseFloat(candles[i].close);
    const prevClose = parseFloat(candles[i - 1].close);
    const volume = parseFloat(candles[i].volume);

    if (currentClose > prevClose) {
      obv.unshift(obv[0] + volume);
    } else if (currentClose < prevClose) {
      obv.unshift(obv[0] - volume);
    } else {
      obv.unshift(obv[0]);
    }
  }

  return obv;
}

/**
 * Calculate Average True Range
 */
function calculateATR(candles: TimeSeriesData[], period: number = 14): number {
  const trs: number[] = [];

  for (let i = 0; i < Math.min(candles.length - 1, period); i++) {
    const high = parseFloat(candles[i].high);
    const low = parseFloat(candles[i].low);
    const prevClose = parseFloat(candles[i + 1].close);

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trs.push(tr);
  }

  return calculateSMA(trs, trs.length);
}

/**
 * Convert score to sentiment label
 */
function scoresToSentiment(score: number): 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish' {
  if (score >= 60) return 'very_bullish';
  if (score >= 20) return 'bullish';
  if (score > -20) return 'neutral';
  if (score > -60) return 'bearish';
  return 'very_bearish';
}

/**
 * Convert score to recommendation
 */
function scoreToRecommendation(score: number): 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' {
  if (score >= 70) return 'strong_buy';
  if (score >= 30) return 'buy';
  if (score > -30) return 'hold';
  if (score > -70) return 'sell';
  return 'strong_sell';
}

/**
 * Calculate overall confidence based on signal agreement
 */
function calculateConfidence(components: Record<string, ComponentScore>): number {
  const scores = Object.values(components).map(c => c.score);

  // Calculate standard deviation of component scores
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Lower deviation = higher confidence (signals agree)
  const confidence = Math.max(0, Math.min(100, 100 - stdDev / 2));

  return Math.round(confidence);
}
