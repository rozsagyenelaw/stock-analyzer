import { TechnicalIndicators } from './indicators';
import { getStatistics } from './twelveData';
import { settingsQueries } from './database';

export interface SignalAnalysis {
  composite: {
    score: number; // -10 to +10
    signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
    confidence: number; // 0-100%
  };
  technicalScore: number;
  fundamentalScore: number;
  indicators: TechnicalIndicators;
  priceTargets: {
    entry: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
  };
  warnings: string[];
}

export interface FundamentalData {
  peRatio: number | null;
  forwardPe: number | null;
  pegRatio: number | null;
  eps: number;
  epsGrowth: number;
  revenueGrowth: number;
  profitMargin: number;
  debtToEquity: number;
  dividendYield: number | null;
  analystTargetPrice: number | null;
  insiderBuying: boolean;
}

interface IndicatorWeights {
  rsi: number;
  macd: number;
  movingAverages: number;
  bollingerBands: number;
  volume: number;
  stochastic: number;
  obv: number;
}

function getIndicatorWeights(): IndicatorWeights {
  try {
    const settings = settingsQueries.get.get() as any;
    const weights = JSON.parse(settings.indicator_weights);
    return weights;
  } catch (error) {
    // Default weights if no settings found
    return {
      rsi: 1,
      macd: 1,
      movingAverages: 1,
      bollingerBands: 1,
      volume: 1,
      stochastic: 1,
      obv: 1,
    };
  }
}

export function calculateTechnicalScore(indicators: TechnicalIndicators): number {
  const weights = getIndicatorWeights();

  const totalWeight =
    weights.rsi +
    weights.macd +
    weights.movingAverages +
    weights.bollingerBands +
    weights.volume +
    weights.stochastic +
    weights.obv;

  const weightedScore =
    indicators.rsi.signal * weights.rsi +
    indicators.macd.signal * weights.macd +
    indicators.movingAverages.signal * weights.movingAverages +
    indicators.bollingerBands.signal * weights.bollingerBands +
    indicators.volume.signal * weights.volume +
    indicators.stochastic.signal * weights.stochastic +
    indicators.obv.signal * weights.obv;

  // Scale to -10 to +10
  return (weightedScore / totalWeight) * 5;
}

export async function calculateFundamentalScore(
  symbol: string,
  fundamentals: FundamentalData
): Promise<number> {
  let score = 0;

  // P/E Ratio scoring
  if (fundamentals.peRatio !== null) {
    if (fundamentals.peRatio < 15) {
      score += 2; // Potentially undervalued
    } else if (fundamentals.peRatio < 25) {
      score += 1; // Fair value
    } else if (fundamentals.peRatio > 40) {
      score -= 2; // Potentially overvalued
    } else if (fundamentals.peRatio > 30) {
      score -= 1;
    }
  }

  // EPS Growth scoring
  if (fundamentals.epsGrowth > 20) {
    score += 2;
  } else if (fundamentals.epsGrowth > 10) {
    score += 1;
  } else if (fundamentals.epsGrowth < -10) {
    score -= 2;
  } else if (fundamentals.epsGrowth < 0) {
    score -= 1;
  }

  // Revenue Growth scoring
  if (fundamentals.revenueGrowth > 15) {
    score += 1;
  } else if (fundamentals.revenueGrowth < -5) {
    score -= 1;
  }

  // Profit Margin scoring
  if (fundamentals.profitMargin > 20) {
    score += 1;
  } else if (fundamentals.profitMargin < 5) {
    score -= 1;
  }

  // Debt to Equity scoring
  if (fundamentals.debtToEquity < 0.5) {
    score += 1;
  } else if (fundamentals.debtToEquity > 2) {
    score -= 1;
  }

  // Insider buying is bullish
  if (fundamentals.insiderBuying) {
    score += 1;
  }

  // PEG Ratio (best indicator of value)
  if (fundamentals.pegRatio !== null) {
    if (fundamentals.pegRatio < 1) {
      score += 2; // Undervalued
    } else if (fundamentals.pegRatio > 2) {
      score -= 1; // Overvalued
    }
  }

  // Cap score at -10 to +10
  return Math.max(-10, Math.min(10, score));
}

export function getSignalLabel(score: number): 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' {
  if (score >= 6) return 'STRONG_BUY';
  if (score >= 3) return 'BUY';
  if (score >= -2) return 'HOLD';
  if (score >= -5) return 'SELL';
  return 'STRONG_SELL';
}

export function calculateConfidence(indicators: TechnicalIndicators): number {
  const signals = [
    indicators.rsi.signal,
    indicators.macd.signal,
    indicators.movingAverages.signal,
    indicators.bollingerBands.signal,
    indicators.stochastic.signal,
    indicators.obv.signal,
  ];

  // Calculate agreement between indicators
  const positiveSignals = signals.filter((s) => s > 0).length;
  const negativeSignals = signals.filter((s) => s < 0).length;
  const neutralSignals = signals.filter((s) => s === 0).length;

  const totalSignals = signals.length;
  const maxAgreement = Math.max(positiveSignals, negativeSignals, neutralSignals);

  // Calculate strength of signals
  const avgSignalStrength = signals.reduce((sum, s) => sum + Math.abs(s), 0) / totalSignals;

  // Confidence is based on agreement and strength
  const agreementConfidence = (maxAgreement / totalSignals) * 100;
  const strengthConfidence = (avgSignalStrength / 2) * 100; // Max signal is 2

  // Weighted average
  return Math.round((agreementConfidence * 0.7 + strengthConfidence * 0.3));
}

