/**
 * AI Options Strategy Recommender
 *
 * Analyzes market conditions and suggests optimal options strategies
 * based on technical analysis, volatility, and market outlook
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface OptionsStrategyInput {
  symbol: string;
  currentPrice: number;
  outlook: 'bullish' | 'bearish' | 'neutral';
  ivRank?: number; // 0-100, implied volatility rank
  ivPercentile?: number; // 0-100
  technicalAnalysis: any;
  daysToEarnings?: number;
  timeHorizon: '1week' | '1month' | '3months' | '6months';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
}

export interface OptionsStrategy {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral' | 'volatility';
  description: string;
  legs: StrategyLeg[];
  maxProfit: string;
  maxLoss: string;
  breakeven: string[];
  probabilityOfProfit: number;
  capitalRequired: string;
  bestFor: string[];
  risks: string[];
  entryConditions: string[];
  exitConditions: string[];
}

export interface StrategyLeg {
  action: 'buy' | 'sell';
  type: 'call' | 'put' | 'stock';
  strike?: number;
  expiration?: string;
  quantity: number;
}

export interface OptionsStrategyRecommendation {
  recommendedStrategy: OptionsStrategy;
  alternativeStrategies: OptionsStrategy[];
  marketContext: {
    volatilityEnvironment: 'low' | 'normal' | 'high' | 'extreme';
    trendStrength: 'weak' | 'moderate' | 'strong';
    marketRegime: 'trending' | 'rangebound' | 'volatile';
    ivAnalysis: string;
  };
  reasoning: string;
  warnings: string[];
  educationalNotes: string[];
}

export async function getOptionsStrategyRecommendation(
  input: OptionsStrategyInput
): Promise<OptionsStrategyRecommendation> {
  try {
    // Build comprehensive context for GPT-4
    const context = buildStrategyContext(input);

    const prompt = `You are an expert options trading strategist. Analyze the following market conditions and recommend the best options strategy.

STOCK: ${input.symbol}
CURRENT PRICE: $${input.currentPrice}
OUTLOOK: ${input.outlook}
TIME HORIZON: ${input.timeHorizon}
RISK TOLERANCE: ${input.riskTolerance}
${input.ivRank ? `IV RANK: ${input.ivRank}` : ''}
${input.ivPercentile ? `IV PERCENTILE: ${input.ivPercentile}` : ''}
${input.daysToEarnings ? `DAYS TO EARNINGS: ${input.daysToEarnings}` : ''}

TECHNICAL ANALYSIS:
${context}

Based on this analysis, provide:
1. The BEST options strategy for this situation
2. 2-3 alternative strategies
3. Detailed reasoning for each recommendation
4. Specific entry and exit conditions
5. Risk warnings
6. Educational notes for the trader

Consider:
- IV rank/percentile (high IV = sell premium, low IV = buy options)
- Earnings proximity (avoid long options near earnings if IV crush expected)
- Trend strength (trending = directional, rangebound = neutral strategies)
- Risk tolerance (conservative = defined risk, aggressive = undefined risk OK)
- Time horizon (shorter = closer expirations, longer = further out)

Respond in JSON format with this structure:
{
  "recommendedStrategy": {
    "name": "Strategy name (e.g., Bull Put Spread, Iron Condor)",
    "type": "bullish|bearish|neutral|volatility",
    "description": "Brief description",
    "legs": [
      {
        "action": "buy|sell",
        "type": "call|put|stock",
        "strike": <number or null>,
        "expiration": "date string or relative (e.g., '30 days')",
        "quantity": <number>
      }
    ],
    "maxProfit": "Dollar amount or description",
    "maxLoss": "Dollar amount or description",
    "breakeven": ["price level(s)"],
    "probabilityOfProfit": <0-100>,
    "capitalRequired": "Dollar amount estimate",
    "bestFor": ["condition 1", "condition 2"],
    "risks": ["risk 1", "risk 2"],
    "entryConditions": ["condition 1", "condition 2"],
    "exitConditions": ["condition 1", "condition 2"]
  },
  "alternativeStrategies": [
    // 2-3 alternative strategies with same structure
  ],
  "marketContext": {
    "volatilityEnvironment": "low|normal|high|extreme",
    "trendStrength": "weak|moderate|strong",
    "marketRegime": "trending|rangebound|volatile",
    "ivAnalysis": "Analysis of implied volatility conditions"
  },
  "reasoning": "Detailed explanation of why this strategy is recommended",
  "warnings": ["warning 1", "warning 2"],
  "educationalNotes": ["educational tip 1", "educational tip 2"]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert options trading strategist with deep knowledge of various options strategies, Greeks, and market conditions. Provide practical, actionable recommendations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as OptionsStrategyRecommendation;
  } catch (error) {
    console.error('Error getting options strategy recommendation:', error);
    throw error;
  }
}

function buildStrategyContext(input: OptionsStrategyInput): string {
  const { technicalAnalysis } = input;

  let context = '';

  if (technicalAnalysis.composite) {
    context += `\nOverall Signal: ${technicalAnalysis.composite.signal} (Confidence: ${technicalAnalysis.composite.confidence}%)`;
    context += `\nTechnical Score: ${technicalAnalysis.technicalScore}/10`;
  }

  if (technicalAnalysis.indicators) {
    const indicators = technicalAnalysis.indicators;

    if (indicators.rsi) {
      context += `\nRSI: ${indicators.rsi.interpretation}`;
    }

    if (indicators.macd) {
      context += `\nMACD: ${indicators.macd.interpretation}`;
    }

    if (indicators.movingAverages) {
      context += `\nMoving Averages: ${indicators.movingAverages.interpretation}`;
    }

    if (indicators.bollingerBands) {
      context += `\nBollinger Bands: ${indicators.bollingerBands.interpretation}`;
    }

    if (indicators.atr) {
      context += `\nATR (Volatility): ${indicators.atr.interpretation}`;
    }
  }

  return context;
}
