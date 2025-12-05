/**
 * Trade Signal Generator Service
 * Analyzes technical indicators and generates actionable BUY/SELL/HOLD signals
 */

export interface TradeSignal {
  signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number; // 0-100
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskRewardRatio: number;
  positionSize: number; // Recommended shares based on risk
  reasoning: string[];
  technicalScore: number; // -100 to +100
  trendDirection: 'uptrend' | 'downtrend' | 'sideways';
  supportLevels: number[];
  resistanceLevels: number[];
}

export interface PositionSizeParams {
  accountSize: number;
  riskPercentage: number; // e.g., 1 for 1% risk per trade
  entryPrice: number;
  stopLoss: number;
}

/**
 * Calculate position size based on risk management
 */
export function calculatePositionSize(params: PositionSizeParams): number {
  const { accountSize, riskPercentage, entryPrice, stopLoss } = params;

  const riskAmount = accountSize * (riskPercentage / 100);
  const riskPerShare = Math.abs(entryPrice - stopLoss);

  if (riskPerShare === 0) return 0;

  const shares = Math.floor(riskAmount / riskPerShare);
  return shares;
}

/**
 * Calculate support and resistance levels using price action
 */
export function calculateSupportResistance(
  prices: number[],
  currentPrice: number
): { support: number[]; resistance: number[] } {
  if (prices.length < 20) {
    return {
      support: [currentPrice * 0.95, currentPrice * 0.90],
      resistance: [currentPrice * 1.05, currentPrice * 1.10]
    };
  }

  // Find local minimums (support) and maximums (resistance)
  const support: number[] = [];
  const resistance: number[] = [];

  for (let i = 2; i < prices.length - 2; i++) {
    // Local minimum
    if (
      prices[i] < prices[i - 1] &&
      prices[i] < prices[i - 2] &&
      prices[i] < prices[i + 1] &&
      prices[i] < prices[i + 2]
    ) {
      if (prices[i] < currentPrice) {
        support.push(prices[i]);
      }
    }

    // Local maximum
    if (
      prices[i] > prices[i - 1] &&
      prices[i] > prices[i - 2] &&
      prices[i] > prices[i + 1] &&
      prices[i] > prices[i + 2]
    ) {
      if (prices[i] > currentPrice) {
        resistance.push(prices[i]);
      }
    }
  }

  // Get closest levels
  const closestSupport = support
    .sort((a, b) => Math.abs(currentPrice - a) - Math.abs(currentPrice - b))
    .slice(0, 3);

  const closestResistance = resistance
    .sort((a, b) => Math.abs(currentPrice - a) - Math.abs(currentPrice - b))
    .slice(0, 3);

  return {
    support: closestSupport.length > 0 ? closestSupport : [currentPrice * 0.95, currentPrice * 0.90],
    resistance: closestResistance.length > 0 ? closestResistance : [currentPrice * 1.05, currentPrice * 1.10]
  };
}

/**
 * Generate trade signal based on technical analysis
 */
