/**
 * AI Daily Trade Recommendations
 * Aggregates all scanners and provides ranked daily trade recommendations
 */

import { scanMomentumBreakouts, scanOversoldBounce, scanMACDCrossover, scanPullbackPlay } from './shortTermTrading';
import { scanCoveredCalls, scanCashSecuredPuts, scanCheapCallsOnBreakouts, scanLEAPOpportunities } from './optionsStrategies';
import { generateAIAnalysis } from './aiAnalysis';

interface UnifiedRecommendation {
  id: string;
  rank: number;
  symbol: string;
  companyName: string;
  category: 'stock_trade' | 'options_trade';
  strategyType: string;
  strategyName: string;

  // Entry details
  currentPrice: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;

  // Metrics
  potentialGain: number;
  potentialLoss: number;
  riskReward: number;
  probabilityOfProfit?: number;
  timeframe: string;

  // Capital requirements
  capitalRequired: number;
  positionSize?: string;

  // AI Analysis
  aiScore: number; // 0-100
  aiReasoning: string;
  keyFactors: string[];
  risks: string[];

  // Technical
  technicalScore: number;
  rsi?: number;
  volume?: number;
  relativeVolume?: number;

  // Options specific
  strike?: number;
  expiration?: string;
  dte?: number;
  optionType?: 'call' | 'put';
  premium?: number;
  delta?: number;

  timestamp: string;
}

interface DailyRecommendationsResult {
  date: string;
  topPicks: UnifiedRecommendation[];
  allRecommendations: UnifiedRecommendation[];
  summary: {
    totalScanned: number;
    totalOpportunities: number;
    avgScore: number;
    categories: {
      stockTrades: number;
      optionsTrades: number;
    };
  };
  aiInsights: string;
}

interface ScanOptions {
  accountSize?: number;
  riskLevel?: 'conservative' | 'moderate' | 'aggressive';
  categories?: ('stock_trade' | 'options_trade')[];
  minScore?: number;
}

/**
 * Main function: Get AI-powered daily trade recommendations
 */
export async function getDailyRecommendations(options: ScanOptions = {}): Promise<DailyRecommendationsResult> {
  const {
    accountSize = 10000,
    riskLevel = 'moderate',
    categories = ['stock_trade', 'options_trade'],
    minScore = 60,
  } = options;

  console.log('🤖 Generating AI Daily Trade Recommendations...');
  console.log('Options:', { accountSize, riskLevel, categories, minScore });

  const allRecommendations: UnifiedRecommendation[] = [];
  let totalScanned = 0;

  // Scan Stock Trades
  if (categories.includes('stock_trade')) {
    const stockRecommendations = await scanStockTrades(accountSize, riskLevel);
    allRecommendations.push(...stockRecommendations);
    totalScanned += 150; // Approximate stocks scanned
  }

  // Scan Options Trades
  if (categories.includes('options_trade')) {
    const optionsRecommendations = await scanOptionsTrades(accountSize, riskLevel);
    allRecommendations.push(...optionsRecommendations);
    totalScanned += 150;
  }

  // Filter by minimum score
  const filteredRecommendations = allRecommendations.filter(r => r.aiScore >= minScore);

  // Sort by AI score
  filteredRecommendations.sort((a, b) => b.aiScore - a.aiScore);

  // Rank them
  filteredRecommendations.forEach((rec, index) => {
    rec.rank = index + 1;
  });

  // Get top 10 picks
  const topPicks = filteredRecommendations.slice(0, 10);

  // Calculate summary
  const summary = {
    totalScanned,
    totalOpportunities: filteredRecommendations.length,
    avgScore: filteredRecommendations.length > 0
      ? filteredRecommendations.reduce((sum, r) => sum + r.aiScore, 0) / filteredRecommendations.length
      : 0,
    categories: {
      stockTrades: filteredRecommendations.filter(r => r.category === 'stock_trade').length,
      optionsTrades: filteredRecommendations.filter(r => r.category === 'options_trade').length,
    },
  };

  // Generate AI insights about the day's opportunities
  const aiInsights = await generateMarketInsights(topPicks, summary);

  return {
    date: new Date().toISOString().split('T')[0],
    topPicks,
    allRecommendations: filteredRecommendations,
    summary,
    aiInsights,
  };
}

