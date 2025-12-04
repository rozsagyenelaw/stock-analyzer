/**
 * AI Options Greeks Monitor & Explainer
 *
 * Monitors Greeks in real-time, explains them in plain English,
 * and provides actionable alerts
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface OptionsPosition {
  symbol: string;
  type: 'call' | 'put';
  strike: number;
  expiration: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface GreeksAnalysisInput {
  position: OptionsPosition;
  greeks: Greeks;
  underlyingPrice: number;
  daysToExpiration: number;
  impliedVolatility: number;
}

export interface GreeksAnalysis {
  summary: {
    position: string;
    currentValue: number;
    profitLoss: number;
    profitLossPercent: number;
  };
  greeksExplanation: {
    delta: {
      value: number;
      meaning: string;
      impact: string;
      action: string;
    };
    gamma: {
      value: number;
      meaning: string;
      impact: string;
      action: string;
    };
    theta: {
      value: number;
      dailyDecay: number;
      meaning: string;
      impact: string;
      action: string;
    };
    vega: {
      value: number;
      meaning: string;
      impact: string;
      action: string;
    };
  };
  risks: {
    primary: string[];
    secondary: string[];
    timeDecay: {
      today: number;
      thisWeek: number;
      toExpiration: number;
    };
  };
  opportunities: string[];
  adjustments: {
    recommended: string[];
    hedging: string[];
  };
  alerts: Array<{
    level: 'info' | 'warning' | 'critical';
    message: string;
  }>;
  plainEnglish: string;
}

export async function analyzeGreeks(input: GreeksAnalysisInput): Promise<GreeksAnalysis> {
  try {
    const { position, greeks, underlyingPrice, daysToExpiration, impliedVolatility } = input;

    // Calculate position value and P/L
    const currentValue = position.currentPrice * position.quantity * 100; // Options are per 100 shares
    const entryValue = position.entryPrice * position.quantity * 100;
    const profitLoss = currentValue - entryValue;
    const profitLossPercent = (profitLoss / entryValue) * 100;

    // Calculate time decay impact
    const dailyDecay = greeks.theta * position.quantity * 100;
    const weeklyDecay = dailyDecay * 7;
    const totalDecay = dailyDecay * daysToExpiration;

    // Build context for AI analysis
    const context = buildGreeksContext(input, currentValue, profitLoss, dailyDecay);

    const prompt = `You are an options trading expert. Explain these Greeks in plain English and provide actionable guidance.

${context}

Provide analysis covering:

1. GREEKS EXPLANATION - For each Greek, explain:
   - What it means in simple terms
   - How it affects this specific position
   - What action (if any) to take

2. RISKS - Identify risks:
   - Primary risks (most important)
   - Secondary risks
   - Specific time decay calculations

3. OPPORTUNITIES - Where there's potential upside or edge

4. ADJUSTMENTS - What they could do to improve position:
   - Recommended adjustments
   - Hedging strategies

5. ALERTS - Important warnings:
   - Critical alerts (urgent action needed)
   - Warnings (monitor closely)
   - Info (good to know)

6. PLAIN ENGLISH SUMMARY - Summarize everything in 2-3 sentences for a beginner

Respond in JSON format:
{
  "greeksExplanation": {
    "delta": {
      "meaning": "Simple explanation",
      "impact": "How it affects this position",
      "action": "What to do about it"
    },
    "gamma": {
      "meaning": "Simple explanation",
      "impact": "How it affects this position",
      "action": "What to do about it"
    },
    "theta": {
      "meaning": "Simple explanation",
      "impact": "How it affects this position",
      "action": "What to do about it"
    },
    "vega": {
      "meaning": "Simple explanation",
      "impact": "How it affects this position",
      "action": "What to do about it"
    }
  },
  "risks": {
    "primary": ["risk 1", "risk 2"],
    "secondary": ["risk 1", "risk 2"]
  },
  "opportunities": ["opportunity 1", "opportunity 2"],
  "adjustments": {
    "recommended": ["adjustment 1", "adjustment 2"],
    "hedging": ["hedge 1", "hedge 2"]
  },
  "alerts": [
    {
      "level": "critical|warning|info",
      "message": "Alert message"
    }
  ],
  "plainEnglish": "Simple summary for beginners"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an options trading expert who excels at explaining complex Greeks concepts in plain English while providing actionable guidance.',
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
      summary: {
        position: `${position.quantity} ${position.type} @ $${position.strike}`,
        currentValue,
        profitLoss,
        profitLossPercent,
      },
      greeksExplanation: {
        delta: {
          value: greeks.delta,
          ...aiAnalysis.greeksExplanation.delta,
        },
        gamma: {
          value: greeks.gamma,
          ...aiAnalysis.greeksExplanation.gamma,
        },
        theta: {
          value: greeks.theta,
          dailyDecay,
          ...aiAnalysis.greeksExplanation.theta,
        },
        vega: {
          value: greeks.vega,
          ...aiAnalysis.greeksExplanation.vega,
        },
      },
      risks: {
        ...aiAnalysis.risks,
        timeDecay: {
          today: dailyDecay,
          thisWeek: weeklyDecay,
          toExpiration: totalDecay,
        },
      },
      opportunities: aiAnalysis.opportunities || [],
      adjustments: aiAnalysis.adjustments || { recommended: [], hedging: [] },
      alerts: aiAnalysis.alerts || [],
      plainEnglish: aiAnalysis.plainEnglish || '',
    };
  } catch (error) {
    console.error('Error analyzing Greeks:', error);
    throw error;
  }
}

function buildGreeksContext(
  input: GreeksAnalysisInput,
  currentValue: number,
  profitLoss: number,
  dailyDecay: number
): string {
  const { position, greeks, underlyingPrice, daysToExpiration, impliedVolatility } = input;

  const itm = position.type === 'call'
    ? underlyingPrice > position.strike
    : underlyingPrice < position.strike;
  const moneyness = itm ? 'ITM' : 'OTM';
  const distance = Math.abs(underlyingPrice - position.strike);
  const distancePercent = (distance / position.strike) * 100;

  return `
POSITION:
${position.quantity} ${position.type.toUpperCase()} @ $${position.strike} expiring ${position.expiration}
Entry Price: $${position.entryPrice} per contract
Current Price: $${position.currentPrice} per contract
Position Value: $${currentValue.toFixed(2)}
Profit/Loss: $${profitLoss.toFixed(2)} (${(profitLoss / (position.entryPrice * position.quantity * 100) * 100).toFixed(1)}%)

UNDERLYING:
Current Price: $${underlyingPrice.toFixed(2)}
Strike: $${position.strike}
Moneyness: ${moneyness} (${distancePercent.toFixed(1)}% ${itm ? 'in' : 'out of'} the money)
Days to Expiration: ${daysToExpiration}

GREEKS:
Delta: ${greeks.delta.toFixed(3)} (Position acts like ${Math.abs(greeks.delta * position.quantity * 100).toFixed(0)} shares)
Gamma: ${greeks.gamma.toFixed(3)} (Delta changes by ${greeks.gamma.toFixed(3)} per $1 move)
Theta: ${greeks.theta.toFixed(3)} (Losing $${Math.abs(dailyDecay).toFixed(2)} per day to time decay)
Vega: ${greeks.vega.toFixed(3)} (Position changes $${Math.abs(greeks.vega * position.quantity * 100).toFixed(2)} per 1% IV change)
Rho: ${greeks.rho.toFixed(3)}

IMPLIED VOLATILITY: ${impliedVolatility.toFixed(1)}%

TIME DECAY:
Daily: -$${Math.abs(dailyDecay).toFixed(2)}
This Week: -$${Math.abs(dailyDecay * 7).toFixed(2)}
To Expiration: -$${Math.abs(dailyDecay * daysToExpiration).toFixed(2)}
`;
}

export interface GreeksAlert {
  symbol: string;
  alertType: 'theta_high' | 'delta_shift' | 'vega_risk' | 'expiration_soon';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  action: string;
}

export function generateGreeksAlerts(
  input: GreeksAnalysisInput
): GreeksAlert[] {
  const alerts: GreeksAlert[] = [];
  const { position, greeks, daysToExpiration } = input;

  // High theta decay alert
  const dailyDecay = Math.abs(greeks.theta * position.quantity * 100);
  if (dailyDecay > 50 && daysToExpiration < 14) {
    alerts.push({
      symbol: position.symbol,
      alertType: 'theta_high',
      severity: 'warning',
      message: `High time decay: Losing $${dailyDecay.toFixed(2)} per day`,
      action: 'Consider closing or rolling position to avoid accelerated decay',
    });
  }

  // Critical expiration alert
  if (daysToExpiration <= 7) {
    alerts.push({
      symbol: position.symbol,
      alertType: 'expiration_soon',
      severity: daysToExpiration <= 3 ? 'critical' : 'warning',
      message: `Expiration in ${daysToExpiration} days`,
      action: 'Decide: Close, roll, or exercise?',
    });
  }

  // Delta shift alert (deep ITM or OTM)
  if (Math.abs(greeks.delta) > 0.9) {
    alerts.push({
      symbol: position.symbol,
      alertType: 'delta_shift',
      severity: 'info',
      message: `Deep ${greeks.delta > 0 ? 'ITM' : 'OTM'} - Delta: ${greeks.delta.toFixed(2)}`,
      action: greeks.delta > 0
        ? 'Acting like stock - consider taking profits'
        : 'Unlikely to profit - consider cutting loss',
    });
  }

  // Vega risk alert (high IV)
  if (input.impliedVolatility > 50) {
    alerts.push({
      symbol: position.symbol,
      alertType: 'vega_risk',
      severity: 'warning',
      message: `High IV (${input.impliedVolatility.toFixed(1)}%) - elevated vega risk`,
      action: 'IV drop could significantly hurt position value',
    });
  }

  return alerts;
}
