/**
 * Smart Trade Alerts Service
 * AI-powered alert suggestions, multi-condition alerts, and performance tracking
 */

import { getQuote, getTimeSeries } from './twelveData';
import { getAllIndicators } from './indicators';
import { detectAllPatterns } from './ai/patternRecognition';
import { calculateTechnicalSentiment } from './ai/sentimentScoring';
import { generateAIAnalysis } from './aiAnalysis';

export interface AlertSuggestion {
  symbol: string;
  type: 'support' | 'resistance' | 'breakout' | 'breakdown' | 'reversal';
  price: number;
  confidence: number; // 0-100
  timeframe: string;
  reasoning: string;
  conditions: AlertCondition[];
}

export interface AlertCondition {
  type: string;
  operator?: 'AND' | 'OR';
  threshold?: number;
  description: string;
}

export interface AlertTemplate {
  id: string;
  name: string;
  description: string;
  conditions: AlertCondition[];
  category: 'momentum' | 'reversal' | 'breakout' | 'value' | 'risk';
}

export interface AlertPerformance {
  alertId: string;
  symbol: string;
  triggeredAt: string;
  priceAtTrigger: number;
  priceAfter1Day?: number;
  priceAfter1Week?: number;
  accuracy: number; // 0-100
  outcome: 'pending' | 'successful' | 'failed';
}

/**
 * Generate AI-powered alert suggestions for a stock
 */
