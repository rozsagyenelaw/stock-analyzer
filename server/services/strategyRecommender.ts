/**
 * Options Strategy Recommender Service
 * Recommends optimal options strategies based on market outlook and stock analysis
 */

import { generateOptionsChain, OptionsStrategy } from './options';

export type MarketOutlook = 'bullish' | 'bearish' | 'neutral' | 'volatile';

export interface StrategyRecommendation {
  strategy: OptionsStrategy;
  suitability: number; // 0-100
  marketOutlook: MarketOutlook;
  reasoning: string[];
  pros: string[];
  cons: string[];
  idealConditions: string[];
  riskLevel: 'low' | 'medium' | 'high';
  capitalRequired: number;
  maxProfit: number;
  maxLoss: number;
  breakeven: number[];
  bestFor: string[];
}

export interface StrategyComparison {
  symbol: string;
  currentPrice: number;
  marketOutlook: MarketOutlook;
  recommendations: StrategyRecommendation[];
  topRecommendation: StrategyRecommendation;
}

/**
 * Determine market outlook based on technical indicators
 */
export function determineMarketOutlook(indicators: any, currentPrice: number): MarketOutlook {
  let bullishSignals = 0;
  let bearishSignals = 0;
  let volatilitySignals = 0;

  // RSI analysis
  if (indicators.rsi) {
    if (indicators.rsi < 40) bullishSignals++;
    if (indicators.rsi > 60) bearishSignals++;
  }

  // MACD analysis
  if (indicators.macd && indicators.macdSignal) {
    if (indicators.macd > indicators.macdSignal) bullishSignals++;
    else bearishSignals++;
  }

  // Moving average analysis
  if (indicators.sma20 && indicators.sma50) {
    if (currentPrice > indicators.sma20 && indicators.sma20 > indicators.sma50) {
      bullishSignals += 2;
    } else if (currentPrice < indicators.sma20 && indicators.sma20 < indicators.sma50) {
      bearishSignals += 2;
    }
  }

  // Volatility analysis
  if (indicators.atr) {
    const atrPercent = (indicators.atr / currentPrice) * 100;
    if (atrPercent > 3) volatilitySignals++;
  }

  if (indicators.bbUpper && indicators.bbLower) {
    const bbWidth = ((indicators.bbUpper - indicators.bbLower) / currentPrice) * 100;
    if (bbWidth > 8) volatilitySignals++;
    if (bbWidth < 3) volatilitySignals++; // Squeeze = imminent volatility
  }

  // Determine outlook
  if (volatilitySignals >= 2) return 'volatile';
  if (bullishSignals > bearishSignals + 1) return 'bullish';
  if (bearishSignals > bullishSignals + 1) return 'bearish';
  return 'neutral';
}

/**
 * Get strategy recommendations for a given outlook
 */
