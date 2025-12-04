/**
 * AI Entry/Exit Timing Assistant
 *
 * Analyzes multiple factors to determine optimal entry and exit timing
 * for stock and options trades
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TimingAnalysisInput {
  symbol: string;
  currentPrice: number;
  technicalAnalysis: any;
  sentiment?: any;
  position?: 'none' | 'long' | 'short';
  entryPrice?: number;
  timeframe: '1D' | '1W' | '1M';
}

export interface TimingSignal {
  action: 'strong_buy' | 'buy' | 'wait' | 'sell' | 'strong_sell' | 'hold';
  confidence: number; // 0-100
  urgency: 'immediate' | 'soon' | 'moderate' | 'low';
  reasoning: string;
}

export interface EntryTiming {
  signal: TimingSignal;
  optimalEntryZone: {
    lower: number;
    upper: number;
    ideal: number;
  };
  conditions: string[];
  stopLoss: number;
  targetPrices: number[];
  timeframeAnalysis: {
    shortTerm: string; // 1D
    mediumTerm: string; // 1W
    longTerm: string; // 1M
  };
  catalysts: string[];
  riskFactors: string[];
}

export interface ExitTiming {
  signal: TimingSignal;
  exitRecommendation: 'full' | 'partial' | 'hold' | 'add';
  targetsPriority: {
    target: number;
    probability: number;
    reason: string;
  }[];
  stopLossAdjustment?: {
    current: number;
    suggested: number;
    reason: string;
  };
  profitProtection: string[];
  warnings: string[];
}

export interface TimingRecommendation {
  entry: EntryTiming;
  exit: ExitTiming;
  multiTimeframeAlignment: {
    aligned: boolean;
    score: number; // 0-100
    analysis: string;
  };
  marketConditions: {
    trend: 'strong_uptrend' | 'uptrend' | 'sideways' | 'downtrend' | 'strong_downtrend';
    volatility: 'low' | 'normal' | 'high' | 'extreme';
    volume: 'low' | 'normal' | 'high';
  };
  overallAdvice: string;
  nextCheckIn: string; // When to reassess
}

export async function getEntryExitTiming(
  input: TimingAnalysisInput
): Promise<TimingRecommendation> {
  try {
    const context = buildTimingContext(input);

    const prompt = `You are an expert technical analyst specializing in entry/exit timing. Analyze the following data and provide precise timing recommendations.

STOCK: ${input.symbol}
CURRENT PRICE: $${input.currentPrice}
${input.position !== 'none' ? `CURRENT POSITION: ${input.position} ${input.entryPrice ? `@ $${input.entryPrice}` : ''}` : ''}
PRIMARY TIMEFRAME: ${input.timeframe}

TECHNICAL ANALYSIS:
${context}

Provide a comprehensive timing analysis covering:

FOR ENTRY TIMING:
1. Should they enter now, wait, or avoid?
2. Optimal entry price zone (range of prices)
3. Specific conditions to wait for before entering
4. Stop loss placement
5. Target price levels
6. Analysis across multiple timeframes (1D, 1W, 1M)
7. Upcoming catalysts that could affect timing
8. Risk factors to watch

FOR EXIT TIMING (if in position):
1. Should they exit now, hold, or add to position?
2. Which profit targets to prioritize
3. Stop loss adjustments (trailing stops, etc.)
4. Profit protection strategies
5. Warning signs to watch for

MULTI-TIMEFRAME ANALYSIS:
- Are short, medium, and long-term timeframes aligned?
- What's the probability of success with aligned vs misaligned timeframes?

Respond in JSON format with this structure:
{
  "entry": {
    "signal": {
      "action": "strong_buy|buy|wait|sell|strong_sell|hold",
      "confidence": <0-100>,
      "urgency": "immediate|soon|moderate|low",
      "reasoning": "Explanation"
    },
    "optimalEntryZone": {
      "lower": <number>,
      "upper": <number>,
      "ideal": <number>
    },
    "conditions": ["condition 1", "condition 2"],
    "stopLoss": <number>,
    "targetPrices": [<number>, <number>, <number>],
    "timeframeAnalysis": {
      "shortTerm": "1D analysis",
      "mediumTerm": "1W analysis",
      "longTerm": "1M analysis"
    },
    "catalysts": ["catalyst 1", "catalyst 2"],
    "riskFactors": ["risk 1", "risk 2"]
  },
  "exit": {
    "signal": {
      "action": "strong_sell|sell|hold|wait",
      "confidence": <0-100>,
      "urgency": "immediate|soon|moderate|low",
      "reasoning": "Explanation"
    },
    "exitRecommendation": "full|partial|hold|add",
    "targetsPriority": [
      {
        "target": <number>,
        "probability": <0-100>,
        "reason": "Why this target is likely"
      }
    ],
    "stopLossAdjustment": {
      "current": <number>,
      "suggested": <number>,
      "reason": "Why adjust"
    },
    "profitProtection": ["strategy 1", "strategy 2"],
    "warnings": ["warning 1", "warning 2"]
  },
  "multiTimeframeAlignment": {
    "aligned": <boolean>,
    "score": <0-100>,
    "analysis": "Explanation of alignment across timeframes"
  },
  "marketConditions": {
    "trend": "strong_uptrend|uptrend|sideways|downtrend|strong_downtrend",
    "volatility": "low|normal|high|extreme",
    "volume": "low|normal|high"
  },
  "overallAdvice": "Summary advice for the trader",
  "nextCheckIn": "When to reassess (e.g., 'tomorrow at open', 'in 3 days', 'after earnings')"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert technical analyst with decades of experience in market timing. Provide precise, actionable timing recommendations based on multi-timeframe analysis.',
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
    return result as TimingRecommendation;
  } catch (error) {
    console.error('Error getting entry/exit timing:', error);
    throw error;
  }
}

function buildTimingContext(input: TimingAnalysisInput): string {
  const { technicalAnalysis, sentiment } = input;

  let context = '';

  // Overall signals
  if (technicalAnalysis.composite) {
    context += `\nOverall Signal: ${technicalAnalysis.composite.signal} (Confidence: ${technicalAnalysis.composite.confidence}%)`;
    context += `\nTechnical Score: ${technicalAnalysis.technicalScore}/10`;
  }

  // Current price and momentum
  context += `\nPrice Change: ${technicalAnalysis.change > 0 ? '+' : ''}${technicalAnalysis.change.toFixed(2)} (${technicalAnalysis.changePercent.toFixed(2)}%)`;
  context += `\nVolume: ${technicalAnalysis.volume.toLocaleString()}`;

  // Technical indicators
  if (technicalAnalysis.indicators) {
    const indicators = technicalAnalysis.indicators;

    if (indicators.rsi) {
      context += `\n\nRSI: ${indicators.rsi.interpretation}`;
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

    if (indicators.stochastic) {
      context += `\nStochastic: ${indicators.stochastic.interpretation}`;
    }

    if (indicators.atr) {
      context += `\nATR (Volatility): ${indicators.atr.interpretation}`;
    }

    if (indicators.volume) {
      context += `\nVolume Analysis: ${indicators.volume.interpretation}`;
    }
  }

  // Price targets if available
  if (technicalAnalysis.priceTargets) {
    context += `\n\nPrice Targets:`;
    context += `\nEntry: $${technicalAnalysis.priceTargets.entry.toFixed(2)}`;
    context += `\nStop Loss: $${technicalAnalysis.priceTargets.stopLoss.toFixed(2)}`;
    context += `\nTake Profit 1: $${technicalAnalysis.priceTargets.takeProfit1.toFixed(2)}`;
    context += `\nTake Profit 2: $${technicalAnalysis.priceTargets.takeProfit2.toFixed(2)}`;
  }

  // Warnings
  if (technicalAnalysis.warnings && technicalAnalysis.warnings.length > 0) {
    context += `\n\nWarnings:`;
    technicalAnalysis.warnings.forEach((warning: string) => {
      context += `\n- ${warning}`;
    });
  }

  // Sentiment if available
  if (sentiment) {
    context += `\n\nSentiment: ${sentiment.overall || 'N/A'}`;
  }

  return context;
}