export function generateTradeSignal(
  symbol: string,
  currentPrice: number,
  indicators: any,
  accountSize: number = 10000,
  riskPercentage: number = 1
): TradeSignal {
  const reasoning: string[] = [];
  let score = 0; // -100 to +100

  // Analyze RSI
  if (indicators.rsi !== undefined) {
    if (indicators.rsi < 30) {
      score += 25;
      reasoning.push(`RSI oversold at ${indicators.rsi.toFixed(1)} (bullish)`);
    } else if (indicators.rsi > 70) {
      score -= 25;
      reasoning.push(`RSI overbought at ${indicators.rsi.toFixed(1)} (bearish)`);
    } else if (indicators.rsi >= 40 && indicators.rsi <= 60) {
      reasoning.push(`RSI neutral at ${indicators.rsi.toFixed(1)}`);
    }
  }

  // Analyze MACD
  if (indicators.macd && indicators.macdSignal) {
    const macdDiff = indicators.macd - indicators.macdSignal;
    if (macdDiff > 0) {
      score += 15;
      reasoning.push('MACD bullish crossover');
    } else {
      score -= 15;
      reasoning.push('MACD bearish crossover');
    }
  }

  // Analyze Moving Averages
  if (indicators.sma20 && indicators.sma50) {
    if (currentPrice > indicators.sma20 && indicators.sma20 > indicators.sma50) {
      score += 20;
      reasoning.push('Price above MA20 and MA50 (strong uptrend)');
    } else if (currentPrice < indicators.sma20 && indicators.sma20 < indicators.sma50) {
      score -= 20;
      reasoning.push('Price below MA20 and MA50 (strong downtrend)');
    } else if (currentPrice > indicators.sma20) {
      score += 10;
      reasoning.push('Price above MA20 (short-term bullish)');
    } else {
      score -= 10;
      reasoning.push('Price below MA20 (short-term bearish)');
    }
  }

  // Analyze Bollinger Bands
  if (indicators.bbUpper && indicators.bbLower) {
    const bbWidth = ((indicators.bbUpper - indicators.bbLower) / currentPrice) * 100;
    if (currentPrice <= indicators.bbLower) {
      score += 15;
      reasoning.push('Price at lower Bollinger Band (potential bounce)');
    } else if (currentPrice >= indicators.bbUpper) {
      score -= 15;
      reasoning.push('Price at upper Bollinger Band (potential pullback)');
    }

    if (bbWidth < 10) {
      reasoning.push('Bollinger Bands squeezing (breakout imminent)');
    }
  }

  // Analyze Volume
  if (indicators.volume && indicators.avgVolume) {
    const volumeRatio = indicators.volume / indicators.avgVolume;
    if (volumeRatio > 1.5) {
      if (score > 0) {
        score += 10;
        reasoning.push(`High volume confirms trend (${volumeRatio.toFixed(1)}x average)`);
      } else {
        score -= 10;
        reasoning.push(`High volume on weakness (${volumeRatio.toFixed(1)}x average)`);
      }
    }
  }

  // Analyze ADX (trend strength)
  if (indicators.adx) {
    if (indicators.adx > 25) {
      reasoning.push(`Strong trend (ADX: ${indicators.adx.toFixed(1)})`);
    } else {
      score *= 0.7; // Reduce conviction in weak trends
      reasoning.push(`Weak trend (ADX: ${indicators.adx.toFixed(1)})`);
    }
  }

  // Determine trend direction
  let trendDirection: 'uptrend' | 'downtrend' | 'sideways';
  if (score > 20) trendDirection = 'uptrend';
  else if (score < -20) trendDirection = 'downtrend';
  else trendDirection = 'sideways';

  // Calculate support/resistance (simplified - would use actual price history)
  const supportResistance = calculateSupportResistance(
    [currentPrice],  // In production, pass actual price history
    currentPrice
  );

  // Determine signal based on score
  let signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  let entryPrice: number;
  let stopLoss: number;
  let target1: number;
  let target2: number;
  let target3: number;

  if (score >= 50) {
    signal = 'STRONG_BUY';
    entryPrice = currentPrice;
    stopLoss = supportResistance.support[0] || currentPrice * 0.95;
    target1 = currentPrice * 1.05;
    target2 = currentPrice * 1.10;
    target3 = supportResistance.resistance[0] || currentPrice * 1.15;
  } else if (score >= 20) {
    signal = 'BUY';
    entryPrice = currentPrice;
    stopLoss = supportResistance.support[0] || currentPrice * 0.96;
    target1 = currentPrice * 1.03;
    target2 = currentPrice * 1.06;
    target3 = supportResistance.resistance[0] || currentPrice * 1.10;
  } else if (score <= -50) {
    signal = 'STRONG_SELL';
    entryPrice = currentPrice;
    stopLoss = supportResistance.resistance[0] || currentPrice * 1.05;
    target1 = currentPrice * 0.95;
    target2 = currentPrice * 0.90;
    target3 = supportResistance.support[0] || currentPrice * 0.85;
  } else if (score <= -20) {
    signal = 'SELL';
    entryPrice = currentPrice;
    stopLoss = supportResistance.resistance[0] || currentPrice * 1.04;
    target1 = currentPrice * 0.97;
    target2 = currentPrice * 0.94;
    target3 = supportResistance.support[0] || currentPrice * 0.90;
  } else {
    signal = 'HOLD';
    entryPrice = currentPrice;
    stopLoss = currentPrice * 0.97;
    target1 = currentPrice * 1.03;
    target2 = currentPrice * 1.06;
    target3 = currentPrice * 1.10;
    reasoning.push('No strong directional bias - wait for clearer setup');
  }

  // Calculate risk/reward
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(target2 - entryPrice);
  const riskRewardRatio = risk > 0 ? reward / risk : 0;

  // Calculate position size
  const positionSize = calculatePositionSize({
    accountSize,
    riskPercentage,
    entryPrice,
    stopLoss
  });

  // Calculate confidence (0-100)
  const confidence = Math.min(100, Math.abs(score) * 1.2);

  return {
    signal,
    confidence,
    entryPrice,
    stopLoss,
    target1,
    target2,
    target3,
    riskRewardRatio,
    positionSize,
    reasoning,
    technicalScore: score,
    trendDirection,
    supportLevels: supportResistance.support,
    resistanceLevels: supportResistance.resistance
  };
}