export function recommendStrategies(
  symbol: string,
  currentPrice: number,
  outlook: MarketOutlook,
  indicators: any,
  expiration: string
): StrategyRecommendation[] {
  const chain = generateOptionsChain(symbol, currentPrice, expiration);
  const recommendations: StrategyRecommendation[] = [];

  // Bullish strategies
  if (outlook === 'bullish') {
    // Long Call
    const longCall = createLongCallRecommendation(symbol, currentPrice, chain, expiration);
    recommendations.push(longCall);

    // Bull Call Spread
    const bullCallSpread = createBullCallSpreadRecommendation(symbol, currentPrice, chain, expiration);
    recommendations.push(bullCallSpread);

    // Covered Call (if neutral-bullish)
    const coveredCall = createCoveredCallRecommendation(symbol, currentPrice, chain, expiration);
    recommendations.push(coveredCall);
  }

  // Bearish strategies
  if (outlook === 'bearish') {
    // Long Put
    const longPut = createLongPutRecommendation(symbol, currentPrice, chain, expiration);
    recommendations.push(longPut);

    // Bear Put Spread
    const bearPutSpread = createBearPutSpreadRecommendation(symbol, currentPrice, chain, expiration);
    recommendations.push(bearPutSpread);

    // Cash-Secured Put (if mildly bearish)
    const cashSecuredPut = createCashSecuredPutRecommendation(symbol, currentPrice, chain, expiration);
    recommendations.push(cashSecuredPut);
  }

  // Neutral strategies
  if (outlook === 'neutral') {
    // Iron Condor
    const ironCondor = createIronCondorRecommendation(symbol, currentPrice, chain, expiration);
    recommendations.push(ironCondor);

    // Butterfly Spread
    const butterfly = createButterflyRecommendation(symbol, currentPrice, chain, expiration);
    recommendations.push(butterfly);

    // Covered Call
    const coveredCall = createCoveredCallRecommendation(symbol, currentPrice, chain, expiration);
    recommendations.push(coveredCall);
  }

  // Volatile strategies
  if (outlook === 'volatile') {
    // Long Straddle
    const longStraddle = createLongStraddleRecommendation(symbol, currentPrice, chain, expiration);
    recommendations.push(longStraddle);

    // Long Strangle
    const longStrangle = createLongStrangleRecommendation(symbol, currentPrice, chain, expiration);
    recommendations.push(longStrangle);

    // Iron Butterfly
    const ironButterfly = createIronButterflyRecommendation(symbol, currentPrice, chain, expiration);
    recommendations.push(ironButterfly);
  }

  // Sort by suitability
  return recommendations.sort((a, b) => b.suitability - a.suitability);
}

// Helper functions to create specific strategy recommendations

function createLongCallRecommendation(
  symbol: string,
  currentPrice: number,
  chain: any,
  expiration: string
): StrategyRecommendation {
  const strike = Math.round(currentPrice * 1.02 / 5) * 5; // Slightly OTM
  const call = chain.calls.find((c: any) => c.strike === strike) || chain.calls[0];

  const strategy: OptionsStrategy = {
    name: 'Long Call',
    description: 'Buy call option to profit from upside move',
    legs: [
      {
        type: 'call',
        action: 'buy',
        strike: call.strike,
        expiration,
        contracts: 1,
        premium: call.ask,
      },
    ],
  };

  return {
    strategy,
    suitability: 85,
    marketOutlook: 'bullish',
    reasoning: [
      'Strong bullish signals detected',
      'Limited risk (premium paid only)',
      'Unlimited upside potential',
    ],
    pros: [
      'Unlimited profit potential',
      'Limited risk to premium paid',
      'High leverage on upside moves',
    ],
    cons: [
      'Time decay works against you',
      'Requires significant upward move to profit',
      'Can lose 100% of premium',
    ],
    idealConditions: [
      'Strong bullish momentum',
      'Increasing volume',
      'Technical breakout imminent',
    ],
    riskLevel: 'medium',
    capitalRequired: call.ask * 100,
    maxProfit: Infinity,
    maxLoss: call.ask * 100,
    breakeven: [call.strike + call.ask],
    bestFor: ['Aggressive bullish traders', 'Breakout plays', 'Earnings run-ups'],
  };
}

