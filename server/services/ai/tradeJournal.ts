/**
 * AI Trade Journal with Pattern Recognition
 *
 * Analyzes trading history to identify patterns, strengths, weaknesses,
 * and provides personalized recommendations
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface Trade {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  entryDate: string;
  exitDate?: string;
  shares: number;
  strategyTag?: string;
  notes?: string;
  profitLoss?: number;
  profitLossPercent?: number;
  status: 'open' | 'closed';
}

export interface TradeAnalysis {
  summary: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    averageWin: number;
    averageLoss: number;
    profitFactor: number;
    totalProfitLoss: number;
    largestWin: number;
    largestLoss: number;
  };
  patterns: {
    winningPatterns: string[];
    losingPatterns: string[];
    bestStrategies: string[];
    worstStrategies: string[];
    bestTimeframes: string[];
    bestMarketConditions: string[];
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  insights: string[];
  nextSteps: string[];
}

export async function analyzeTradeHistory(trades: Trade[]): Promise<TradeAnalysis> {
  try {
    // Calculate statistics
    const closedTrades = trades.filter(t => t.status === 'closed' && t.profitLoss !== undefined);
    const winningTrades = closedTrades.filter(t => t.profitLoss! > 0);
    const losingTrades = closedTrades.filter(t => t.profitLoss! < 0);

    const totalProfitLoss = closedTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const averageWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.profitLoss!, 0) / winningTrades.length
      : 0;
    const averageLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.profitLoss!, 0) / losingTrades.length)
      : 0;

    const totalWins = winningTrades.reduce((sum, t) => sum + t.profitLoss!, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.profitLoss!, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    const largestWin = winningTrades.length > 0
      ? Math.max(...winningTrades.map(t => t.profitLoss!))
      : 0;
    const largestLoss = losingTrades.length > 0
      ? Math.min(...losingTrades.map(t => t.profitLoss!))
      : 0;

    const summary = {
      totalTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
      averageWin,
      averageLoss,
      profitFactor,
      totalProfitLoss,
      largestWin,
      largestLoss,
    };

    // Build context for AI analysis
    const context = buildJournalContext(trades, summary);

    const prompt = `You are an expert trading coach analyzing a trader's performance. Review their trade history and provide actionable insights.

TRADING STATISTICS:
Total Trades: ${summary.totalTrades}
Win Rate: ${summary.winRate.toFixed(1)}%
Winning Trades: ${summary.winningTrades}
Losing Trades: ${summary.losingTrades}
Average Win: $${summary.averageWin.toFixed(2)}
Average Loss: $${summary.averageLoss.toFixed(2)}
Profit Factor: ${profitFactor === Infinity ? 'Perfect (no losses)' : profitFactor.toFixed(2)}
Total P/L: $${summary.totalProfitLoss.toFixed(2)}
Largest Win: $${summary.largestWin.toFixed(2)}
Largest Loss: $${summary.largestLoss.toFixed(2)}

TRADE DETAILS:
${context}

Analyze this trading history and provide:

1. PATTERNS - Identify specific patterns in winning vs losing trades:
   - What conditions lead to wins? (e.g., "Wins occur mostly in tech stocks during uptrends")
   - What conditions lead to losses? (e.g., "Losses happen when entering against the trend")
   - Best performing strategies
   - Worst performing strategies
   - Best timeframes or market conditions

2. STRENGTHS - What is this trader doing well? (2-3 specific strengths)

3. WEAKNESSES - What needs improvement? (2-3 specific weaknesses)

4. RECOMMENDATIONS - Actionable advice to improve performance (3-4 recommendations)

5. INSIGHTS - Deeper psychological or technical insights about their trading (2-3 insights)

6. NEXT STEPS - Immediate actions to take (2-3 concrete steps)

Be specific, data-driven, and actionable. Reference actual trades when possible.

Respond in JSON format:
{
  "patterns": {
    "winningPatterns": ["pattern 1", "pattern 2"],
    "losingPatterns": ["pattern 1", "pattern 2"],
    "bestStrategies": ["strategy 1"],
    "worstStrategies": ["strategy 1"],
    "bestTimeframes": ["timeframe 1"],
    "bestMarketConditions": ["condition 1"]
  },
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "insights": ["insight 1", "insight 2"],
  "nextSteps": ["step 1", "step 2"]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert trading coach with decades of experience helping traders improve their performance through data-driven analysis.',
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
      summary,
      ...aiAnalysis,
    };
  } catch (error) {
    console.error('Error analyzing trade history:', error);
    throw error;
  }
}

function buildJournalContext(trades: Trade[], summary: any): string {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.profitLoss !== undefined);

  if (closedTrades.length === 0) {
    return 'No closed trades yet.';
  }

  // Group by strategy
  const byStrategy: Record<string, { wins: number; losses: number; pnl: number }> = {};
  closedTrades.forEach(trade => {
    const strategy = trade.strategyTag || 'Untagged';
    if (!byStrategy[strategy]) {
      byStrategy[strategy] = { wins: 0, losses: 0, pnl: 0 };
    }
    byStrategy[strategy].pnl += trade.profitLoss || 0;
    if (trade.profitLoss! > 0) {
      byStrategy[strategy].wins++;
    } else {
      byStrategy[strategy].losses++;
    }
  });

  let context = '\nBy Strategy:\n';
  Object.entries(byStrategy).forEach(([strategy, stats]) => {
    const winRate = ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1);
    context += `${strategy}: ${stats.wins}W/${stats.losses}L (${winRate}% win rate), P/L: $${stats.pnl.toFixed(2)}\n`;
  });

  // Show recent trades
  context += '\nRecent Trades:\n';
  closedTrades.slice(-10).forEach(trade => {
    const result = trade.profitLoss! > 0 ? 'WIN' : 'LOSS';
    context += `${trade.symbol} ${trade.direction}: ${result} $${trade.profitLoss!.toFixed(2)} (${trade.profitLossPercent!.toFixed(1)}%)`;
    if (trade.strategyTag) context += ` [${trade.strategyTag}]`;
    if (trade.notes) context += ` - ${trade.notes}`;
    context += '\n';
  });

  return context;
}

export async function getTradeRecommendation(
  proposedTrade: {
    symbol: string;
    direction: 'long' | 'short';
    entryPrice: number;
    strategyTag?: string;
  },
  tradeHistory: Trade[]
): Promise<{
  shouldTake: boolean;
  confidence: number;
  reasoning: string;
  similarTrades: { outcome: string; profitLoss: number }[];
  warnings: string[];
  advice: string[];
}> {
  try {
    // Find similar trades in history
    const similarTrades = tradeHistory
      .filter(t =>
        t.status === 'closed' &&
        t.symbol === proposedTrade.symbol &&
        t.direction === proposedTrade.direction
      )
      .slice(-5);

    const context = `
PROPOSED TRADE:
Symbol: ${proposedTrade.symbol}
Direction: ${proposedTrade.direction}
Entry Price: $${proposedTrade.entryPrice}
Strategy: ${proposedTrade.strategyTag || 'None'}

SIMILAR PAST TRADES:
${similarTrades.length > 0
  ? similarTrades.map(t =>
      `${t.symbol} ${t.direction}: ${t.profitLoss! > 0 ? 'WIN' : 'LOSS'} $${t.profitLoss!.toFixed(2)}`
    ).join('\n')
  : 'No similar trades found'
}

OVERALL TRADING STATS:
Total Trades: ${tradeHistory.filter(t => t.status === 'closed').length}
Win Rate: ${calculateWinRate(tradeHistory).toFixed(1)}%
`;

    const prompt = `Based on this trader's history, should they take this proposed trade?

${context}

Provide:
1. Should they take this trade? (yes/no)
2. Confidence level (0-100)
3. Detailed reasoning
4. Warnings about potential risks
5. Advice for executing this trade

Respond in JSON format:
{
  "shouldTake": <boolean>,
  "confidence": <0-100>,
  "reasoning": "Explanation",
  "warnings": ["warning 1", "warning 2"],
  "advice": ["advice 1", "advice 2"]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a trading coach helping a trader make better decisions based on their historical performance.',
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

    return {
      ...result,
      similarTrades: similarTrades.map(t => ({
        outcome: t.profitLoss! > 0 ? 'WIN' : 'LOSS',
        profitLoss: t.profitLoss!,
      })),
    };
  } catch (error) {
    console.error('Error getting trade recommendation:', error);
    throw error;
  }
}

function calculateWinRate(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.profitLoss !== undefined);
  if (closedTrades.length === 0) return 0;
  const wins = closedTrades.filter(t => t.profitLoss! > 0).length;
  return (wins / closedTrades.length) * 100;
}