export async function generateAlertSuggestions(symbol: string): Promise<AlertSuggestion[]> {
  try {
    console.log(`🎯 Generating smart alert suggestions for ${symbol}...`);

    // Get price data and technical indicators
    const [quote, timeSeriesResponse, indicators] = await Promise.all([
      getQuote(symbol),
      getTimeSeries(symbol, '1day', 100),
      getAllIndicators(symbol),
    ]);

    const currentPrice = parseFloat(quote.close);
    const suggestions: AlertSuggestion[] = [];

    if (!timeSeriesResponse?.values || timeSeriesResponse.values.length === 0) {
      throw new Error('Insufficient price data for analysis');
    }

    const timeSeries = timeSeriesResponse.values.map(v => ({
      ...v,
      symbol: timeSeriesResponse.meta.symbol
    }));

    // Detect patterns and sentiment
    const [patterns, sentiment] = await Promise.all([
      detectAllPatterns(timeSeries).catch(() => []),
      calculateTechnicalSentiment(timeSeries).catch(() => null),
    ]);

    // 1. Support/Resistance Levels
    const supportResistance = findSupportResistance(timeSeries, currentPrice);

    supportResistance.support.forEach(level => {
      suggestions.push({
        symbol,
        type: 'support',
        price: level.price,
        confidence: level.confidence,
        timeframe: 'short-term',
        reasoning: `Strong support identified at $${level.price.toFixed(2)} based on ${level.touches} historical touches. Good level for buy alerts.`,
        conditions: [
          { type: 'PRICE_BELOW', threshold: level.price, description: `Price drops to $${level.price.toFixed(2)}` },
          { type: 'RSI_OVERSOLD', operator: 'AND', description: 'RSI oversold (< 30)' }
        ]
      });
    });

    supportResistance.resistance.forEach(level => {
      suggestions.push({
        symbol,
        type: 'resistance',
        price: level.price,
        confidence: level.confidence,
        timeframe: 'short-term',
        reasoning: `Strong resistance at $${level.price.toFixed(2)} based on ${level.touches} historical rejections. Good level for sell/breakout alerts.`,
        conditions: [
          { type: 'PRICE_ABOVE', threshold: level.price, description: `Price breaks above $${level.price.toFixed(2)}` },
          { type: 'VOLUME_SPIKE', operator: 'AND', description: 'Volume spike (2x average)' }
        ]
      });
    });

    // 2. Pattern-based suggestions
    if (patterns.length > 0) {
      patterns.slice(0, 2).forEach(pattern => {
        if (pattern.targetPrice) {
          suggestions.push({
            symbol,
            type: pattern.implications === 'bullish' ? 'breakout' : 'breakdown',
            price: pattern.targetPrice,
            confidence: pattern.confidence,
            timeframe: 'medium-term',
            reasoning: `${pattern.name} pattern detected with ${pattern.confidence}% confidence. Target: $${pattern.targetPrice.toFixed(2)}`,
            conditions: [
              {
                type: pattern.implications === 'bullish' ? 'PRICE_ABOVE' : 'PRICE_BELOW',
                threshold: pattern.targetPrice,
                description: `Price ${pattern.implications === 'bullish' ? 'reaches' : 'falls to'} target $${pattern.targetPrice.toFixed(2)}`
              }
            ]
          });
        }
      });
    }

    // 3. Sentiment-based reversal suggestions
    if (sentiment) {
      if (sentiment.sentiment === 'very_bearish' && sentiment.overall < 30) {
        const reversalPrice = currentPrice * 1.05; // 5% bounce
        suggestions.push({
          symbol,
          type: 'reversal',
          price: reversalPrice,
          confidence: 70,
          timeframe: 'short-term',
          reasoning: `Very bearish sentiment (score: ${sentiment.overall}/100) suggests potential oversold bounce. Alert on reversal signs.`,
          conditions: [
            { type: 'RSI_OVERSOLD', description: 'RSI becomes oversold (< 30)' },
            { type: 'MACD_BULLISH_CROSS', operator: 'AND', description: 'MACD bullish crossover' }
          ]
        });
      } else if (sentiment.sentiment === 'very_bullish' && sentiment.overall > 70) {
        const pullbackPrice = currentPrice * 0.95; // 5% pullback
        suggestions.push({
          symbol,
          type: 'reversal',
          price: pullbackPrice,
          confidence: 70,
          timeframe: 'short-term',
          reasoning: `Very bullish sentiment (score: ${sentiment.overall}/100) suggests potential overbought pullback. Alert on reversal signs.`,
          conditions: [
            { type: 'RSI_OVERBOUGHT', description: 'RSI becomes overbought (> 70)' },
            { type: 'MACD_BEARISH_CROSS', operator: 'AND', description: 'MACD bearish crossover' }
          ]
        });
      }
    }

    // 4. Moving Average crossover suggestions
    const ma = indicators.movingAverages.value as any;
    if (ma.ma50 && ma.ma200) {
      const gap = Math.abs(ma.ma50 - ma.ma200) / ma.ma200;

      // If MAs are close, suggest golden/death cross alert
      if (gap < 0.02) { // Within 2%
        const crossPrice = (ma.ma50 + ma.ma200) / 2;
        suggestions.push({
          symbol,
          type: ma.ma50 > ma.ma200 ? 'breakout' : 'breakdown',
          price: crossPrice,
          confidence: 75,
          timeframe: 'medium-term',
          reasoning: `50 MA and 200 MA are converging (${(gap * 100).toFixed(1)}% apart). Watch for ${ma.ma50 > ma.ma200 ? 'golden' : 'death'} cross signal.`,
          conditions: [
            { type: ma.ma50 > ma.ma200 ? 'GOLDEN_CROSS' : 'DEATH_CROSS', description: `${ma.ma50 > ma.ma200 ? 'Golden' : 'Death'} cross occurs` }
          ]
        });
      }
    }

    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  } catch (error) {
    console.error(`Error generating alert suggestions for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Find support and resistance levels using pivot points and historical touches
 */
function findSupportResistance(
  timeSeries: any[],
  currentPrice: number
): {
  support: Array<{ price: number; touches: number; confidence: number }>;
  resistance: Array<{ price: number; touches: number; confidence: number }>;
} {
  const levels: Map<number, number> = new Map(); // price -> touch count
  const tolerance = 0.02; // 2% tolerance for grouping levels

  // Identify pivot points
  for (let i = 2; i < timeSeries.length - 2; i++) {
    const curr = parseFloat(timeSeries[i].high);
    const prev1 = parseFloat(timeSeries[i - 1].high);
    const prev2 = parseFloat(timeSeries[i - 2].high);
    const next1 = parseFloat(timeSeries[i + 1].high);
    const next2 = parseFloat(timeSeries[i + 2].high);

    // Pivot high (resistance)
    if (curr > prev1 && curr > prev2 && curr > next1 && curr > next2) {
      addLevel(levels, curr, tolerance);
    }

    const currLow = parseFloat(timeSeries[i].low);
    const prev1Low = parseFloat(timeSeries[i - 1].low);
    const prev2Low = parseFloat(timeSeries[i - 2].low);
    const next1Low = parseFloat(timeSeries[i + 1].low);
    const next2Low = parseFloat(timeSeries[i + 2].low);

    // Pivot low (support)
    if (currLow < prev1Low && currLow < prev2Low && currLow < next1Low && currLow < next2Low) {
      addLevel(levels, currLow, tolerance);
    }
  }

  // Convert to arrays and separate support/resistance
  const support = Array.from(levels.entries())
    .filter(([price]) => price < currentPrice)
    .map(([price, touches]) => ({
      price,
      touches,
      confidence: Math.min(50 + touches * 15, 95) // More touches = higher confidence
    }))
    .sort((a, b) => b.price - a.price) // Closest to current price first
    .slice(0, 2);

  const resistance = Array.from(levels.entries())
    .filter(([price]) => price > currentPrice)
    .map(([price, touches]) => ({
      price,
      touches,
      confidence: Math.min(50 + touches * 15, 95)
    }))
    .sort((a, b) => a.price - b.price) // Closest to current price first
    .slice(0, 2);

  return { support, resistance };
}

/**
 * Add or increment a price level with grouping tolerance
 */
function addLevel(levels: Map<number, number>, price: number, tolerance: number): void {
  // Check if similar level exists
  for (const [existingPrice, count] of levels.entries()) {
    if (Math.abs(existingPrice - price) / price < tolerance) {
      levels.set(existingPrice, count + 1);
      return;
    }
  }

  // New level
  levels.set(price, 1);
}

/**
 * Get pre-configured alert templates
 */
export function getAlertTemplates(): AlertTemplate[] {
  return [
    {
      id: 'oversold-bounce',
      name: 'Oversold Bounce',
      description: 'Alert when stock becomes oversold and shows reversal signs',
      category: 'reversal',
      conditions: [
        { type: 'RSI_OVERSOLD', description: 'RSI drops below 30' },
        { type: 'MACD_BULLISH_CROSS', operator: 'AND', description: 'MACD shows bullish crossover' }
      ]
    },
    {
      id: 'overbought-pullback',
      name: 'Overbought Pullback',
      description: 'Alert when stock becomes overbought and may pull back',
      category: 'reversal',
      conditions: [
        { type: 'RSI_OVERBOUGHT', description: 'RSI rises above 70' },
        { type: 'VOLUME_SPIKE', operator: 'AND', description: 'Volume spike detected' }
      ]
    },
    {
      id: 'breakout-confirmation',
      name: 'Breakout Confirmation',
      description: 'Alert on price breakout with volume confirmation',
      category: 'breakout',
      conditions: [
        { type: 'PRICE_ABOVE', description: 'Price breaks resistance' },
        { type: 'VOLUME_SPIKE', operator: 'AND', description: 'Volume 2x average' }
      ]
    },
    {
      id: 'golden-cross',
      name: 'Golden Cross Setup',
      description: 'Alert when 50 MA crosses above 200 MA (bullish)',
      category: 'momentum',
      conditions: [
        { type: 'GOLDEN_CROSS', description: '50 MA crosses above 200 MA' }
      ]
    },
    {
      id: 'death-cross',
      name: 'Death Cross Setup',
      description: 'Alert when 50 MA crosses below 200 MA (bearish)',
      category: 'risk',
      conditions: [
        { type: 'DEATH_CROSS', description: '50 MA crosses below 200 MA' }
      ]
    },
    {
      id: 'momentum-surge',
      name: 'Momentum Surge',
      description: 'Strong upward momentum with volume',
      category: 'momentum',
      conditions: [
        { type: 'MACD_BULLISH_CROSS', description: 'MACD bullish crossover' },
        { type: 'VOLUME_SPIKE', operator: 'AND', description: 'Volume surge' },
        { type: 'RSI_ABOVE_50', operator: 'AND', description: 'RSI above 50' }
      ]
    },
    {
      id: 'support-test',
      name: 'Support Level Test',
      description: 'Alert when price tests key support with oversold conditions',
      category: 'value',
      conditions: [
        { type: 'PRICE_BELOW', description: 'Price at support level' },
        { type: 'RSI_OVERSOLD', operator: 'OR', description: 'RSI oversold' }
      ]
    },
    {
      id: 'earnings-volatility',
      name: 'Earnings Volatility',
      description: 'Alert before earnings with high IV',
      category: 'risk',
      conditions: [
        { type: 'EARNINGS_APPROACHING', description: 'Earnings within 3 days' },
        { type: 'VOLUME_SPIKE', operator: 'AND', description: 'Volume increase' }
      ]
    }
  ];
}

/**
 * Create alerts from a template
 */
export async function createAlertsFromTemplate(
  symbols: string[],
  templateId: string,
  customThresholds?: Record<string, number>
): Promise<{ symbol: string; alertId: string; conditions: AlertCondition[] }[]> {
  const templates = getAlertTemplates();
  const template = templates.find(t => t.id === templateId);

  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  console.log(`📋 Creating alerts from template "${template.name}" for ${symbols.length} symbols...`);

  const results = [];

  for (const symbol of symbols) {
    try {
      // Get current price for price-based conditions
      const quote = await getQuote(symbol);
      const currentPrice = parseFloat(quote.close);

      // Build conditions with thresholds
      const conditions = template.conditions.map(cond => {
        if (cond.type === 'PRICE_ABOVE' || cond.type === 'PRICE_BELOW') {
          // Use custom threshold or suggest based on current price
          const threshold = customThresholds?.[symbol] || currentPrice * 1.05;
          return { ...cond, threshold };
        }
        return cond;
      });

      // Generate a unique alert ID
      const alertId = `${symbol}-${templateId}-${Date.now()}`;

      results.push({
        symbol,
        alertId,
        conditions
      });
    } catch (error) {
      console.error(`Error creating alert for ${symbol}:`, error);
    }
  }

  return results;
}

/**
 * Evaluate multi-condition alerts
 */
export async function evaluateMultiConditionAlert(
  symbol: string,
  conditions: AlertCondition[]
): Promise<{ triggered: boolean; matchedConditions: string[]; failedConditions: string[] }> {
  try {
    const [quote, indicators] = await Promise.all([
      getQuote(symbol),
      getAllIndicators(symbol),
    ]);

    const price = parseFloat(quote.close);
    const results: { condition: string; met: boolean }[] = [];

    for (const condition of conditions) {
      let met = false;

      switch (condition.type) {
        case 'PRICE_ABOVE':
          met = condition.threshold ? price >= condition.threshold : false;
          break;
        case 'PRICE_BELOW':
          met = condition.threshold ? price <= condition.threshold : false;
          break;
        case 'RSI_OVERSOLD':
          met = (indicators.rsi.value as number) <= 30;
          break;
        case 'RSI_OVERBOUGHT':
          met = (indicators.rsi.value as number) >= 70;
          break;
        case 'MACD_BULLISH_CROSS':
          met = indicators.macd.signal === 2;
          break;
        case 'MACD_BEARISH_CROSS':
          met = indicators.macd.signal === -2;
          break;
        case 'GOLDEN_CROSS':
          met = indicators.movingAverages.interpretation.includes('Golden Cross');
          break;
        case 'DEATH_CROSS':
          met = indicators.movingAverages.interpretation.includes('Death Cross');
          break;
        case 'VOLUME_SPIKE':
          const volume = parseFloat(quote.volume);
          const avgVolume = parseFloat(quote.average_volume);
          met = volume >= avgVolume * 2;
          break;
      }

      results.push({ condition: condition.description, met });
    }

    // Determine if alert should trigger based on operators
    let triggered = false;

    if (conditions.length === 1) {
      triggered = results[0].met;
    } else {
      // Handle AND/OR logic
      const hasOr = conditions.some(c => c.operator === 'OR');

      if (hasOr) {
        // At least one condition must be met
        triggered = results.some(r => r.met);
      } else {
        // All conditions must be met (AND logic)
        triggered = results.every(r => r.met);
      }
    }

    return {
      triggered,
      matchedConditions: results.filter(r => r.met).map(r => r.condition),
      failedConditions: results.filter(r => !r.met).map(r => r.condition)
    };
  } catch (error) {
    console.error(`Error evaluating multi-condition alert for ${symbol}:`, error);
    return {
      triggered: false,
      matchedConditions: [],
      failedConditions: conditions.map(c => c.description)
    };
  }
}

export type {
  AlertSuggestion,
  AlertCondition,
  AlertTemplate,
  AlertPerformance
};