function createBullCallSpreadRecommendation(
  symbol: string,
  currentPrice: number,
  chain: any,
  expiration: string
): StrategyRecommendation {
  const buyStrike = Math.round(currentPrice * 1.02 / 5) * 5;
  const sellStrike = Math.round(currentPrice * 1.08 / 5) * 5;

  const buyCall = chain.calls.find((c: any) => c.strike === buyStrike) || chain.calls[0];
  const sellCall = chain.calls.find((c: any) => c.strike === sellStrike) || chain.calls[chain.calls.length - 1];

  const strategy: OptionsStrategy = {
    name: 'Bull Call Spread',
    description: 'Buy lower strike call, sell higher strike call',
    legs: [
      { type: 'call', action: 'buy', strike: buyCall.strike, expiration, contracts: 1, premium: buyCall.ask },
      { type: 'call', action: 'sell', strike: sellCall.strike, expiration, contracts: 1, premium: sellCall.bid },
    ],
  };

  const netDebit = buyCall.ask - sellCall.bid;
  const maxProfit = (sellStrike - buyStrike - netDebit) * 100;

  return {
    strategy,
    suitability: 90,
    marketOutlook: 'bullish',
    reasoning: [
      'Reduces cost compared to long call',
      'Defined risk and reward',
      'Ideal for moderate bullish outlook',
    ],
    pros: [
      'Lower cost than long call',
      'Defined maximum risk',
      'Reduced time decay impact',
    ],
    cons: [
      'Limited profit potential',
      'Both legs can expire worthless',
      'Requires stock to move to profit zone',
    ],
    idealConditions: [
      'Moderate bullish outlook',
      'High implied volatility',
      'Defined resistance level as target',
    ],
    riskLevel: 'low',
    capitalRequired: netDebit * 100,
    maxProfit: maxProfit,
    maxLoss: netDebit * 100,
    breakeven: [buyStrike + netDebit],
    bestFor: ['Conservative bullish traders', 'High IV environments', 'Defined upside targets'],
  };
}

function createCoveredCallRecommendation(
  symbol: string,
  currentPrice: number,
  chain: any,
  expiration: string
): StrategyRecommendation {
  const strike = Math.round(currentPrice * 1.05 / 5) * 5; // 5% OTM
  const call = chain.calls.find((c: any) => c.strike === strike) || chain.calls[0];

  const strategy: OptionsStrategy = {
    name: 'Covered Call',
    description: 'Own 100 shares + sell call option',
    legs: [
      { type: 'call', action: 'sell', strike: call.strike, expiration, contracts: 1, premium: call.bid },
    ],
  };

  return {
    strategy,
    suitability: 80,
    marketOutlook: 'neutral',
    reasoning: [
      'Generate income on existing shares',
      'Provides downside cushion equal to premium',
      'Ideal for sideways or slightly bullish market',
    ],
    pros: [
      'Immediate premium income',
      'Reduces cost basis of shares',
      'Works well in flat markets',
    ],
    cons: [
      'Requires owning 100 shares',
      'Caps upside profit at strike price',
      'Still exposed to downside risk',
    ],
    idealConditions: [
      'Own the underlying stock',
      'Neutral to slightly bullish outlook',
      'High implied volatility',
    ],
    riskLevel: 'low',
    capitalRequired: currentPrice * 100,
    maxProfit: (call.bid + (call.strike - currentPrice)) * 100,
    maxLoss: (currentPrice - call.bid) * 100,
    breakeven: [currentPrice - call.bid],
    bestFor: ['Income generation', 'Long-term shareholders', 'Dividend enhancement'],
  };
}

function createLongPutRecommendation(
  symbol: string,
  currentPrice: number,
  chain: any,
  expiration: string
): StrategyRecommendation {
  const strike = Math.round(currentPrice * 0.98 / 5) * 5; // Slightly OTM
  const put = chain.puts.find((p: any) => p.strike === strike) || chain.puts[0];

  const strategy: OptionsStrategy = {
    name: 'Long Put',
    description: 'Buy put option to profit from downside move',
    legs: [
      { type: 'put', action: 'buy', strike: put.strike, expiration, contracts: 1, premium: put.ask },
    ],
  };

  return {
    strategy,
    suitability: 85,
    marketOutlook: 'bearish',
    reasoning: [
      'Strong bearish signals detected',
      'Limited risk to premium paid',
      'High profit potential on downside',
    ],
    pros: [
      'Large profit potential if stock drops',
      'Limited risk to premium',
      'Alternative to short selling',
    ],
    cons: [
      'Time decay works against you',
      'Requires significant downward move',
      'Can lose 100% of premium',
    ],
    idealConditions: [
      'Strong bearish momentum',
      'Technical breakdown',
      'Negative catalysts ahead',
    ],
    riskLevel: 'medium',
    capitalRequired: put.ask * 100,
    maxProfit: (put.strike - put.ask) * 100,
    maxLoss: put.ask * 100,
    breakeven: [put.strike - put.ask],
    bestFor: ['Bearish traders', 'Portfolio hedging', 'Market correction plays'],
  };
}