/**
 * Scan all stock trade strategies
 */
async function scanStockTrades(accountSize: number, riskLevel: string): Promise<UnifiedRecommendation[]> {
  const recommendations: UnifiedRecommendation[] = [];

  try {
    console.log('📊 Scanning stock trade strategies...');

    // Run all 4 stock trade scanners in parallel
    const [momentum, oversold, macd, pullback] = await Promise.all([
      scanMomentumBreakouts({ minPrice: 5, maxPrice: 300, accountSize }).catch(() => []),
      scanOversoldBounce({ minPrice: 5, maxPrice: 300, accountSize }).catch(() => []),
      scanMACDCrossover({ minPrice: 5, maxPrice: 300, accountSize }).catch(() => []),
      scanPullbackPlay({ minPrice: 5, maxPrice: 300, accountSize }).catch(() => []),
    ]);

    // Convert to unified format
    momentum.forEach(idea => {
      recommendations.push({
        id: idea.id,
        rank: 0,
        symbol: idea.symbol,
        companyName: idea.companyName,
        category: 'stock_trade',
        strategyType: 'momentum_breakout',
        strategyName: idea.strategy,
        currentPrice: idea.price,
        entryPrice: idea.entry,
        targetPrice: idea.target,
        stopLoss: idea.stopLoss,
        potentialGain: idea.potentialGain,
        potentialLoss: idea.potentialLoss,
        riskReward: idea.riskReward,
        timeframe: idea.timeframe,
        capitalRequired: idea.entry * 100, // Assume 100 shares
        aiScore: idea.score,
        aiReasoning: idea.reasoning,
        keyFactors: [idea.setup],
        risks: [`Risk/Reward: ${idea.riskReward.toFixed(2)}:1`],
        technicalScore: idea.score,
        rsi: idea.rsi,
        volume: idea.volume,
        relativeVolume: idea.relativeVolume,
        timestamp: idea.timestamp,
      });
    });

    // Same for other strategies
    [...oversold, ...macd, ...pullback].forEach(idea => {
      recommendations.push({
        id: idea.id,
        rank: 0,
        symbol: idea.symbol,
        companyName: idea.companyName,
        category: 'stock_trade',
        strategyType: idea.strategy.toLowerCase().replace(/ /g, '_'),
        strategyName: idea.strategy,
        currentPrice: idea.price,
        entryPrice: idea.entry,
        targetPrice: idea.target,
        stopLoss: idea.stopLoss,
        potentialGain: idea.potentialGain,
        potentialLoss: idea.potentialLoss,
        riskReward: idea.riskReward,
        timeframe: idea.timeframe,
        capitalRequired: idea.entry * 100,
        aiScore: idea.score,
        aiReasoning: idea.reasoning,
        keyFactors: [idea.setup],
        risks: [`Risk/Reward: ${idea.riskReward.toFixed(2)}:1`],
        technicalScore: idea.score,
        rsi: idea.rsi,
        volume: idea.volume,
        relativeVolume: idea.relativeVolume,
        timestamp: idea.timestamp,
      });
    });

    console.log(`✅ Found ${recommendations.length} stock trade opportunities`);
  } catch (error: any) {
    console.error('Error scanning stock trades:', error.message);
  }

  return recommendations;
}

/**
 * Scan all options strategies
 */
