/**
 * AI Trade Validation Assistant
 * Validates trade ideas before execution with comprehensive AI analysis
 */

import { getQuote, getTimeSeries } from './twelveData';
import { getAllIndicators } from './indicators';
import { detectAllPatterns } from './ai/patternRecognition';
import { calculateTechnicalSentiment } from './ai/sentimentScoring';
import { generatePricePrediction } from './ai/predictions';
import { generateAIAnalysis } from './aiAnalysis';

export interface TradeIdea {
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  positionSize?: number;
  timeframe: string;
  reasoning?: string;
}

export interface ValidationResult {
  symbol: string;
  validationScore: number; // 0-100, overall confidence in the trade
  verdict: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' | 'avoid';

  riskReward: {
    ratio: number;
    potentialGain: number; // %
    potentialLoss: number; // %
    assessment: string;
    score: number; // 0-100
  };

  technicalSetup: {
    priceAction: string;
    indicators: string[];
    patterns: string[];
    sentiment: string;
    score: number; // 0-100
  };

  marketContext: {
    trend: string;
    volatility: string;
    volume: string;
    timing: string;
    score: number; // 0-100
  };

  aiAnalysis: {
    summary: string;
    pros: string[];
    cons: string[];
    warnings: string[];
    recommendation: string;
  };

  checklist: {
    category: string;
    items: Array<{
      check: string;
      status: 'pass' | 'fail' | 'warning' | 'neutral';
      details: string;
    }>;
  }[];

  timestamp: string;
}

/**
 * Validate a trade idea with comprehensive AI analysis
 */
