/**
 * AI Earnings Event Analyzer
 *
 * Analyzes upcoming earnings events for options trading opportunities
 * and risks, including expected moves and IV crush
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EarningsAnalysisInput {
  symbol: string;
  currentPrice: number;
  earningsDate: string;
  daysUntilEarnings: number;
  currentIV: number; // Implied volatility
  historicalMoves: number[]; // Past earnings price moves (percentages)
  optionsData?: {
    atmCallIV: number;
    atmPutIV: number;
    callVolume: number;
    putVolume: number;
  };
}

export interface EarningsAnalysis {
  expectedMove: {
    percentage: number;
    dollarAmount: number;
    upperTarget: number;
    lowerTarget: number;
    confidence: number;
  };
  ivCrush: {
    preEarningsIV: number;
    expectedPostEarningsIV: number;
    ivDropPercentage: number;
    impactOnOptions: string;
  };
  sentiment: {
    overall: 'bullish' | 'bearish' | 'neutral';
    optionsFlowSignal: 'bullish' | 'bearish' | 'neutral';
    putCallRatio: number;
    interpretation: string;
  };
  strategies: {
    recommended: Array<{
      name: string;
      type: 'before' | 'after' | 'straddle';
      description: string;
      risk: 'low' | 'medium' | 'high';
      reward: 'low' | 'medium' | 'high';
      setup: string;
    }>;
  };
  risks: string[];
  opportunities: string[];
  timing: {
    bestEntry: string;
    bestExit: string;
    avoidPeriod?: string;
  };
  historicalContext: string;
  recommendation: string;
}

export async function analyzeEarningsEvent(
  input: EarningsAnalysisInput
): Promise<EarningsAnalysis> {
  try {
    // Calculate expected move from IV
    const expectedMovePercent = calculateExpectedMove(input.currentIV, input.daysUntilEarnings);
    const expectedMoveDollars = input.currentPrice * (expectedMovePercent / 100);

    // Calculate historical average move
    const historicalAverage = input.historicalMoves.length > 0
      ? input.historicalMoves.reduce((sum, move) => sum + Math.abs(move), 0) / input.historicalMoves.length
      : expectedMovePercent;

    // Estimate IV crush
    const postEarningsIV = input.currentIV * 0.6; // Typical 40% IV drop
    const ivDropPercentage = ((input.currentIV - postEarningsIV) / input.currentIV) * 100;

    // Calculate put/call ratio if options data available
    let putCallRatio = 1.0;
    let optionsFlowSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (input.optionsData) {
      putCallRatio = input.optionsData.putVolume / input.optionsData.callVolume;
      if (putCallRatio < 0.7) optionsFlowSignal = 'bullish';
      else if (putCallRatio > 1.3) optionsFlowSignal = 'bearish';
    }

    const context = buildEarningsContext(input, expectedMovePercent, historicalAverage, putCallRatio);

    const prompt = `You are an expert options trader analyzing an earnings event. Provide strategic guidance for trading around this earnings announcement.

${context}

Provide comprehensive analysis covering:

1. STRATEGIES - Recommend 2-3 options strategies:
   - Pre-earnings strategies (directional plays)
   - Post-earnings strategies (volatility plays)
   - Straddle/Strangle strategies
   - For each: describe setup, risk level, reward potential

2. RISKS - Key risks to be aware of:
   - IV crush impact
   - Direction risk
   - Timing risks
   - Liquidity concerns

3. OPPORTUNITIES - Where the edge is:
   - Mispriced options
   - Historical patterns
   - Sentiment divergences

4. TIMING - When to enter and exit:
   - Best entry window
   - Best exit timing
   - Periods to avoid

5. RECOMMENDATION - Overall strategic recommendation

Respond in JSON format:
{
  "sentiment": {
    "overall": "bullish|bearish|neutral",
    "interpretation": "Explanation of market sentiment"
  },
  "strategies": {
    "recommended": [
      {
        "name": "Strategy name",
        "type": "before|after|straddle",
        "description": "What to do",
        "risk": "low|medium|high",
        "reward": "low|medium|high",
        "setup": "Specific setup instructions"
      }
    ]
  },
  "risks": ["risk 1", "risk 2"],
  "opportunities": ["opportunity 1", "opportunity 2"],
  "timing": {
    "bestEntry": "When to enter",
    "bestExit": "When to exit",
    "avoidPeriod": "When to avoid"
  },
  "historicalContext": "Historical pattern analysis",
  "recommendation": "Overall strategic recommendation"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert options trader specializing in earnings plays with deep knowledge of IV crush, expected moves, and earnings strategies.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const aiAnalysis = JSON.parse(response.choices[0].message.content || '{}');

    return {
      expectedMove: {
        percentage: expectedMovePercent,
        dollarAmount: expectedMoveDollars,
        upperTarget: input.currentPrice + expectedMoveDollars,
        lowerTarget: input.currentPrice - expectedMoveDollars,
        confidence: 70, // Based on IV
      },
      ivCrush: {
        preEarningsIV: input.currentIV,
        expectedPostEarningsIV: postEarningsIV,
        ivDropPercentage,
        impactOnOptions: `Options will lose approximately ${ivDropPercentage.toFixed(0)}% of their value due to IV crush, even if stock doesn't move`,
      },
      sentiment: {
        overall: aiAnalysis.sentiment?.overall || 'neutral',
        optionsFlowSignal,
        putCallRatio,
        interpretation: aiAnalysis.sentiment?.interpretation || '',
      },
      strategies: aiAnalysis.strategies || { recommended: [] },
      risks: aiAnalysis.risks || [],
      opportunities: aiAnalysis.opportunities || [],
      timing: aiAnalysis.timing || { bestEntry: '', bestExit: '' },
      historicalContext: aiAnalysis.historicalContext || '',
      recommendation: aiAnalysis.recommendation || '',
    };
  } catch (error) {
    console.error('Error analyzing earnings event:', error);
    throw error;
  }
}

function calculateExpectedMove(iv: number, daysToEarnings: number): number {
  // Expected move formula: IV * sqrt(days/365)
  // Convert IV from percentage to decimal
  const ivDecimal = iv / 100;
  const timeFactorYearly = Math.sqrt(daysToEarnings / 365);
  const expectedMove = ivDecimal * timeFactorYearly * 100;
  return expectedMove;
}

function buildEarningsContext(
  input: EarningsAnalysisInput,
  expectedMove: number,
  historicalAverage: number,
  putCallRatio: number
): string {
  let context = `
EARNINGS EVENT DETAILS:
Symbol: ${input.symbol}
Current Price: $${input.currentPrice.toFixed(2)}
Earnings Date: ${input.earningsDate}
Days Until Earnings: ${input.daysUntilEarnings}

IMPLIED VOLATILITY:
Current IV: ${input.currentIV.toFixed(1)}%
Expected Move: ±${expectedMove.toFixed(1)}% ($${(input.currentPrice * expectedMove / 100).toFixed(2)})
Upper Target: $${(input.currentPrice * (1 + expectedMove/100)).toFixed(2)}
Lower Target: $${(input.currentPrice * (1 - expectedMove/100)).toFixed(2)}

HISTORICAL MOVES:`;

  if (input.historicalMoves.length > 0) {
    context += `\nPast ${input.historicalMoves.length} Earnings Moves: ${input.historicalMoves.map(m => `${m.toFixed(1)}%`).join(', ')}`;
    context += `\nHistorical Average: ±${historicalAverage.toFixed(1)}%`;
    context += `\nCurrent expectation ${expectedMove > historicalAverage ? 'higher' : 'lower'} than historical average`;
  } else {
    context += '\nNo historical data available';
  }

  if (input.optionsData) {
    context += `\n\nOPTIONS FLOW:
ATM Call IV: ${input.optionsData.atmCallIV.toFixed(1)}%
ATM Put IV: ${input.optionsData.atmPutIV.toFixed(1)}%
Call Volume: ${input.optionsData.callVolume.toLocaleString()}
Put Volume: ${input.optionsData.putVolume.toLocaleString()}
Put/Call Ratio: ${putCallRatio.toFixed(2)} ${putCallRatio < 0.7 ? '(Bullish)' : putCallRatio > 1.3 ? '(Bearish)' : '(Neutral)'}`;
  }

  return context;
}

export interface EarningsSurprisePredictor {
  surpriseProbability: number; // 0-100
  direction: 'beat' | 'miss' | 'inline';
  confidence: number;
  factors: string[];
  reasoning: string;
}

export async function predictEarningsSurprise(
  symbol: string,
  recentPerformance: {
    revenueGrowth: number;
    earnings: number;
    guidance?: string;
  }
): Promise<EarningsSurprisePredictor> {
  try {
    const prompt = `Analyze the likelihood of an earnings surprise for ${symbol}.

Recent Performance:
Revenue Growth: ${recentPerformance.revenueGrowth}%
Recent Earnings: $${recentPerformance.earnings}
${recentPerformance.guidance ? `Guidance: ${recentPerformance.guidance}` : ''}

Predict:
1. Probability of earnings surprise (0-100)
2. Direction (beat, miss, inline)
3. Confidence level
4. Key factors influencing prediction

Respond in JSON:
{
  "surpriseProbability": <0-100>,
  "direction": "beat|miss|inline",
  "confidence": <0-100>,
  "factors": ["factor 1", "factor 2"],
  "reasoning": "Explanation"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst expert at predicting earnings surprises based on company performance metrics.',
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
    return result as EarningsSurprisePredictor;
  } catch (error) {
    console.error('Error predicting earnings surprise:', error);
    throw error;
  }
}