function createBearPutSpreadRecommendation(
  symbol: string,
  currentPrice: number,
  chain: any,
  expiration: string
): StrategyRecommendation {
  const buyStrike = Math.round(currentPrice * 0.98 / 5) * 5;
  const sellStrike = Math.round(currentPrice * 0.92 / 5) * 5;

  const buyPut = chain.puts.find((p: any) => p.strike === buyStrike) || chain.puts[0];
  const sellPut = chain.puts.find((p: any) => p.strike === sellStrike) || chain.puts[chain.puts.length - 1];

  const strategy: OptionsStrategy = {
    name: 'Bear Put Spread',
    description: 'Buy higher strike put, sell lower strike put',
    legs: [
      { type: 'put', action: 'buy', strike: buyPut.strike, expiration, contracts: 1, premium: buyPut.ask },
      { type: 'put', action: 'sell', strike: sellPut.strike, expiration, contracts: 1, premium: sellPut.bid },
    ],
  };

  const netDebit = buyPut.ask - sellPut.bid;
  const maxProfit = (buyStrike - sellStrike - netDebit) * 100;

  return {
    strategy,
    suitability: 88,
    marketOutlook: 'bearish',
    reasoning: [
      'Lower cost than long put',
      'Defined risk and reward',
      'Ideal for moderate bearish outlook',
    ],
    pros: [
      'Lower cost than long put',
      'Defined maximum risk',
      'Profits from downside move',
    ],
    cons: [
      'Limited profit potential',
      'Requires stock to drop to profit zone',
      'Both legs can expire worthless',
    ],
    idealConditions: [
      'Moderate bearish outlook',
      'Defined support level as target',
      'High implied volatility',
    ],
    riskLevel: 'low',
    capitalRequired: netDebit * 100,
    maxProfit: maxProfit,
    maxLoss: netDebit * 100,
    breakeven: [buyStrike - netDebit],
    bestFor: ['Conservative bearish traders', 'Defined downside targets', 'Market hedges'],
  };
}

function createCashSecuredPutRecommendation(
  symbol: string,
  currentPrice: number,
  chain: any,
  expiration: string
): StrategyRecommendation {
  const strike = Math.round(currentPrice * 0.95 / 5) * 5; // 5% OTM
  const put = chain.puts.find((p: any) => p.strike === strike) || chain.puts[0];

  const strategy: OptionsStrategy = {
    name: 'Cash-Secured Put',
    description: 'Sell put option with cash reserved to buy shares',
    legs: [
      { type: 'put', action: 'sell', strike: put.strike, expiration, contracts: 1, premium: put.bid },
    ],
  };

  return {
    strategy,
    suitability: 75,
    marketOutlook: 'neutral',
    reasoning: [
      'Generate income while waiting to buy shares',
      'Get paid to set a buy order',
      'Lower effective cost basis if assigned',
    ],
    pros: [
      'Immediate premium income',
      'Can acquire shares at discount',
      'Works well in flat/slightly down markets',
    ],
    cons: [
      'Requires cash equal to strike × 100',
      'Miss gains if stock rallies',
      'Can be assigned and own shares',
    ],
    idealConditions: [
      'Want to own stock at lower price',
      'High implied volatility',
      'Neutral to slightly bearish outlook',
    ],
    riskLevel: 'low',
    capitalRequired: put.strike * 100,
    maxProfit: put.bid * 100,
    maxLoss: (put.strike - put.bid) * 100,
    breakeven: [put.strike - put.bid],
    bestFor: ['Income generation', 'Value investors', 'Buying dips'],
  };
}

