/**
 * Trade Comparison Service
 * Provides side-by-side analysis and comparison of multiple trade opportunities
 */

import { generateAIAnalysis } from './aiAnalysis';

export interface TradeToCompare {
  id: string;
  symbol: string;
  name?: string;
  type: 'stock' | 'option';
  strategy: string;

  // Entry details
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;

  // Risk/Reward metrics
  potentialGain: number; // %
  potentialLoss: number; // %
  riskReward: number;
  probabilityOfSuccess?: number;

  // Capital requirements
  capitalRequired: number;
  positionSize?: number;

  // Timing
  timeframe: string;
  urgency?: 'high' | 'medium' | 'low';

  // Analysis scores
  technicalScore?: number;
  fundamentalScore?: number;
  aiScore?: number;

  // Context
  keyFactors?: string[];
  risks?: string[];
  catalysts?: string[];
}

export interface ComparisonResult {
  trades: TradeToCompare[];
  scoreMatrix: {
    tradeId: string;
    symbol: string;
    scores: {
      riskReward: number;        // 0-100
      capitalEfficiency: number; // 0-100
      technicalSetup: number;    // 0-100
      timing: number;            // 0-100
      overall: number;           // 0-100
    };
  }[];
  ranking: {
    rank: number;
    tradeId: string;
    symbol: string;
    totalScore: number;
    strengths: string[];
    weaknesses: string[];
  }[];
  aiAnalysis: {
    summary: string;
    recommendation: string;
    reasoning: string;
    considerations: string[];
  };
  timestamp: string;
}

/**
 * Compare multiple trades side-by-side
 */
