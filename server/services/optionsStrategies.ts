import {
  getOptionsChain,
  getOptionsExpirations,
  calculateDTE,
  calculateAnnualizedReturn,
  calculateProbabilityOfProfit,
  OptionContract,
} from './optionsChain';
import { getQuote, getTimeSeries } from './twelveData';
import { generateAIAnalysis } from './aiAnalysis';

// Simple RSI calculation (same as stock discovery)
function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Simple SMA calculation
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;

  const slice = prices.slice(-period);
  return slice.reduce((sum, price) => sum + price, 0) / period;
}

interface OptionSuggestion {
  id: string;
  symbol: string;
  stockPrice: number;
  strategyName: string;
  strategyType: 'sell_premium' | 'buy_options';
  strike: number;
  expiration: string;
  dte: number;
  optionType: 'call' | 'put';
  premium: number; // mid price
  bid: number;
  ask: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  impliedVolatility: number;
  probabilityOfProfit: number;
  maxProfit: number;
  maxLoss: number;
  breakeven: number;
  annualizedReturn: number;
  contracts: number; // recommended
  buyingPowerRequired: number;
  aiInsight?: string;
  risks?: string;
  exitStrategy?: string;
  score: number; // 0-100 ranking
}

interface ScanOptions {
  accountSize?: number;
  riskLevel?: 'conservative' | 'moderate' | 'aggressive';
  maxRiskPerTrade?: number; // percentage
  preferredDTE?: { min: number; max: number };
}

/**
 * Scan for best covered call opportunities
 */