function createIronCondorRecommendation(
  symbol: string,
  currentPrice: number,
  chain: any,
  expiration: string
): StrategyRecommendation {
  const sellPutStrike = Math.round(currentPrice * 0.95 / 5) * 5;
  const buyPutStrike = Math.round(currentPrice * 0.90 / 5) * 5;
  const sellCallStrike = Math.round(currentPrice * 1.05 / 5) * 5;
  const buyCallStrike = Math.round(currentPrice * 1.10 / 5) * 5;

  const sellPut = chain.puts.find((p: any) => p.strike === sellPutStrike) || chain.puts[0];
  const buyPut = chain.puts.find((p: any) => p.strike === buyPutStrike) || chain.puts[chain.puts.length - 1];
  const sellCall = chain.calls.find((c: any) => c.strike === sellCallStrike) || chain.calls[0];
  const buyCall = chain.calls.find((c: any) => c.strike === buyCallStrike) || chain.calls[chain.calls.length - 1];

  const strategy: OptionsStrategy = {
    name: 'Iron Condor',
    description: 'Sell OTM put spread + sell OTM call spread',
    legs: [
      { type: 'put', action: 'buy', strike: buyPut.strike, expiration, contracts: 1, premium: buyPut.ask },
      { type: 'put', action: 'sell', strike: sellPut.strike, expiration, contracts: 1, premium: sellPut.bid },
      { type: 'call', action: 'sell', strike: sellCall.strike, expiration, contracts: 1, premium: sellCall.bid },
      { type: 'call', action: 'buy', strike: buyCall.strike, expiration, contracts: 1, premium: buyCall.ask },
    ],
  };

  const netCredit = (sellPut.bid + sellCall.bid - buyPut.ask - buyCall.ask);

  return {
    strategy,
    suitability: 90,
    marketOutlook: 'neutral',
    reasoning: [
      'Profit from low volatility',
      'Stock expected to stay range-bound',
      'Premium decay works in your favor',
    ],
    pros: [
      'High probability of profit',
      'Defined maximum risk',
      'Benefits from time decay',
      'Can profit in neutral market',
    ],
    cons: [
      'Limited profit potential',
      'Requires active management',
      'Can lose more than credit received',
    ],
    idealConditions: [
      'Low volatility environment',
      'Stock trading in range',
      'After big moves (volatility contraction)',
    ],
    riskLevel: 'medium',
    capitalRequired: ((sellCallStrike - buyCallStrike) - netCredit) * 100,
    maxProfit: netCredit * 100,
    maxLoss: ((sellCallStrike - buyCallStrike) - netCredit) * 100,
    breakeven: [sellPut.strike - netCredit, sellCall.strike + netCredit],
    bestFor: ['Income generation', 'Range-bound markets', 'High IV environments'],
  };
}

function createButterflyRecommendation(
  symbol: string,
  currentPrice: number,
  chain: any,
  expiration: string
): StrategyRecommendation {
  const lowerStrike = Math.round(currentPrice * 0.97 / 5) * 5;
  const middleStrike = Math.round(currentPrice / 5) * 5;
  const upperStrike = Math.round(currentPrice * 1.03 / 5) * 5;

  const lowerCall = chain.calls.find((c: any) => c.strike === lowerStrike) || chain.calls[0];
  const middleCall = chain.calls.find((c: any) => c.strike === middleStrike) || chain.calls[Math.floor(chain.calls.length / 2)];
  const upperCall = chain.calls.find((c: any) => c.strike === upperStrike) || chain.calls[chain.calls.length - 1];

  const strategy: OptionsStrategy = {
    name: 'Butterfly Spread',
    description: 'Buy 1 ITM call, sell 2 ATM calls, buy 1 OTM call',
    legs: [
      { type: 'call', action: 'buy', strike: lowerCall.strike, expiration, contracts: 1, premium: lowerCall.ask },
      { type: 'call', action: 'sell', strike: middleCall.strike, expiration, contracts: 2, premium: middleCall.bid },
      { type: 'call', action: 'buy', strike: upperCall.strike, expiration, contracts: 1, premium: upperCall.ask },
    ],
  };

  const netDebit = lowerCall.ask + upperCall.ask - (2 * middleCall.bid);

  return {
    strategy,
    suitability: 85,
    marketOutlook: 'neutral',
    reasoning: [
      'Profit if stock stays near current price',
      'Very low capital requirement',
      'Limited risk',
    ],
    pros: [
      'Low cost to enter',
      'Limited risk',
      'High profit potential relative to risk',
    ],
    cons: [
      'Narrow profit zone',
      'All options can expire worthless',
      'Requires stock to stay in specific range',
    ],
    idealConditions: [
      'Expect stock to stay flat',
      'Near earnings (before move)',
      'Low current volatility',
    ],
    riskLevel: 'low',
    capitalRequired: netDebit * 100,
    maxProfit: (middleStrike - lowerStrike - netDebit) * 100,
    maxLoss: netDebit * 100,
    breakeven: [lowerStrike + netDebit, upperStrike - netDebit],
    bestFor: ['Very low risk tolerance', 'Precise price predictions', 'Small account traders'],
  };
}