export async function compareTrades(trades: TradeToCompare[]): Promise<ComparisonResult> {
  if (trades.length < 2) {
    throw new Error('Need at least 2 trades to compare');
  }

  if (trades.length > 4) {
    throw new Error('Can compare maximum 4 trades at once');
  }

  console.log(`📊 Comparing ${trades.length} trades: ${trades.map(t => t.symbol).join(', ')}`);

  // Calculate scoring matrix
  const scoreMatrix = trades.map(trade => ({
    tradeId: trade.id,
    symbol: trade.symbol,
    scores: calculateScores(trade, trades),
  }));

  // Rank trades by overall score
  const ranking = scoreMatrix
    .map((item, index) => ({
      rank: 0, // Will be set after sorting
      tradeId: item.tradeId,
      symbol: item.symbol,
      totalScore: item.scores.overall,
      strengths: identifyStrengths(trades[index], item.scores),
      weaknesses: identifyWeaknesses(trades[index], item.scores),
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  // Generate AI analysis
  const aiAnalysis = await generateComparisonAnalysis(trades, scoreMatrix, ranking);

  return {
    trades,
    scoreMatrix,
    ranking,
    aiAnalysis,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Calculate normalized scores for a trade
 */
function calculateScores(trade: TradeToCompare, allTrades: TradeToCompare[]): {
  riskReward: number;
  capitalEfficiency: number;
  technicalSetup: number;
  timing: number;
  overall: number;
} {
  // Risk/Reward Score (0-100)
  // Higher R/R ratio is better
  const maxRR = Math.max(...allTrades.map(t => Math.abs(t.riskReward)));
  const minRR = Math.min(...allTrades.map(t => Math.abs(t.riskReward)));
  const rrScore = maxRR > minRR
    ? ((Math.abs(trade.riskReward) - minRR) / (maxRR - minRR)) * 100
    : 50;

  // Capital Efficiency Score (0-100)
  // Lower capital required + higher potential gain = better
  const efficiency = trade.potentialGain / (trade.capitalRequired / 1000);
  const maxEfficiency = Math.max(...allTrades.map(t => t.potentialGain / (t.capitalRequired / 1000)));
  const minEfficiency = Math.min(...allTrades.map(t => t.potentialGain / (t.capitalRequired / 1000)));
  const capitalScore = maxEfficiency > minEfficiency
    ? ((efficiency - minEfficiency) / (maxEfficiency - minEfficiency)) * 100
    : 50;

  // Technical Setup Score (0-100)
  const technicalScore = trade.technicalScore || trade.aiScore || 50;

  // Timing Score (0-100)
  let timingScore = 50;
  if (trade.urgency === 'high') timingScore = 80;
  else if (trade.urgency === 'medium') timingScore = 60;
  else if (trade.urgency === 'low') timingScore = 40;

  // Adjust for probability of success if available
  if (trade.probabilityOfSuccess) {
    timingScore = (timingScore + trade.probabilityOfSuccess) / 2;
  }

  // Overall Score (weighted average)
  const overall = (
    rrScore * 0.35 +           // 35% weight on risk/reward
    capitalScore * 0.25 +      // 25% weight on capital efficiency
    technicalScore * 0.30 +    // 30% weight on technical setup
    timingScore * 0.10         // 10% weight on timing
  );

  return {
    riskReward: Math.round(rrScore),
    capitalEfficiency: Math.round(capitalScore),
    technicalSetup: Math.round(technicalScore),
    timing: Math.round(timingScore),
    overall: Math.round(overall),
  };
}

/**
 * Identify strengths based on scores
 */
function identifyStrengths(trade: TradeToCompare, scores: any): string[] {
  const strengths: string[] = [];

  if (scores.riskReward >= 80) {
    strengths.push(`Excellent risk/reward ratio of ${Math.abs(trade.riskReward).toFixed(2)}:1`);
  }

  if (scores.capitalEfficiency >= 80) {
    strengths.push(`High capital efficiency (${trade.potentialGain.toFixed(1)}% potential with $${trade.capitalRequired.toLocaleString()} required)`);
  }

  if (scores.technicalSetup >= 80) {
    strengths.push('Strong technical setup');
  }

  if (scores.timing >= 80) {
    strengths.push('Optimal entry timing');
  }

  if (trade.potentialGain >= 20) {
    strengths.push(`High profit potential (+${trade.potentialGain.toFixed(1)}%)`);
  }

  if (Math.abs(trade.potentialLoss) <= 5) {
    strengths.push('Limited downside risk');
  }

  return strengths.length > 0 ? strengths : ['Meets basic criteria'];
}

/**
 * Identify weaknesses based on scores
 */
function identifyWeaknesses(trade: TradeToCompare, scores: any): string[] {
  const weaknesses: string[] = [];

  if (scores.riskReward < 40) {
    weaknesses.push('Poor risk/reward ratio');
  }

  if (scores.capitalEfficiency < 40) {
    weaknesses.push('Low capital efficiency - large investment for modest returns');
  }

  if (scores.technicalSetup < 40) {
    weaknesses.push('Weak technical setup');
  }

  if (trade.capitalRequired > 50000) {
    weaknesses.push('Requires significant capital');
  }

  if (Math.abs(trade.potentialLoss) > 15) {
    weaknesses.push(`High downside risk (${trade.potentialLoss.toFixed(1)}%)`);
  }

  if (trade.potentialGain < 10) {
    weaknesses.push('Limited profit potential');
  }

  return weaknesses.length > 0 ? weaknesses : ['No major weaknesses identified'];
}

/**
 * Generate AI analysis comparing the trades
 */
async function generateComparisonAnalysis(
  trades: TradeToCompare[],
  scoreMatrix: any[],
  ranking: any[]
): Promise<{
  summary: string;
  recommendation: string;
  reasoning: string;
  considerations: string[];
}> {
  try {
    const topRanked = ranking[0];
    const topTrade = trades.find(t => t.id === topRanked.tradeId)!;

    const prompt = `You are an expert trading analyst. Compare these ${trades.length} trade opportunities and provide a recommendation.

TRADES:
${trades.map((trade, i) => `
${i + 1}. ${trade.symbol} - ${trade.strategy}
   Type: ${trade.type}
   Entry: $${trade.entryPrice}
   Target: $${trade.targetPrice} (+${trade.potentialGain.toFixed(1)}%)
   Stop: $${trade.stopLoss} (${trade.potentialLoss.toFixed(1)}%)
   Risk/Reward: ${Math.abs(trade.riskReward).toFixed(2)}:1
   Capital: $${trade.capitalRequired.toLocaleString()}
   Timeframe: ${trade.timeframe}
   Scores: R/R ${scoreMatrix[i].scores.riskReward}/100, Capital Efficiency ${scoreMatrix[i].scores.capitalEfficiency}/100, Technical ${scoreMatrix[i].scores.technicalSetup}/100
   ${trade.keyFactors ? `Key Factors: ${trade.keyFactors.join(', ')}` : ''}
`).join('\n')}

RANKING:
${ranking.map(r => `${r.rank}. ${r.symbol} (Score: ${r.totalScore}/100)`).join('\n')}

Provide:
1. SUMMARY: 1-2 sentence comparison of the opportunities
2. RECOMMENDATION: Which trade is best and why (2-3 sentences)
3. REASONING: Detailed explanation of the ranking (3-4 sentences)
4. CONSIDERATIONS: 2-3 bullet points of factors to consider

Keep it concise and actionable.`;

    const analysis = await generateAIAnalysis(prompt);

    // Parse AI response (assuming it follows the format)
    const sections = analysis.split(/SUMMARY:|RECOMMENDATION:|REASONING:|CONSIDERATIONS:/i);

    return {
      summary: sections[1]?.trim() || `Comparing ${trades.length} trade opportunities across ${trades.map(t => t.symbol).join(', ')}`,
      recommendation: sections[2]?.trim() || `${topTrade.symbol} ranks highest with a score of ${topRanked.totalScore}/100`,
      reasoning: sections[3]?.trim() || `${topTrade.symbol} offers the best combination of risk/reward, capital efficiency, and technical setup.`,
      considerations: sections[4]?.trim().split('\n').filter(Boolean) || [
        'Consider your available capital and risk tolerance',
        'Review your existing portfolio exposure',
        'Monitor market conditions before entry'
      ],
    };
  } catch (error) {
    console.error('Error generating AI comparison:', error);

    const topRanked = ranking[0];
    const topTrade = trades.find(t => t.id === topRanked.tradeId)!;

    return {
      summary: `Comparing ${trades.length} trade opportunities`,
      recommendation: `${topTrade.symbol} ranks highest with a score of ${topRanked.totalScore}/100`,
      reasoning: `Based on quantitative analysis, ${topTrade.symbol} offers the best overall profile considering risk/reward ratio, capital efficiency, technical setup quality, and timing.`,
      considerations: [
        'Review your risk tolerance and position sizing',
        'Consider correlation with existing positions',
        'Monitor market conditions for optimal entry'
      ],
    };
  }
}

export type { ComparisonResult };