export async function validateTrade(trade: TradeIdea): Promise<ValidationResult> {
  console.log(`🔍 Validating ${trade.direction.toUpperCase()} trade for ${trade.symbol}...`);

  try {
    // Fetch market data
    const [quote, timeSeriesResponse, indicators] = await Promise.all([
      getQuote(trade.symbol),
      getTimeSeries(trade.symbol, '1day', 100),
      getAllIndicators(trade.symbol),
    ]);

    const currentPrice = parseFloat(quote.close);

    if (!timeSeriesResponse?.values || timeSeriesResponse.values.length === 0) {
      throw new Error('Insufficient data for validation');
    }

    const timeSeries = timeSeriesResponse.values.map(v => ({
      ...v,
      symbol: timeSeriesResponse.meta.symbol
    }));

    // Run AI analyses in parallel
    const [patterns, sentiment, prediction] = await Promise.all([
      detectAllPatterns(timeSeries).catch(() => []),
      calculateTechnicalSentiment(timeSeries).catch(() => null),
      generatePricePrediction(timeSeries).catch(() => null),
    ]);

    // Calculate risk/reward metrics
    const riskReward = calculateRiskReward(trade, currentPrice);

    // Analyze technical setup
    const technicalSetup = analyzeTechnicalSetup(trade, indicators, patterns, sentiment);

    // Assess market context
    const marketContext = assessMarketContext(trade, quote, timeSeries, prediction);

    // Build validation checklist
    const checklist = buildValidationChecklist(trade, currentPrice, riskReward, technicalSetup, marketContext);

    // Calculate overall validation score
    const validationScore = calculateValidationScore(riskReward, technicalSetup, marketContext, checklist);

    // Determine verdict
    const verdict = determineVerdict(validationScore, trade.direction);

    // Generate AI analysis
    const aiAnalysis = await generateTradeAnalysis(
      trade,
      currentPrice,
      riskReward,
      technicalSetup,
      marketContext,
      sentiment,
      patterns,
      validationScore,
      verdict
    );

    return {
      symbol: trade.symbol,
      validationScore,
      verdict,
      riskReward,
      technicalSetup,
      marketContext,
      aiAnalysis,
      checklist,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error validating trade for ${trade.symbol}:`, error);
    throw error;
  }
}

/**
 * Calculate risk/reward metrics
 */
function calculateRiskReward(trade: TradeIdea, currentPrice: number): ValidationResult['riskReward'] {
  const isLong = trade.direction === 'long';

  const potentialGain = isLong
    ? ((trade.targetPrice - trade.entryPrice) / trade.entryPrice) * 100
    : ((trade.entryPrice - trade.targetPrice) / trade.entryPrice) * 100;

  const potentialLoss = isLong
    ? ((trade.entryPrice - trade.stopLoss) / trade.entryPrice) * 100
    : ((trade.stopLoss - trade.entryPrice) / trade.entryPrice) * 100;

  const ratio = Math.abs(potentialGain / potentialLoss);

  let assessment = '';
  let score = 0;

  if (ratio >= 3) {
    assessment = 'Excellent risk/reward ratio';
    score = 95;
  } else if (ratio >= 2) {
    assessment = 'Good risk/reward ratio';
    score = 80;
  } else if (ratio >= 1.5) {
    assessment = 'Acceptable risk/reward ratio';
    score = 60;
  } else if (ratio >= 1) {
    assessment = 'Marginal risk/reward ratio';
    score = 40;
  } else {
    assessment = 'Poor risk/reward ratio - risk exceeds reward';
    score = 20;
  }

  // Adjust score based on entry vs current price
  const priceGap = Math.abs((trade.entryPrice - currentPrice) / currentPrice) * 100;
  if (priceGap > 5) {
    score = Math.max(0, score - 20); // Significant gap reduces score
    assessment += ` (Entry ${priceGap.toFixed(1)}% from current price)`;
  }

  return {
    ratio,
    potentialGain,
    potentialLoss,
    assessment,
    score: Math.round(score)
  };
}

/**
 * Analyze technical setup
 */
function analyzeTechnicalSetup(
  trade: TradeIdea,
  indicators: any,
  patterns: any[],
  sentiment: any
): ValidationResult['technicalSetup'] {
  const isLong = trade.direction === 'long';
  const indicatorSignals: string[] = [];
  let score = 50; // Start neutral

  // RSI analysis
  const rsi = indicators.rsi.value as number;
  if (isLong) {
    if (rsi < 30) {
      indicatorSignals.push(`RSI oversold (${rsi.toFixed(1)}) - bullish`);
      score += 15;
    } else if (rsi > 70) {
      indicatorSignals.push(`RSI overbought (${rsi.toFixed(1)}) - caution`);
      score -= 10;
    } else if (rsi > 50) {
      indicatorSignals.push(`RSI bullish (${rsi.toFixed(1)})`);
      score += 5;
    }
  } else {
    if (rsi > 70) {
      indicatorSignals.push(`RSI overbought (${rsi.toFixed(1)}) - bearish`);
      score += 15;
    } else if (rsi < 30) {
      indicatorSignals.push(`RSI oversold (${rsi.toFixed(1)}) - caution`);
      score -= 10;
    } else if (rsi < 50) {
      indicatorSignals.push(`RSI bearish (${rsi.toFixed(1)})`);
      score += 5;
    }
  }

  // MACD analysis
  const macdSignal = indicators.macd.signal;
  if (isLong && macdSignal === 2) {
    indicatorSignals.push('MACD bullish crossover');
    score += 10;
  } else if (!isLong && macdSignal === -2) {
    indicatorSignals.push('MACD bearish crossover');
    score += 10;
  } else if (isLong && macdSignal === -2) {
    indicatorSignals.push('MACD bearish crossover - conflicting signal');
    score -= 15;
  } else if (!isLong && macdSignal === 2) {
    indicatorSignals.push('MACD bullish crossover - conflicting signal');
    score -= 15;
  }

  // Moving Average analysis
  const maInterpretation = indicators.movingAverages.interpretation;
  if (isLong && maInterpretation.includes('Golden Cross')) {
    indicatorSignals.push('Golden Cross pattern');
    score += 15;
  } else if (!isLong && maInterpretation.includes('Death Cross')) {
    indicatorSignals.push('Death Cross pattern');
    score += 15;
  }

  // Pattern analysis
  const patternList: string[] = [];
  patterns.forEach(pattern => {
    const alignsWithTrade = (isLong && pattern.implications === 'bullish') ||
                           (!isLong && pattern.implications === 'bearish');

    if (alignsWithTrade) {
      patternList.push(`${pattern.name} (${pattern.confidence}% confidence)`);
      score += 10;
    } else {
      patternList.push(`${pattern.name} - conflicting ${pattern.implications}`);
      score -= 10;
    }
  });

  // Sentiment analysis
  let sentimentText = 'neutral';
  if (sentiment) {
    const sentimentAligns = (isLong && sentiment.sentiment.includes('bullish')) ||
                           (!isLong && sentiment.sentiment.includes('bearish'));

    sentimentText = sentiment.sentiment.replace('_', ' ');

    if (sentimentAligns) {
      score += sentiment.overall / 5; // Up to +20 for perfect alignment
    } else {
      score -= sentiment.overall / 5; // Up to -20 for conflict
    }
  }

  // Price action assessment
  let priceAction = 'Neutral price action';
  if (indicators.movingAverages.interpretation.includes('bullish')) {
    priceAction = isLong ? 'Strong uptrend' : 'Counter-trend short setup';
  } else if (indicators.movingAverages.interpretation.includes('bearish')) {
    priceAction = isLong ? 'Counter-trend long setup' : 'Strong downtrend';
  }

  return {
    priceAction,
    indicators: indicatorSignals,
    patterns: patternList,
    sentiment: sentimentText,
    score: Math.max(0, Math.min(100, Math.round(score)))
  };
}

/**
 * Assess market context
 */
function assessMarketContext(
  trade: TradeIdea,
  quote: any,
  timeSeries: any[],
  prediction: any
): ValidationResult['marketContext'] {
  let score = 50;

  // Trend analysis
  const ma50 = calculateSMA(timeSeries.slice(0, 50).map(d => parseFloat(d.close)));
  const ma200 = calculateSMA(timeSeries.map(d => parseFloat(d.close)));
  const currentPrice = parseFloat(quote.close);

  let trend = 'sideways';
  if (ma50 > ma200 * 1.02) {
    trend = 'strong uptrend';
    if (trade.direction === 'long') score += 15;
    else score -= 10;
  } else if (ma50 < ma200 * 0.98) {
    trend = 'strong downtrend';
    if (trade.direction === 'short') score += 15;
    else score -= 10;
  } else if (ma50 > ma200) {
    trend = 'uptrend';
    if (trade.direction === 'long') score += 10;
  } else if (ma50 < ma200) {
    trend = 'downtrend';
    if (trade.direction === 'short') score += 10;
  }

  // Volatility analysis
  const priceChanges = timeSeries.slice(0, 20).map((d, i) => {
    if (i === 0) return 0;
    return Math.abs((parseFloat(d.close) - parseFloat(timeSeries[i - 1].close)) / parseFloat(timeSeries[i - 1].close));
  });
  const avgVolatility = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;

  let volatility = 'normal';
  if (avgVolatility > 0.03) {
    volatility = 'high - increased risk';
    score -= 5;
  } else if (avgVolatility < 0.01) {
    volatility = 'low - reduced opportunity';
  }

  // Volume analysis
  const volume = parseFloat(quote.volume);
  const avgVolume = parseFloat(quote.average_volume);
  const volumeRatio = volume / avgVolume;

  let volumeText = 'normal';
  if (volumeRatio > 1.5) {
    volumeText = 'above average - strong interest';
    score += 10;
  } else if (volumeRatio < 0.5) {
    volumeText = 'below average - weak participation';
    score -= 10;
  }

  // Timing analysis based on prediction
  let timing = 'neutral timing';
  if (prediction) {
    const pred1Week = prediction.predictions['1week'];
    const predictedChange = pred1Week.change;

    const alignsWithTrade = (trade.direction === 'long' && predictedChange > 0) ||
                           (trade.direction === 'short' && predictedChange < 0);

    if (alignsWithTrade) {
      timing = `favorable - AI predicts ${predictedChange > 0 ? '+' : ''}${predictedChange.toFixed(1)}% in 1 week`;
      score += 15;
    } else {
      timing = `challenging - AI predicts ${predictedChange > 0 ? '+' : ''}${predictedChange.toFixed(1)}% in 1 week`;
      score -= 15;
    }
  }

  return {
    trend,
    volatility,
    volume: volumeText,
    timing,
    score: Math.max(0, Math.min(100, Math.round(score)))
  };
}

/**
 * Build validation checklist
 */
function buildValidationChecklist(
  trade: TradeIdea,
  currentPrice: number,
  riskReward: any,
  technical: any,
  market: any
): ValidationResult['checklist'] {
  const checklist: ValidationResult['checklist'] = [];

  // Risk Management checks
  checklist.push({
    category: 'Risk Management',
    items: [
      {
        check: 'Risk/reward ratio ≥ 2:1',
        status: riskReward.ratio >= 2 ? 'pass' : riskReward.ratio >= 1.5 ? 'warning' : 'fail',
        details: `Current ratio: ${riskReward.ratio.toFixed(2)}:1`
      },
      {
        check: 'Stop loss defined',
        status: trade.stopLoss > 0 ? 'pass' : 'fail',
        details: trade.stopLoss > 0 ? `Stop at $${trade.stopLoss.toFixed(2)}` : 'No stop loss set'
      },
      {
        check: 'Position size appropriate',
        status: trade.positionSize ? 'neutral' : 'warning',
        details: trade.positionSize ? `${trade.positionSize} shares` : 'Position size not specified'
      },
      {
        check: 'Maximum loss acceptable (<3% of account)',
        status: Math.abs(riskReward.potentialLoss) <= 3 ? 'pass' : Math.abs(riskReward.potentialLoss) <= 5 ? 'warning' : 'fail',
        details: `Potential loss: ${riskReward.potentialLoss.toFixed(2)}%`
      }
    ]
  });

  // Technical Analysis checks
  checklist.push({
    category: 'Technical Analysis',
    items: [
      {
        check: 'Indicators align with trade direction',
        status: technical.score >= 70 ? 'pass' : technical.score >= 50 ? 'warning' : 'fail',
        details: `Technical score: ${technical.score}/100`
      },
      {
        check: 'Entry near support/resistance',
        status: 'neutral',
        details: 'Review price levels on chart'
      },
      {
        check: 'Volume confirms direction',
        status: market.volume.includes('above average') ? 'pass' : market.volume.includes('below average') ? 'warning' : 'neutral',
        details: market.volume
      }
    ]
  });

  // Market Context checks
  checklist.push({
    category: 'Market Context',
    items: [
      {
        check: 'Trade aligned with trend',
        status: market.score >= 70 ? 'pass' : market.score >= 50 ? 'warning' : 'fail',
        details: market.trend
      },
      {
        check: 'Timing favorable',
        status: market.timing.includes('favorable') ? 'pass' : market.timing.includes('challenging') ? 'fail' : 'neutral',
        details: market.timing
      },
      {
        check: 'Volatility manageable',
        status: market.volatility.includes('high') ? 'warning' : market.volatility.includes('low') ? 'warning' : 'pass',
        details: market.volatility
      }
    ]
  });

  // Entry/Exit checks
  const entryGap = Math.abs((trade.entryPrice - currentPrice) / currentPrice) * 100;
  checklist.push({
    category: 'Entry & Exit',
    items: [
      {
        check: 'Entry price realistic',
        status: entryGap < 2 ? 'pass' : entryGap < 5 ? 'warning' : 'fail',
        details: `${entryGap.toFixed(1)}% from current price ($${currentPrice.toFixed(2)})`
      },
      {
        check: 'Target achievable',
        status: Math.abs(riskReward.potentialGain) < 50 ? 'pass' : 'warning',
        details: `${riskReward.potentialGain.toFixed(1)}% gain target`
      },
      {
        check: 'Clear exit strategy',
        status: trade.targetPrice && trade.stopLoss ? 'pass' : 'warning',
        details: 'Both target and stop defined'
      }
    ]
  });

  return checklist;
}

/**
 * Calculate overall validation score
 */
function calculateValidationScore(
  riskReward: any,
  technical: any,
  market: any,
  checklist: any[]
): number {
  // Weight the different components
  const rrWeight = 0.30; // 30% risk/reward
  const techWeight = 0.35; // 35% technical setup
  const marketWeight = 0.25; // 25% market context
  const checklistWeight = 0.10; // 10% checklist

  // Calculate checklist score
  let checklistScore = 0;
  let totalChecks = 0;
  checklist.forEach(category => {
    category.items.forEach(item => {
      totalChecks++;
      if (item.status === 'pass') checklistScore += 100;
      else if (item.status === 'warning') checklistScore += 60;
      else if (item.status === 'neutral') checklistScore += 50;
      else checklistScore += 0;
    });
  });
  checklistScore = checklistScore / totalChecks;

  const overallScore = (
    riskReward.score * rrWeight +
    technical.score * techWeight +
    market.score * marketWeight +
    checklistScore * checklistWeight
  );

  return Math.round(Math.max(0, Math.min(100, overallScore)));
}

/**
 * Determine trade verdict
 */
function determineVerdict(score: number, direction: 'long' | 'short'): ValidationResult['verdict'] {
  if (score >= 80) {
    return direction === 'long' ? 'strong_buy' : 'strong_sell';
  } else if (score >= 65) {
    return direction === 'long' ? 'buy' : 'sell';
  } else if (score >= 45) {
    return 'hold';
  } else if (score >= 30) {
    return direction === 'long' ? 'sell' : 'buy'; // Counter-signal
  } else {
    return 'avoid';
  }
}

/**
 * Generate AI analysis and recommendations
 */
async function generateTradeAnalysis(
  trade: TradeIdea,
  currentPrice: number,
  riskReward: any,
  technical: any,
  market: any,
  sentiment: any,
  patterns: any[],
  validationScore: number,
  verdict: string
): Promise<ValidationResult['aiAnalysis']> {
  const pros: string[] = [];
  const cons: string[] = [];
  const warnings: string[] = [];

  // Build pros
  if (riskReward.score >= 70) {
    pros.push(`Favorable ${riskReward.ratio.toFixed(2)}:1 risk/reward ratio`);
  }
  if (technical.score >= 70) {
    pros.push('Strong technical setup with aligned indicators');
  }
  if (market.score >= 70) {
    pros.push(`Trade direction aligned with ${market.trend}`);
  }
  if (market.volume.includes('above average')) {
    pros.push('Strong volume supports the move');
  }
  if (sentiment && sentiment.overall >= 70) {
    pros.push(`Positive sentiment (${sentiment.overall}/100)`);
  }
  if (patterns.length > 0) {
    const alignedPatterns = patterns.filter(p =>
      (trade.direction === 'long' && p.implications === 'bullish') ||
      (trade.direction === 'short' && p.implications === 'bearish')
    );
    if (alignedPatterns.length > 0) {
      pros.push(`Bullish patterns detected: ${alignedPatterns[0].name}`);
    }
  }

  // Build cons
  if (riskReward.score < 50) {
    cons.push('Unfavorable risk/reward ratio');
  }
  if (technical.score < 50) {
    cons.push('Weak technical setup with conflicting signals');
  }
  if (market.score < 50) {
    cons.push('Trade against prevailing trend');
  }
  if (Math.abs((trade.entryPrice - currentPrice) / currentPrice) > 0.05) {
    cons.push(`Entry price ${Math.abs((trade.entryPrice - currentPrice) / currentPrice * 100).toFixed(1)}% away from current market`);
  }

  // Build warnings
  if (market.volatility.includes('high')) {
    warnings.push('High volatility increases risk - consider smaller position size');
  }
  if (market.volume.includes('below average')) {
    warnings.push('Low volume may lead to poor execution and slippage');
  }
  if (!trade.positionSize) {
    warnings.push('Position size not specified - ensure proper risk management');
  }
  if (Math.abs(riskReward.potentialLoss) > 5) {
    warnings.push('Potential loss exceeds 5% - review stop loss placement');
  }

  // Generate summary and recommendation
  let summary = '';
  let recommendation = '';

  if (validationScore >= 70) {
    summary = `This ${trade.direction} trade on ${trade.symbol} shows strong potential with a validation score of ${validationScore}/100.`;
    recommendation = `Consider executing this trade with proper risk management. ${verdict === 'strong_buy' || verdict === 'strong_sell' ? 'This is a high-confidence setup.' : 'Monitor entry conditions closely.'}`;
  } else if (validationScore >= 50) {
    summary = `This ${trade.direction} trade on ${trade.symbol} has moderate potential with a validation score of ${validationScore}/100.`;
    recommendation = `This trade has mixed signals. Consider waiting for better confirmation or reducing position size.`;
  } else {
    summary = `This ${trade.direction} trade on ${trade.symbol} shows weak potential with a validation score of ${validationScore}/100.`;
    recommendation = `Avoid this trade. The risk/reward profile and technical setup are not favorable. Look for better opportunities.`;
  }

  // Add default items if empty
  if (pros.length === 0) pros.push('Limited positive factors identified');
  if (cons.length === 0) cons.push('No major concerns identified');
  if (warnings.length === 0) warnings.push('Standard risk management applies');

  return {
    summary,
    pros,
    cons,
    warnings,
    recommendation
  };
}

/**
 * Calculate Simple Moving Average
 */
function calculateSMA(prices: number[]): number {
  if (prices.length === 0) return 0;
  return prices.reduce((sum, price) => sum + price, 0) / prices.length;
}

export type { TradeIdea, ValidationResult };