function createLongStraddleRecommendation(
  symbol: string,
  currentPrice: number,
  chain: any,
  expiration: string
): StrategyRecommendation {
  const strike = Math.round(currentPrice / 5) * 5; // ATM

  const call = chain.calls.find((c: any) => c.strike === strike) || chain.calls[0];
  const put = chain.puts.find((p: any) => p.strike === strike) || chain.puts[0];

  const strategy: OptionsStrategy = {
    name: 'Long Straddle',
    description: 'Buy ATM call + buy ATM put',
    legs: [
      { type: 'call', action: 'buy', strike: call.strike, expiration, contracts: 1, premium: call.ask },
      { type: 'put', action: 'buy', strike: put.strike, expiration, contracts: 1, premium: put.ask },
    ],
  };

  const totalCost = call.ask + put.ask;

  return {
    strategy,
    suitability: 88,
    marketOutlook: 'volatile',
    reasoning: [
      'Profit from large move in either direction',
      'Ideal before major events (earnings, FDA approval)',
      'Unlimited profit potential both ways',
    ],
    pros: [
      'Profit from big moves up or down',
      'Unlimited profit potential',
      'Direction agnostic',
    ],
    cons: [
      'High cost (buying two options)',
      'Requires significant move to profit',
      'Time decay from both options',
    ],
    idealConditions: [
      'Major catalyst ahead (earnings, FDA)',
      'Low current IV, expecting spike',
      'Uncertain direction but big move expected',
    ],
    riskLevel: 'medium',
    capitalRequired: totalCost * 100,
    maxProfit: Infinity,
    maxLoss: totalCost * 100,
    breakeven: [strike - totalCost, strike + totalCost],
    bestFor: ['Earnings plays', 'Binary events', 'Volatility traders'],
  };
}

function createLongStrangleRecommendation(
  symbol: string,
  currentPrice: number,
  chain: any,
  expiration: string
): StrategyRecommendation {
  const putStrike = Math.round(currentPrice * 0.95 / 5) * 5; // 5% OTM
  const callStrike = Math.round(currentPrice * 1.05 / 5) * 5; // 5% OTM

  const call = chain.calls.find((c: any) => c.strike === callStrike) || chain.calls[0];
  const put = chain.puts.find((p: any) => p.strike === putStrike) || chain.puts[0];

  const strategy: OptionsStrategy = {
    name: 'Long Strangle',
    description: 'Buy OTM call + buy OTM put',
    legs: [
      { type: 'call', action: 'buy', strike: call.strike, expiration, contracts: 1, premium: call.ask },
      { type: 'put', action: 'buy', strike: put.strike, expiration, contracts: 1, premium: put.ask },
    ],
  };

  const totalCost = call.ask + put.ask;

  return {
    strategy,
    suitability: 85,
    marketOutlook: 'volatile',
    reasoning: [
      'Lower cost than straddle',
      'Profit from large move in either direction',
      'Good risk/reward for volatile events',
    ],
    pros: [
      'Lower cost than straddle',
      'Profit from big moves up or down',
      'Unlimited profit potential',
    ],
    cons: [
      'Requires larger move than straddle',
      'Time decay from both options',
      'Can lose entire premium',
    ],
    idealConditions: [
      'Volatile event ahead',
      'Uncertain direction',
      'Lower IV than straddle would suggest',
    ],
    riskLevel: 'medium',
    capitalRequired: totalCost * 100,
    maxProfit: Infinity,
    maxLoss: totalCost * 100,
    breakeven: [putStrike - totalCost, callStrike + totalCost],
    bestFor: ['Earnings plays (cheaper)', 'Binary events', 'Budget-conscious volatility traders'],
  };
}