export function calculatePriceTargets(
  currentPrice: number,
  atr: number,
  indicators: TechnicalIndicators
): {
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
} {
  // Use ATR for stop loss distance (1.5x ATR is common)
  const stopLossDistance = atr * 1.5;

  // Determine entry point based on Bollinger Bands and support
  let entry = currentPrice;
  const bbands = indicators.bollingerBands.value as any;

  // If price is near lower band, suggest waiting for a bounce
  if (currentPrice < bbands.middle) {
    entry = bbands.middle * 0.99; // 1% below middle band
  }

  // Stop loss below entry
  const stopLoss = entry - stopLossDistance;

  // Take profit targets at 2:1 and 3:1 risk/reward ratios
  const riskAmount = entry - stopLoss;
  const takeProfit1 = entry + riskAmount * 2; // 2:1 R/R
  const takeProfit2 = entry + riskAmount * 3; // 3:1 R/R

  return {
    entry: Math.round(entry * 100) / 100,
    stopLoss: Math.round(stopLoss * 100) / 100,
    takeProfit1: Math.round(takeProfit1 * 100) / 100,
    takeProfit2: Math.round(takeProfit2 * 100) / 100,
  };
}

export function generateWarnings(
  indicators: TechnicalIndicators,
  fundamentals: FundamentalData | null
): string[] {
  const warnings: string[] = [];

  // High volatility warning
  const atr = indicators.atr.value as any;
  if (atr.atrPercent > 5) {
    warnings.push(`High volatility: ${atr.atrPercent.toFixed(2)}% ATR - increased risk`);
  }

  // Extreme RSI warnings
  const rsi = indicators.rsi.value as number;
  if (rsi >= 80) {
    warnings.push('Extremely overbought (RSI > 80) - high reversal risk');
  } else if (rsi <= 20) {
    warnings.push('Extremely oversold (RSI < 20) - potential capitulation');
  }

  // Volume warning
  const volume = indicators.volume.value as any;
  if (volume.ratio < 0.3) {
    warnings.push('Very low volume - lack of liquidity');
  }

  // 52-week extreme warnings
  const fiftyTwoWeek = indicators.fiftyTwoWeek.value as any;
  if (fiftyTwoWeek.position >= 0.95) {
    warnings.push('At 52-week high - potential resistance');
  } else if (fiftyTwoWeek.position <= 0.05) {
    warnings.push('At 52-week low - extreme weakness or value opportunity');
  }

  // Fundamental warnings
  if (fundamentals) {
    if (fundamentals.debtToEquity > 3) {
      warnings.push('Very high debt to equity ratio - financial risk');
    }

    if (fundamentals.peRatio && fundamentals.peRatio > 50) {
      warnings.push(`Extremely high P/E ratio (${fundamentals.peRatio.toFixed(1)}) - valuation risk`);
    }

    if (fundamentals.epsGrowth < -20) {
      warnings.push('Significant EPS decline - earnings trouble');
    }
  }

  return warnings;
}

export async function calculateSignalAnalysis(
  symbol: string,
  indicators: TechnicalIndicators,
  currentPrice: number
): Promise<SignalAnalysis> {
  // Calculate technical score
  const technicalScore = calculateTechnicalScore(indicators);

  // Try to get fundamental data and score
  let fundamentalScore = 0;
  let fundamentals: FundamentalData | null = null;

  try {
    const stats = await getStatistics(symbol);
    fundamentals = {
      peRatio: stats.valuations_metrics?.pe_ratio || null,
      forwardPe: stats.valuations_metrics?.forward_pe || null,
      pegRatio: stats.valuations_metrics?.peg_ratio || null,
      eps: stats.financials?.eps || 0,
      epsGrowth: stats.financials?.eps_growth || 0,
      revenueGrowth: stats.financials?.revenue_growth || 0,
      profitMargin: stats.financials?.profit_margin || 0,
      debtToEquity: stats.financials?.debt_to_equity || 0,
      dividendYield: stats.dividends?.dividend_yield || null,
      analystTargetPrice: stats.analyst_ratings?.target_price || null,
      insiderBuying: false, // Would need additional endpoint
    };

    fundamentalScore = await calculateFundamentalScore(symbol, fundamentals);
  } catch (error) {
    console.warn('Could not fetch fundamental data:', error);
  }

  // Composite score (weighted: 60% technical, 40% fundamental)
  const compositeScore = technicalScore * 0.6 + fundamentalScore * 0.4;

  // Calculate confidence
  const confidence = calculateConfidence(indicators);

  // Get signal label
  const signal = getSignalLabel(compositeScore);

  // Calculate price targets
  const atr = (indicators.atr.value as any).atr;
  const priceTargets = calculatePriceTargets(currentPrice, atr, indicators);

  // Generate warnings
  const warnings = generateWarnings(indicators, fundamentals);

  return {
    composite: {
      score: Math.round(compositeScore * 10) / 10,
      signal,
      confidence,
    },
    technicalScore: Math.round(technicalScore * 10) / 10,
    fundamentalScore: Math.round(fundamentalScore * 10) / 10,
    indicators,
    priceTargets,
    warnings,
  };
}

export default {
  calculateTechnicalScore,
  calculateFundamentalScore,
  calculateSignalAnalysis,
  calculateConfidence,
  getSignalLabel,
  calculatePriceTargets,
  generateWarnings,
};