async function scanOptionsTrades(accountSize: number, riskLevel: string): Promise<UnifiedRecommendation[]> {
  const recommendations: UnifiedRecommendation[] = [];

  try {
    console.log('📊 Scanning options strategies...');

    // Define symbols to scan (use limited set for performance)
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'AMD', 'TSLA', 'META', 'AMZN', 'SPY', 'QQQ'];

    // Run all 4 options scanners in parallel
    const [coveredCalls, cashPuts, longCalls, leaps] = await Promise.all([
      scanCoveredCalls(symbols, { accountSize }).catch(() => []),
      scanCashSecuredPuts(symbols, { accountSize }).catch(() => []),
      scanCheapCallsOnBreakouts(symbols, { accountSize }).catch(() => []),
      scanLEAPOpportunities(symbols, { accountSize }).catch(() => []),
    ]);

    // Convert to unified format
    [...coveredCalls, ...cashPuts, ...longCalls, ...leaps].forEach(suggestion => {
      recommendations.push({
        id: suggestion.id,
        rank: 0,
        symbol: suggestion.symbol,
        companyName: suggestion.symbol, // Options don't have company name
        category: 'options_trade',
        strategyType: suggestion.strategyType,
        strategyName: suggestion.strategyName,
        currentPrice: suggestion.stockPrice,
        entryPrice: suggestion.premium,
        targetPrice: suggestion.target || suggestion.premium * 1.5,
        stopLoss: suggestion.stopLoss || suggestion.premium * 0.5,
        potentialGain: suggestion.maxProfit === Infinity ? 100 : (suggestion.maxProfit / suggestion.buyingPowerRequired) * 100,
        potentialLoss: (suggestion.maxLoss / suggestion.buyingPowerRequired) * 100,
        riskReward: suggestion.riskReward || 2,
        probabilityOfProfit: suggestion.probabilityOfProfit,
        timeframe: `${suggestion.dte} days`,
        capitalRequired: suggestion.buyingPowerRequired,
        positionSize: `${suggestion.contracts} contract(s)`,
        aiScore: suggestion.score,
        aiReasoning: suggestion.aiInsight || `${suggestion.strategyName} opportunity`,
        keyFactors: [
          `Strike: $${suggestion.strike}`,
          `Expiration: ${suggestion.expiration}`,
          `Premium: $${suggestion.premium.toFixed(2)}`,
        ],
        risks: suggestion.risks ? [suggestion.risks] : [],
        technicalScore: suggestion.score,
        strike: suggestion.strike,
        expiration: suggestion.expiration,
        dte: suggestion.dte,
        optionType: suggestion.optionType,
        premium: suggestion.premium,
        delta: suggestion.delta,
        timestamp: new Date().toISOString(),
      });
    });

    console.log(`✅ Found ${recommendations.length} options opportunities`);
  } catch (error: any) {
    console.error('Error scanning options trades:', error.message);
  }

  return recommendations;
}

/**
 * Generate AI market insights
 */
async function generateMarketInsights(
  topPicks: UnifiedRecommendation[],
  summary: any
): Promise<string> {
  if (topPicks.length === 0) {
    return 'No high-quality trade opportunities found today. Market conditions may not be favorable for the configured strategies.';
  }

  try {
    const prompt = `You are an expert trading analyst. Analyze today's top trade opportunities and provide a brief market insight.

Top ${topPicks.length} Opportunities:
${topPicks.slice(0, 5).map((pick, i) => `
${i + 1}. ${pick.symbol} - ${pick.strategyName}
   Score: ${pick.aiScore}/100
   Risk/Reward: ${pick.riskReward.toFixed(2)}:1
   Potential: +${pick.potentialGain.toFixed(1)}%
   Setup: ${pick.keyFactors[0]}
`).join('\n')}

Summary:
- Total opportunities: ${summary.totalOpportunities}
- Stock trades: ${summary.categories.stockTrades}
- Options trades: ${summary.categories.optionsTrades}
- Average quality score: ${summary.avgScore.toFixed(0)}/100

Provide a 2-3 sentence market insight covering:
1. Overall market setup quality today
2. Best strategy types showing up (momentum, oversold, options income, etc.)
3. Any common themes in the symbols (sector concentration, volatility, etc.)

Keep it concise and actionable.`;

    const insights = await generateAIAnalysis(prompt);
    return insights;
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return `Today's top opportunities show an average quality score of ${summary.avgScore.toFixed(0)}/100. Focus areas: ${summary.categories.stockTrades} stock trades and ${summary.categories.optionsTrades} options strategies.`;
  }
}

export type { UnifiedRecommendation, DailyRecommendationsResult, ScanOptions };