function createIronButterflyRecommendation(
  symbol: string,
  currentPrice: number,
  chain: any,
  expiration: string
): StrategyRecommendation {
  const middleStrike = Math.round(currentPrice / 5) * 5;
  const wingStrike = Math.round(currentPrice * 0.05 / 5) * 5; // 5% wings

  const lowerStrike = middleStrike - wingStrike;
  const upperStrike = middleStrike + wingStrike;

  const lowerPut = chain.puts.find((p: any) => p.strike === lowerStrike) || chain.puts[chain.puts.length - 1];
  const middlePut = chain.puts.find((p: any) => p.strike === middleStrike) || chain.puts[0];
  const middleCall = chain.calls.find((c: any) => c.strike === middleStrike) || chain.calls[0];
  const upperCall = chain.calls.find((c: any) => c.strike === upperStrike) || chain.calls[chain.calls.length - 1];

  const strategy: OptionsStrategy = {
    name: 'Iron Butterfly',
    description: 'Sell ATM put & call, buy OTM put & call for protection',
    legs: [
      { type: 'put', action: 'buy', strike: lowerPut.strike, expiration, contracts: 1, premium: lowerPut.ask },
      { type: 'put', action: 'sell', strike: middlePut.strike, expiration, contracts: 1, premium: middlePut.bid },
      { type: 'call', action: 'sell', strike: middleCall.strike, expiration, contracts: 1, premium: middleCall.bid },
      { type: 'call', action: 'buy', strike: upperCall.strike, expiration, contracts: 1, premium: upperCall.ask },
    ],
  };

  const netCredit = middlePut.bid + middleCall.bid - lowerPut.ask - upperCall.ask;

  return {
    strategy,
    suitability: 82,
    marketOutlook: 'neutral',
    reasoning: [
      'Profit if stock stays at current price',
      'Higher credit than iron condor',
      'Good for post-volatility plays',
    ],
    pros: [
      'Higher premium than iron condor',
      'Defined risk',
      'Benefits from time decay and volatility decrease',
    ],
    cons: [
      'Very narrow profit zone',
      'Requires stock to stay at exact price',
      'Can lose quickly if stock moves',
    ],
    idealConditions: [
      'After big move (expect consolidation)',
      'High IV expected to contract',
      'Stock at technical pivot point',
    ],
    riskLevel: 'medium',
    capitalRequired: (wingStrike * 5 - netCredit) * 100,
    maxProfit: netCredit * 100,
    maxLoss: (wingStrike * 5 - netCredit) * 100,
    breakeven: [middleStrike - netCredit, middleStrike + netCredit],
    bestFor: ['High IV contraction plays', 'Post-earnings', 'Advanced traders'],
  };
}

/**
 * Compare multiple strategies and return recommendations
 */
export function compareStrategies(
  symbol: string,
  currentPrice: number,
  indicators: any,
  expiration: string
): StrategyComparison {
  const outlook = determineMarketOutlook(indicators, currentPrice);
  const recommendations = recommendStrategies(symbol, currentPrice, outlook, indicators, expiration);

  return {
    symbol,
    currentPrice,
    marketOutlook: outlook,
    recommendations,
    topRecommendation: recommendations[0],
  };
}