export async function scanCoveredCalls(
  symbols: string[],
  options: ScanOptions = {}
): Promise<OptionSuggestion[]> {
  const suggestions: OptionSuggestion[] = [];
  const { preferredDTE = { min: 30, max: 45 } } = options;

  for (const symbol of symbols) {
    try {
      const quote = await getQuote(symbol);
      const stockPrice = quote.close;

      // Get options chain
      const expirations = await getOptionsExpirations(symbol);
      const targetExpiration = findExpirationInRange(expirations, preferredDTE.min, preferredDTE.max);

      if (!targetExpiration) continue;

      const chain = await getOptionsChain(symbol, targetExpiration);
      const dte = calculateDTE(targetExpiration);

      // Find calls 1-2 strikes OTM
      const otmCalls = chain.calls.filter(
        call => call.strike > stockPrice && call.strike <= stockPrice * 1.05
      );

      for (const call of otmCalls) {
        const premium = (call.bid + call.ask) / 2;

        // Premium must be > 1% of stock price
        if (premium < stockPrice * 0.01) continue;

        const buyingPower = stockPrice * 100; // Own 100 shares
        const annualizedReturn = calculateAnnualizedReturn(premium * 100, buyingPower, dte);
        const probabilityOfProfit = calculateProbabilityOfProfit(call.delta, 'sell_call');

        const suggestion: OptionSuggestion = {
          id: `cc_${symbol}_${call.strike}_${targetExpiration}`,
          symbol,
          stockPrice,
          strategyName: 'Covered Call',
          strategyType: 'sell_premium',
          strike: call.strike,
          expiration: targetExpiration,
          dte,
          optionType: 'call',
          premium,
          bid: call.bid,
          ask: call.ask,
          delta: call.delta,
          gamma: call.gamma,
          theta: call.theta,
          vega: call.vega,
          impliedVolatility: call.impliedVolatility,
          probabilityOfProfit,
          maxProfit: premium * 100,
          maxLoss: stockPrice * 100 - premium * 100,
          breakeven: stockPrice - premium,
          annualizedReturn,
          contracts: 1,
          buyingPowerRequired: buyingPower,
          score: calculateScore({
            annualizedReturn,
            probabilityOfProfit,
            premium,
            dte,
            strategyType: 'covered_call',
          }),
        };

        suggestions.push(suggestion);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error: any) {
      console.error(`Error scanning covered calls for ${symbol}:`, error.message);
    }
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 20);
}

/**
 * Scan for best cash-secured put opportunities
 */
export async function scanCashSecuredPuts(
  symbols: string[],
  options: ScanOptions = {}
): Promise<OptionSuggestion[]> {
  const suggestions: OptionSuggestion[] = [];
  const { preferredDTE = { min: 30, max: 45 } } = options;

  for (const symbol of symbols) {
    try {
      const quote = await getQuote(symbol);
      const stockPrice = quote.close;

      // Check if slightly oversold (RSI < 40)
      const timeSeries = await getTimeSeries(symbol, '1day', 20);
      const closes = timeSeries.map((d: any) => parseFloat(d.close));
      const rsi = calculateRSI(closes, 14);

      if (rsi > 40) continue; // Skip if not oversold

      const expirations = await getOptionsExpirations(symbol);
      const targetExpiration = findExpirationInRange(expirations, preferredDTE.min, preferredDTE.max);

      if (!targetExpiration) continue;

      const chain = await getOptionsChain(symbol, targetExpiration);
      const dte = calculateDTE(targetExpiration);

      // Find puts ATM or slightly OTM
      const targetPuts = chain.puts.filter(
        put => put.strike >= stockPrice * 0.95 && put.strike <= stockPrice
      );

      for (const put of targetPuts) {
        const premium = (put.bid + put.ask) / 2;

        // Premium must be > 1.5% of strike
        if (premium < put.strike * 0.015) continue;

        const buyingPower = put.strike * 100; // Cash to secure the put
        const annualizedReturn = calculateAnnualizedReturn(premium * 100, buyingPower, dte);
        const probabilityOfProfit = calculateProbabilityOfProfit(put.delta, 'sell_put');
        const effectiveBuyPrice = put.strike - premium;

        const suggestion: OptionSuggestion = {
          id: `csp_${symbol}_${put.strike}_${targetExpiration}`,
          symbol,
          stockPrice,
          strategyName: 'Cash-Secured Put',
          strategyType: 'sell_premium',
          strike: put.strike,
          expiration: targetExpiration,
          dte,
          optionType: 'put',
          premium,
          bid: put.bid,
          ask: put.ask,
          delta: put.delta,
          gamma: put.gamma,
          theta: put.theta,
          vega: put.vega,
          impliedVolatility: put.impliedVolatility,
          probabilityOfProfit,
          maxProfit: premium * 100,
          maxLoss: (put.strike - premium) * 100,
          breakeven: effectiveBuyPrice,
          annualizedReturn,
          contracts: 1,
          buyingPowerRequired: buyingPower,
          score: calculateScore({
            annualizedReturn,
            probabilityOfProfit,
            premium,
            dte,
            strategyType: 'cash_secured_put',
            rsi,
          }),
        };

        suggestions.push(suggestion);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error: any) {
      console.error(`Error scanning CSPs for ${symbol}:`, error.message);
    }
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 20);
}

/**
 * Scan for cheap call options on breakouts
 */
export async function scanCheapCallsOnBreakouts(
  symbols: string[],
  options: ScanOptions = {}
): Promise<OptionSuggestion[]> {
  const suggestions: OptionSuggestion[] = [];
  const { preferredDTE = { min: 45, max: 60 } } = options;

  for (const symbol of symbols) {
    try {
      const quote = await getQuote(symbol);
      const stockPrice = quote.close;

      // Check for breakout (price > 20-day SMA and volume spike)
      const timeSeries = await getTimeSeries(symbol, '1day', 50);
      const closes = timeSeries.map((d: any) => parseFloat(d.close));
      const sma20 = calculateSMA(closes, 20);

      if (stockPrice <= sma20) continue; // Not breaking out

      const expirations = await getOptionsExpirations(symbol);
      const targetExpiration = findExpirationInRange(expirations, preferredDTE.min, preferredDTE.max);

      if (!targetExpiration) continue;

      const chain = await getOptionsChain(symbol, targetExpiration);
      const dte = calculateDTE(targetExpiration);

      // Find ATM or 1 strike ITM calls (low IV rank)
      const atmCalls = chain.calls.filter(
        call =>
          call.strike >= stockPrice * 0.97 &&
          call.strike <= stockPrice * 1.02 &&
          call.impliedVolatility < 0.5 // IV rank < 50%
      );

      for (const call of atmCalls) {
        const premium = (call.bid + call.ask) / 2;
        const buyingPower = premium * 100;
        const probabilityOfProfit = calculateProbabilityOfProfit(call.delta, 'buy_call');

        const suggestion: OptionSuggestion = {
          id: `bc_${symbol}_${call.strike}_${targetExpiration}`,
          symbol,
          stockPrice,
          strategyName: 'Long Call on Breakout',
          strategyType: 'buy_options',
          strike: call.strike,
          expiration: targetExpiration,
          dte,
          optionType: 'call',
          premium,
          bid: call.bid,
          ask: call.ask,
          delta: call.delta,
          gamma: call.gamma,
          theta: call.theta,
          vega: call.vega,
          impliedVolatility: call.impliedVolatility,
          probabilityOfProfit,
          maxProfit: Infinity, // Unlimited upside
          maxLoss: premium * 100,
          breakeven: call.strike + premium,
          annualizedReturn: 0, // Not applicable for long options
          contracts: 1,
          buyingPowerRequired: buyingPower,
          score: calculateScore({
            annualizedReturn: 0,
            probabilityOfProfit,
            premium,
            dte,
            strategyType: 'long_call',
            delta: call.delta,
          }),
        };

        suggestions.push(suggestion);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error: any) {
      console.error(`Error scanning long calls for ${symbol}:`, error.message);
    }
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 15);
}

/**
 * Scan for LEAP opportunities (deep ITM, long-dated calls)
 */
export async function scanLEAPOpportunities(
  symbols: string[],
  options: ScanOptions = {}
): Promise<OptionSuggestion[]> {
  const suggestions: OptionSuggestion[] = [];

  for (const symbol of symbols) {
    try {
      const quote = await getQuote(symbol);
      const stockPrice = quote.close;

      // Check if stock is down > 20% from highs
      const timeSeries = await getTimeSeries(symbol, '1day', 250);
      const closes = timeSeries.map((d: any) => parseFloat(d.close));
      const high52w = Math.max(...closes);
      const percentFromHigh = ((stockPrice - high52w) / high52w) * 100;

      if (percentFromHigh > -20) continue; // Skip if not down enough

      const expirations = await getOptionsExpirations(symbol);
      // Find expirations 6-12 months out
      const leapExpiration = expirations.find(exp => {
        const dte = calculateDTE(exp);
        return dte >= 180 && dte <= 365;
      });

      if (!leapExpiration) continue;

      const chain = await getOptionsChain(symbol, leapExpiration);
      const dte = calculateDTE(leapExpiration);

      // Find deep ITM calls (delta > 0.7)
      const deepITMCalls = chain.calls.filter(
        call => call.delta >= 0.7 && call.strike < stockPrice
      );

      for (const call of deepITMCalls) {
        const premium = (call.bid + call.ask) / 2;
        const buyingPower = premium * 100;
        const probabilityOfProfit = calculateProbabilityOfProfit(call.delta, 'buy_call');

        const suggestion: OptionSuggestion = {
          id: `leap_${symbol}_${call.strike}_${leapExpiration}`,
          symbol,
          stockPrice,
          strategyName: 'LEAP Call (Stock Replacement)',
          strategyType: 'buy_options',
          strike: call.strike,
          expiration: leapExpiration,
          dte,
          optionType: 'call',
          premium,
          bid: call.bid,
          ask: call.ask,
          delta: call.delta,
          gamma: call.gamma,
          theta: call.theta,
          vega: call.vega,
          impliedVolatility: call.impliedVolatility,
          probabilityOfProfit,
          maxProfit: Infinity,
          maxLoss: premium * 100,
          breakeven: call.strike + premium,
          annualizedReturn: 0,
          contracts: 1,
          buyingPowerRequired: buyingPower,
          score: calculateScore({
            annualizedReturn: 0,
            probabilityOfProfit,
            premium,
            dte,
            strategyType: 'leap',
            delta: call.delta,
            percentFromHigh,
          }),
        };

        suggestions.push(suggestion);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error: any) {
      console.error(`Error scanning LEAPs for ${symbol}:`, error.message);
    }
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 10);
}

/**
 * Calculate position size based on account size and risk level
 */
export function calculatePositionSize(
  accountSize: number,
  maxRiskPerTrade: number,
  maxLoss: number
): number {
  const maxRiskDollars = accountSize * (maxRiskPerTrade / 100);
  return Math.floor(maxRiskDollars / maxLoss);
}

/**
 * Generate AI analysis for an option suggestion
 */
export async function generateOptionAnalysis(
  suggestion: OptionSuggestion,
  accountSize?: number
): Promise<OptionSuggestion> {
  try {
    const prompt = `Analyze this options trade for a retail investor:

Strategy: ${suggestion.strategyName}
Symbol: ${suggestion.symbol} (Current Price: $${suggestion.stockPrice.toFixed(2)})
Strike: $${suggestion.strike} ${suggestion.optionType.toUpperCase()}
Expiration: ${suggestion.expiration} (${suggestion.dte} days)
Premium: $${suggestion.premium.toFixed(2)} (Bid: ${suggestion.bid.toFixed(2)}, Ask: ${suggestion.ask.toFixed(2)})
Probability of Profit: ${suggestion.probabilityOfProfit.toFixed(1)}%
${suggestion.annualizedReturn > 0 ? `Annualized Return: ${suggestion.annualizedReturn.toFixed(1)}%` : ''}
Max Profit: $${suggestion.maxProfit === Infinity ? 'Unlimited' : suggestion.maxProfit.toFixed(0)}
Max Loss: $${suggestion.maxLoss.toFixed(0)}
Breakeven: $${suggestion.breakeven.toFixed(2)}

Provide:
1. Plain English Explanation (2-3 sentences): Why this trade makes sense
2. Key Risks (bullet points): What could go wrong
3. Exit Strategy: When to close, roll, or take assignment${accountSize ? `\n4. Position Size: Recommend number of contracts for $${accountSize} account` : ''}`;

    const analysis = await generateAIAnalysis(prompt);

    // Parse the response (simple parsing, could be improved)
    const lines = analysis.split('\n');
    let aiInsight = '';
    let risks = '';
    let exitStrategy = '';

    let currentSection = '';
    for (const line of lines) {
      if (line.includes('Plain English') || line.includes('Explanation')) {
        currentSection = 'insight';
      } else if (line.includes('Key Risks') || line.includes('Risks')) {
        currentSection = 'risks';
      } else if (line.includes('Exit Strategy')) {
        currentSection = 'exit';
      } else if (line.trim()) {
        if (currentSection === 'insight') aiInsight += line + ' ';
        if (currentSection === 'risks') risks += line + '\n';
        if (currentSection === 'exit') exitStrategy += line + ' ';
      }
    }

    return {
      ...suggestion,
      aiInsight: aiInsight.trim() || analysis.substring(0, 200),
      risks: risks.trim(),
      exitStrategy: exitStrategy.trim(),
    };
  } catch (error) {
    console.error('AI analysis failed:', error);
    return suggestion;
  }
}

/**
 * Score an option suggestion (0-100)
 */
function calculateScore(params: {
  annualizedReturn: number;
  probabilityOfProfit: number;
  premium: number;
  dte: number;
  strategyType: string;
  rsi?: number;
  delta?: number;
  percentFromHigh?: number;
}): number {
  let score = 0;

  // Base score on probability of profit (40 points)
  score += params.probabilityOfProfit * 0.4;

  // Annualized return (30 points for sell strategies)
  if (params.annualizedReturn > 0) {
    score += Math.min(params.annualizedReturn, 100) * 0.3;
  }

  // Prefer optimal DTE range (15 points)
  if (params.strategyType.includes('sell')) {
    if (params.dte >= 30 && params.dte <= 45) score += 15;
    else if (params.dte >= 20 && params.dte <= 60) score += 10;
  }

  // Delta preference (15 points for buy strategies)
  if (params.delta !== undefined && params.strategyType.includes('long')) {
    score += params.delta * 15;
  }

  // RSI bonus for CSPs (10 points)
  if (params.rsi !== undefined && params.rsi < 35) {
    score += 10;
  }

  // Discount bonus for LEAPs (10 points)
  if (params.percentFromHigh !== undefined && params.percentFromHigh < -30) {
    score += 10;
  }

  return Math.min(Math.round(score), 100);
}

/**
 * Find expiration date in preferred DTE range
 */
function findExpirationInRange(expirations: string[], minDTE: number, maxDTE: number): string | null {
  for (const exp of expirations) {
    const dte = calculateDTE(exp);
    if (dte >= minDTE && dte <= maxDTE) {
      return exp;
    }
  }
  return expirations[0] || null; // Fallback to nearest
}

export type { OptionSuggestion, ScanOptions };
