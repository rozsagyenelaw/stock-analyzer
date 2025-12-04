/**
 * AI Risk Assessment & Position Sizing
 *
 * Calculates optimal position sizes based on portfolio risk,
 * volatility, and individual risk tolerance
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface RiskAssessmentInput {
  symbol: string;
  currentPrice: number;
  stopLoss: number;
  portfolioValue: number;
  riskPerTrade: number; // Percentage (e.g., 2 = 2% risk per trade)
  technicalAnalysis: any;
  existingPositions?: {
    symbol: string;
    shares: number;
    avgCost: number;
  }[];
  cashAvailable: number;
}

export interface PositionSizing {
  recommendedShares: number;
  recommendedDollarAmount: number;
  riskAmount: number; // Dollar amount at risk
  riskPercentage: number; // Of portfolio
  maxShares: number; // Based on available cash
  positionPercentage: number; // Of portfolio
  stopLossDistance: {
    dollars: number;
    percentage: number;
  };
}

export interface RiskMetrics {
  riskRewardRatio: number;
  probabilityOfProfit: number;
  expectedValue: number;
  sharpeRatioEstimate?: number;
  volatilityScore: number; // 0-100
  correlationRisk?: string;
}

export interface DiversificationAnalysis {
  concentrated: boolean;
  sectorExposure: {
    sector: string;
    percentage: number;
  }[];
  warnings: string[];
  recommendations: string[];
}

export interface RiskAssessment {
  positionSizing: PositionSizing;
  riskMetrics: RiskMetrics;
  diversification: DiversificationAnalysis;
  riskLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  warnings: string[];
  advice: string[];
  scenarioAnalysis: {
    bestCase: {
      profit: number;
      percentage: number;
      description: string;
    };
    expectedCase: {
      profit: number;
      percentage: number;
      description: string;
    };
    worstCase: {
      loss: number;
      percentage: number;
      description: string;
    };
  };
  capitalPreservation: string[];
}

export async function getRiskAssessment(
  input: RiskAssessmentInput
): Promise<RiskAssessment> {
  try {
    // Calculate position sizing using standard formulas
    const positionSizing = calculatePositionSize(input);

    // Build context for AI analysis
    const context = buildRiskContext(input, positionSizing);

    const prompt = `You are an expert risk management advisor specializing in position sizing and portfolio risk. Analyze the following trade setup and provide comprehensive risk assessment.

TRADE SETUP:
Symbol: ${input.symbol}
Entry Price: $${input.currentPrice}
Stop Loss: $${input.stopLoss}
Portfolio Value: $${input.portfolioValue.toLocaleString()}
Risk Per Trade: ${input.riskPerTrade}%
Cash Available: $${input.cashAvailable.toLocaleString()}

CALCULATED POSITION SIZING:
Recommended Shares: ${positionSizing.recommendedShares}
Dollar Amount: $${positionSizing.recommendedDollarAmount.toFixed(2)}
Risk Amount: $${positionSizing.riskAmount.toFixed(2)}
Position % of Portfolio: ${positionSizing.positionPercentage.toFixed(2)}%
Stop Loss Distance: ${positionSizing.stopLossDistance.percentage.toFixed(2)}%

${input.existingPositions && input.existingPositions.length > 0 ? `
EXISTING POSITIONS:
${input.existingPositions.map(p => `${p.symbol}: ${p.shares} shares @ $${p.avgCost}`).join('\n')}
` : ''}

TECHNICAL ANALYSIS:
${context}

Provide a comprehensive risk assessment covering:

1. RISK METRICS:
   - Risk/Reward ratio
   - Probability of profit (based on technical setup)
   - Expected value of the trade
   - Volatility score (0-100)
   - Correlation risk with existing positions

2. DIVERSIFICATION:
   - Is the portfolio too concentrated?
   - Sector exposure analysis
   - Warnings about concentration
   - Diversification recommendations

3. RISK LEVEL:
   - Overall risk classification (very_low to very_high)
   - Specific warnings about this trade
   - Risk mitigation advice

4. SCENARIO ANALYSIS:
   - Best case: If trade goes perfectly (realistic target)
   - Expected case: Most likely outcome
   - Worst case: If stop loss is hit

5. CAPITAL PRESERVATION:
   - Strategies to protect capital
   - Position management tips
   - Exit strategies

Respond in JSON format with this structure:
{
  "positionSizing": ${JSON.stringify(positionSizing)},
  "riskMetrics": {
    "riskRewardRatio": <number>,
    "probabilityOfProfit": <0-100>,
    "expectedValue": <number>,
    "volatilityScore": <0-100>,
    "correlationRisk": "description if applicable"
  },
  "diversification": {
    "concentrated": <boolean>,
    "sectorExposure": [
      {
        "sector": "sector name",
        "percentage": <number>
      }
    ],
    "warnings": ["warning 1", "warning 2"],
    "recommendations": ["recommendation 1", "recommendation 2"]
  },
  "riskLevel": "very_low|low|moderate|high|very_high",
  "warnings": ["warning 1", "warning 2"],
  "advice": ["advice 1", "advice 2"],
  "scenarioAnalysis": {
    "bestCase": {
      "profit": <number>,
      "percentage": <number>,
      "description": "What happens in best case"
    },
    "expectedCase": {
      "profit": <number>,
      "percentage": <number>,
      "description": "Most likely outcome"
    },
    "worstCase": {
      "loss": <number>,
      "percentage": <number>,
      "description": "What happens if stop loss hit"
    }
  },
  "capitalPreservation": ["strategy 1", "strategy 2"]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert risk management advisor with deep knowledge of position sizing, portfolio construction, and capital preservation. Provide practical, conservative risk assessments.',
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
    return result as RiskAssessment;
  } catch (error) {
    console.error('Error getting risk assessment:', error);
    throw error;
  }
}

function calculatePositionSize(input: RiskAssessmentInput): PositionSizing {
  const {
    currentPrice,
    stopLoss,
    portfolioValue,
    riskPerTrade,
    cashAvailable,
  } = input;

  // Calculate stop loss distance
  const stopLossDistance = Math.abs(currentPrice - stopLoss);
  const stopLossPercentage = (stopLossDistance / currentPrice) * 100;

  // Calculate risk amount in dollars
  const riskAmount = (portfolioValue * riskPerTrade) / 100;

  // Calculate number of shares based on risk
  // Risk per share = stop loss distance
  // Number of shares = Total risk amount / Risk per share
  const recommendedShares = Math.floor(riskAmount / stopLossDistance);

  // Calculate dollar amount
  const recommendedDollarAmount = recommendedShares * currentPrice;

  // Calculate max shares based on available cash
  const maxShares = Math.floor(cashAvailable / currentPrice);

  // Calculate position as percentage of portfolio
  const positionPercentage = (recommendedDollarAmount / portfolioValue) * 100;

  // Adjust if recommended position exceeds available cash
  const finalShares = Math.min(recommendedShares, maxShares);
  const finalDollarAmount = finalShares * currentPrice;
  const finalPositionPercentage = (finalDollarAmount / portfolioValue) * 100;
  const actualRiskAmount = finalShares * stopLossDistance;
  const actualRiskPercentage = (actualRiskAmount / portfolioValue) * 100;

  return {
    recommendedShares: finalShares,
    recommendedDollarAmount: finalDollarAmount,
    riskAmount: actualRiskAmount,
    riskPercentage: actualRiskPercentage,
    maxShares,
    positionPercentage: finalPositionPercentage,
    stopLossDistance: {
      dollars: stopLossDistance,
      percentage: stopLossPercentage,
    },
  };
}

function buildRiskContext(
  input: RiskAssessmentInput,
  positionSizing: PositionSizing
): string {
  const { technicalAnalysis } = input;

  let context = '';

  if (technicalAnalysis.composite) {
    context += `\nSignal: ${technicalAnalysis.composite.signal} (Confidence: ${technicalAnalysis.composite.confidence}%)`;
  }

  if (technicalAnalysis.indicators) {
    const indicators = technicalAnalysis.indicators;

    if (indicators.atr) {
      context += `\nVolatility (ATR): ${indicators.atr.interpretation}`;
    }

    if (indicators.bollingerBands) {
      context += `\nBollinger Bands: ${indicators.bollingerBands.interpretation}`;
    }

    if (indicators.volume) {
      context += `\nVolume: ${indicators.volume.interpretation}`;
    }
  }

  if (technicalAnalysis.warnings && technicalAnalysis.warnings.length > 0) {
    context += `\n\nTechnical Warnings:`;
    technicalAnalysis.warnings.forEach((warning: string) => {
      context += `\n- ${warning}`;
    });
  }

  return context;
}
