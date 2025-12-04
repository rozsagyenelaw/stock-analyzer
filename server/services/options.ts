import type {
  OptionContract,
  OptionGreeks,
  OptionType,
  OptionsChain,
  OptionsFlow,
  OptionStrategy,
  OptionLeg,
  VolatilityAnalysis,
  UnusualActivity,
  StrategyTemplate,
  OptionsAnalysis,
} from '../../client/src/types';

// ============================================================================
// BLACK-SCHOLES MODEL & GREEKS CALCULATION
// ============================================================================

/**
 * Standard normal cumulative distribution function
 * Uses approximation for fast calculation
 */
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

/**
 * Standard normal probability density function
 */
function normalPDF(x: number): number {
  return Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
}

/**
 * Calculate d1 for Black-Scholes model
 */
function calculateD1(
  S: number, // Stock price
  K: number, // Strike price
  T: number, // Time to expiration (years)
  r: number, // Risk-free rate
  sigma: number // Volatility
): number {
  return (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
}

/**
 * Calculate d2 for Black-Scholes model
 */
function calculateD2(d1: number, sigma: number, T: number): number {
  return d1 - sigma * Math.sqrt(T);
}

/**
 * Black-Scholes option pricing model
 */
export function blackScholes(
  S: number, // Stock price
  K: number, // Strike price
  T: number, // Time to expiration (years)
  r: number, // Risk-free rate
  sigma: number, // Volatility (IV)
  type: OptionType
): number {
  if (T <= 0) {
    // At expiration, option is worth intrinsic value only
    return type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0);
  }

  const d1 = calculateD1(S, K, T, r, sigma);
  const d2 = calculateD2(d1, sigma, T);

  if (type === 'call') {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
  }
}

/**
 * Calculate all Greeks for an option
 */
export function calculateGreeks(
  S: number, // Stock price
  K: number, // Strike price
  T: number, // Time to expiration (years)
  r: number, // Risk-free rate
  sigma: number, // Volatility (IV)
  type: OptionType
): OptionGreeks {
  if (T <= 0) {
    return { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }

  const d1 = calculateD1(S, K, T, r, sigma);
  const d2 = calculateD2(d1, sigma, T);
  const Nd1 = normalCDF(d1);
  const Nd2 = normalCDF(d2);
  const nd1 = normalPDF(d1);

  let delta: number;
  let theta: number;
  let rho: number;

  if (type === 'call') {
    // Call Greeks
    delta = Nd1;
    theta =
      (-(S * nd1 * sigma) / (2 * Math.sqrt(T)) -
        r * K * Math.exp(-r * T) * Nd2) /
      365; // Per day
    rho = (K * T * Math.exp(-r * T) * Nd2) / 100; // Per 1% change
  } else {
    // Put Greeks
    delta = Nd1 - 1;
    theta =
      (-(S * nd1 * sigma) / (2 * Math.sqrt(T)) +
        r * K * Math.exp(-r * T) * normalCDF(-d2)) /
      365; // Per day
    rho = (-K * T * Math.exp(-r * T) * normalCDF(-d2)) / 100; // Per 1% change
  }

  // Gamma and Vega are the same for calls and puts
  const gamma = nd1 / (S * sigma * Math.sqrt(T));
  const vega = (S * nd1 * Math.sqrt(T)) / 100; // Per 1% change in IV

  return {
    delta: Number(delta.toFixed(4)),
    gamma: Number(gamma.toFixed(4)),
    theta: Number(theta.toFixed(4)),
    vega: Number(vega.toFixed(4)),
    rho: Number(rho.toFixed(4)),
  };
}

/**
 * Calculate implied volatility using Newton-Raphson method
 */
export function calculateImpliedVolatility(
  marketPrice: number,
  S: number,
  K: number,
  T: number,
  r: number,
  type: OptionType,
  maxIterations = 100,
  tolerance = 0.0001
): number {
  let sigma = 0.3; // Initial guess: 30% volatility

  for (let i = 0; i < maxIterations; i++) {
    const price = blackScholes(S, K, T, r, sigma, type);
    const diff = marketPrice - price;

    if (Math.abs(diff) < tolerance) {
      return sigma;
    }

    // Vega for Newton-Raphson iteration
    const d1 = calculateD1(S, K, T, r, sigma);
    const vega = S * normalPDF(d1) * Math.sqrt(T);

    if (vega < 0.0001) break; // Avoid division by zero

    sigma = sigma + diff / vega;

    // Keep sigma positive
    if (sigma <= 0) sigma = 0.01;
  }

  return sigma;
}

// ============================================================================
// OPTIONS CHAIN GENERATION
// ============================================================================

/**
 * Generate realistic options chain with full Greeks
 */
export function generateOptionsChain(
  symbol: string,
  underlyingPrice: number,
  expirationDate: string,
  riskFreeRate = 0.05
): OptionsChain {
  const expiration = new Date(expirationDate);
  const now = new Date();
  const daysToExpiration = Math.max(
    1,
    Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );
  const T = daysToExpiration / 365; // Time in years

  // Generate strikes centered around current price
  const strikeCount = 15;
  const strikeInterval = underlyingPrice * 0.025; // 2.5% intervals
  const strikes: number[] = [];

  for (let i = -Math.floor(strikeCount / 2); i <= Math.floor(strikeCount / 2); i++) {
    const strike = Math.round((underlyingPrice + i * strikeInterval) / 5) * 5; // Round to $5
    strikes.push(strike);
  }

  // Base IV adjusted by time and moneyness
  const baseIV = 0.25 + (daysToExpiration < 30 ? 0.1 : 0); // IV crush near expiration
  const calls: OptionContract[] = [];
  const puts: OptionContract[] = [];

  strikes.forEach((strike) => {
    const moneyness = strike / underlyingPrice;

    // Volatility smile/skew
    const ivSkew = Math.abs(moneyness - 1) * 0.15;
    const putSkew = moneyness < 1 ? 0.05 : 0; // OTM puts have higher IV
    const callIV = baseIV + ivSkew;
    const putIV = baseIV + ivSkew + putSkew;

    // Calculate intrinsic and extrinsic values
    const callIntrinsic = Math.max(underlyingPrice - strike, 0);
    const putIntrinsic = Math.max(strike - underlyingPrice, 0);

    // Calculate theoretical prices using Black-Scholes
    const callPrice = blackScholes(underlyingPrice, strike, T, riskFreeRate, callIV, 'call');
    const putPrice = blackScholes(underlyingPrice, strike, T, riskFreeRate, putIV, 'put');

    // Calculate Greeks
    const callGreeks = calculateGreeks(underlyingPrice, strike, T, riskFreeRate, callIV, 'call');
    const putGreeks = calculateGreeks(underlyingPrice, strike, T, riskFreeRate, putIV, 'put');

    // Generate realistic bid/ask spreads
    const callSpread = Math.max(0.05, callPrice * 0.02);
    const putSpread = Math.max(0.05, putPrice * 0.02);

    // Volume and open interest (higher for ATM options)
    const atmFactor = 1 - Math.min(0.9, Math.abs(moneyness - 1) * 2);
    const baseVolume = Math.floor(atmFactor * 1000 + Math.random() * 500);
    const baseOI = Math.floor(atmFactor * 5000 + Math.random() * 2000);

    // Probability ITM based on delta
    const callProbITM = Math.abs(callGreeks.delta);
    const putProbITM = Math.abs(putGreeks.delta);

    // Generate option symbols (OCC format)
    const expString = expiration.toISOString().slice(2, 10).replace(/-/g, '');
    const strikeString = (strike * 1000).toString().padStart(8, '0');

    const callContract: OptionContract = {
      symbol: `${symbol}${expString}C${strikeString}`,
      strike,
      expiration: expirationDate,
      type: 'call',
      bid: Number((callPrice - callSpread / 2).toFixed(2)),
      ask: Number((callPrice + callSpread / 2).toFixed(2)),
      last: Number(callPrice.toFixed(2)),
      volume: baseVolume,
      openInterest: baseOI,
      impliedVolatility: Number(callIV.toFixed(4)),
      greeks: callGreeks,
      inTheMoney: underlyingPrice > strike,
      daysToExpiration,
      intrinsicValue: Number(callIntrinsic.toFixed(2)),
      extrinsicValue: Number((callPrice - callIntrinsic).toFixed(2)),
      breakeven: Number((strike + callPrice).toFixed(2)),
      probabilityITM: Number((callProbITM * 100).toFixed(1)),
    };

    const putContract: OptionContract = {
      symbol: `${symbol}${expString}P${strikeString}`,
      strike,
      expiration: expirationDate,
      type: 'put',
      bid: Number((putPrice - putSpread / 2).toFixed(2)),
      ask: Number((putPrice + putSpread / 2).toFixed(2)),
      last: Number(putPrice.toFixed(2)),
      volume: Math.floor(baseVolume * 1.1), // Puts tend to have slightly more volume
      openInterest: Math.floor(baseOI * 1.15),
      impliedVolatility: Number(putIV.toFixed(4)),
      greeks: putGreeks,
      inTheMoney: underlyingPrice < strike,
      daysToExpiration,
      intrinsicValue: Number(putIntrinsic.toFixed(2)),
      extrinsicValue: Number((putPrice - putIntrinsic).toFixed(2)),
      breakeven: Number((strike - putPrice).toFixed(2)),
      probabilityITM: Number((putProbITM * 100).toFixed(1)),
    };

    calls.push(callContract);
    puts.push(putContract);
  });

  // Calculate average IV for the chain
  const avgIV = (calls.reduce((sum, c) => sum + c.impliedVolatility, 0) / calls.length +
    puts.reduce((sum, p) => sum + p.impliedVolatility, 0) / puts.length) / 2;

  return {
    symbol,
    underlyingPrice,
    expiration: expirationDate,
    daysToExpiration,
    calls,
    puts,
    impliedVolatility: Number(avgIV.toFixed(4)),
  };
}

// ============================================================================
// UNUSUAL ACTIVITY DETECTION
// ============================================================================

/**
 * Detect unusual options activity
 */
export function detectUnusualActivity(
  contracts: OptionContract[],
  underlyingPrice: number
): UnusualActivity[] {
  const unusual: UnusualActivity[] = [];

  contracts.forEach((contract) => {
    const volumeOIRatio = contract.openInterest > 0 ? contract.volume / contract.openInterest : 0;
    const premium = contract.volume * contract.last * 100; // Options are per 100 shares

    const flags: UnusualActivity['flags'] = [];
    let score = 0;

    // High volume indicator
    if (contract.volume > 1000) {
      flags.push('high_volume');
      score += 20;
    }

    // Volume to Open Interest ratio
    if (volumeOIRatio > 2) {
      flags.push('unusual_sweep');
      score += 25;
    }

    if (volumeOIRatio > 5) {
      flags.push('golden_sweep');
      score += 40;
    }

    // Large premium
    if (premium > 100000) {
      flags.push('block_trade');
      score += 30;
    }

    // Price relative to bid/ask (aggressive orders)
    if (contract.last >= contract.ask) {
      flags.push('above_ask');
      score += 15;
    }

    if (contract.last <= contract.bid) {
      flags.push('below_bid');
      score += 15;
    }

    // Only report if score is significant
    if (score >= 40) {
      // Determine sentiment
      let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (contract.type === 'call') {
        sentiment = flags.includes('above_ask') ? 'bullish' : 'neutral';
      } else {
        sentiment = flags.includes('above_ask') ? 'bearish' : 'neutral';
      }

      unusual.push({
        symbol: contract.symbol,
        contract,
        timestamp: new Date().toISOString(),
        volume: contract.volume,
        openInterest: contract.openInterest,
        volumeOIRatio: Number(volumeOIRatio.toFixed(2)),
        premium: Number(premium.toFixed(2)),
        sentiment,
        score: Math.min(100, score),
        flags,
      });
    }
  });

  // Sort by score descending
  return unusual.sort((a, b) => b.score - a.score);
}

/**
 * Generate options flow analysis
 */
export function generateOptionsFlow(
  symbol: string,
  chains: OptionsChain[]
): OptionsFlow {
  const allCalls = chains.flatMap((c) => c.calls);
  const allPuts = chains.flatMap((c) => c.puts);

  const totalCallVolume = allCalls.reduce((sum, c) => sum + c.volume, 0);
  const totalPutVolume = allPuts.reduce((sum, p) => sum + p.volume, 0);
  const totalCallOI = allCalls.reduce((sum, c) => sum + c.openInterest, 0);
  const totalPutOI = allPuts.reduce((sum, p) => sum + p.openInterest, 0);

  const netCallPremium = allCalls.reduce((sum, c) => sum + c.volume * c.last * 100, 0);
  const netPutPremium = allPuts.reduce((sum, p) => sum + p.volume * p.last * 100, 0);

  const putCallRatio = totalPutVolume / Math.max(totalCallVolume, 1);

  // Sentiment calculation
  let sentimentScore = 0;
  sentimentScore += ((totalCallVolume - totalPutVolume) / (totalCallVolume + totalPutVolume)) * 50;
  sentimentScore += ((netCallPremium - netPutPremium) / (netCallPremium + netPutPremium)) * 50;

  const sentiment: 'bullish' | 'bearish' | 'neutral' =
    sentimentScore > 20 ? 'bullish' : sentimentScore < -20 ? 'bearish' : 'neutral';

  // Detect unusual activity
  const unusualActivity = detectUnusualActivity([...allCalls, ...allPuts], chains[0].underlyingPrice);

  // Find block trades (top 10 by premium)
  const blockTrades = [...allCalls, ...allPuts]
    .map((contract) => ({
      contract,
      side: 'buy' as const,
      size: contract.volume,
      premium: contract.volume * contract.last * 100,
      timestamp: new Date().toISOString(),
    }))
    .sort((a, b) => b.premium - a.premium)
    .slice(0, 10);

  return {
    symbol,
    date: new Date().toISOString(),
    underlyingPrice: chains[0].underlyingPrice,
    totalCallVolume,
    totalPutVolume,
    putCallRatio: Number(putCallRatio.toFixed(3)),
    totalCallOI,
    totalPutOI,
    netCallPremium: Number(netCallPremium.toFixed(2)),
    netPutPremium: Number(netPutPremium.toFixed(2)),
    sentiment,
    sentimentScore: Number(sentimentScore.toFixed(1)),
    unusualActivity,
    blockTrades,
  };
}

// ============================================================================
// VOLATILITY ANALYSIS
// ============================================================================

/**
 * Generate comprehensive volatility analysis
 */
export function generateVolatilityAnalysis(
  symbol: string,
  chains: OptionsChain[]
): VolatilityAnalysis {
  // Calculate current IV from chains
  const allContracts = chains.flatMap((c) => [...c.calls, ...c.puts]);
  const currentIV = allContracts.reduce((sum, c) => sum + c.impliedVolatility, 0) / allContracts.length;

  // Simulate historical volatility (in production, calculate from price history)
  const historicalVolatility = currentIV * (0.8 + Math.random() * 0.4);

  // IV Rank and Percentile (simulated)
  const ivRank = Math.floor(Math.random() * 100);
  const ivPercentile = Math.floor(Math.random() * 100);

  // Volatility term structure
  const volatilityTermStructure = chains.map((chain) => ({
    expiration: chain.expiration,
    daysToExpiration: chain.daysToExpiration,
    iv: chain.impliedVolatility,
  }));

  // Calculate IV skew
  const atmContracts = chains[0];
  const atmStrike = atmContracts.calls.reduce((prev, curr) =>
    Math.abs(curr.strike - atmContracts.underlyingPrice) <
    Math.abs(prev.strike - atmContracts.underlyingPrice)
      ? curr
      : prev
  );

  const otmCalls = atmContracts.calls.filter(
    (c) => c.strike > atmContracts.underlyingPrice * 1.05
  );
  const otmPuts = atmContracts.puts.filter(
    (p) => p.strike < atmContracts.underlyingPrice * 0.95
  );

  const atmIV = atmStrike.impliedVolatility;
  const otmCallIV = otmCalls.length > 0
    ? otmCalls.reduce((sum, c) => sum + c.impliedVolatility, 0) / otmCalls.length
    : atmIV;
  const otmPutIV = otmPuts.length > 0
    ? otmPuts.reduce((sum, p) => sum + p.impliedVolatility, 0) / otmPuts.length
    : atmIV;

  return {
    symbol,
    currentIV: Number(currentIV.toFixed(4)),
    historicalVolatility: Number(historicalVolatility.toFixed(4)),
    ivRank,
    ivPercentile,
    volatilityTermStructure,
    skew: {
      atmIV: Number(atmIV.toFixed(4)),
      otmCallIV: Number(otmCallIV.toFixed(4)),
      otmPutIV: Number(otmPutIV.toFixed(4)),
      skewRatio: Number((otmPutIV / otmCallIV).toFixed(3)),
    },
  };
}

// ============================================================================
// STRATEGY ANALYZER
// ============================================================================

/**
 * Calculate profit/loss for an option leg at a given price
 */
function calculateLegPnL(
  leg: OptionLeg,
  currentPrice: number,
  atExpiration = false
): number {
  const contract = leg.contract;
  const multiplier = leg.side === 'buy' ? 1 : -1;

  if (atExpiration) {
    // At expiration, option is worth intrinsic value only
    const intrinsicValue =
      contract.type === 'call'
        ? Math.max(currentPrice - contract.strike, 0)
        : Math.max(contract.strike - currentPrice, 0);

    // Entry cost (premium paid/received)
    const entryCost = contract.last;

    // PnL = (Exit value - Entry cost) * multiplier * quantity * 100
    return (intrinsicValue - entryCost) * multiplier * leg.quantity * 100;
  } else {
    // Before expiration, use Black-Scholes for current value
    const T = contract.daysToExpiration / 365;
    const r = 0.05;

    const currentValue = blackScholes(
      currentPrice,
      contract.strike,
      T,
      r,
      contract.impliedVolatility,
      contract.type
    );

    const entryCost = contract.last;
    return (currentValue - entryCost) * multiplier * leg.quantity * 100;
  }
}

/**
 * Analyze a complete options strategy
 */
export function analyzeStrategy(
  strategy: Omit<OptionStrategy, 'maxProfit' | 'maxLoss' | 'breakevens' | 'netDebit' | 'probabilityOfProfit' | 'expectedValue' | 'returnOnRisk' | 'totalGreeks' | 'profitLossProfile'>,
  underlyingPrice: number
): OptionStrategy {
  // Calculate net debit/credit
  const netDebit = strategy.legs.reduce((sum, leg) => {
    const multiplier = leg.side === 'buy' ? 1 : -1;
    return sum + multiplier * leg.contract.last * leg.quantity * 100;
  }, 0);

  // Calculate total Greeks
  const totalGreeks: OptionGreeks = strategy.legs.reduce(
    (total, leg) => {
      const multiplier = leg.side === 'buy' ? 1 : -1;
      return {
        delta: total.delta + leg.contract.greeks.delta * multiplier * leg.quantity,
        gamma: total.gamma + leg.contract.greeks.gamma * multiplier * leg.quantity,
        theta: total.theta + leg.contract.greeks.theta * multiplier * leg.quantity,
        vega: total.vega + leg.contract.greeks.vega * multiplier * leg.quantity,
        rho: total.rho + leg.contract.greeks.rho * multiplier * leg.quantity,
      };
    },
    { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
  );

  // Generate P&L profile across price range
  const priceRange = underlyingPrice * 0.5; // +/- 50% from current price
  const priceStep = underlyingPrice * 0.01; // 1% steps
  const profitLossProfile: OptionStrategy['profitLossProfile'] = [];

  let maxProfit = netDebit < 0 ? Math.abs(netDebit) : -Infinity;
  let maxLoss = netDebit > 0 ? -netDebit : Infinity;
  const breakevens: number[] = [];
  let lastPnL = 0;

  for (
    let price = underlyingPrice - priceRange;
    price <= underlyingPrice + priceRange;
    price += priceStep
  ) {
    // Calculate P&L at current price (now)
    const pnlNow = strategy.legs.reduce(
      (sum, leg) => sum + calculateLegPnL(leg, price, false),
      0
    );

    // Calculate P&L at expiration
    const pnlExpiration = strategy.legs.reduce(
      (sum, leg) => sum + calculateLegPnL(leg, price, true),
      0
    );

    profitLossProfile.push({
      price: Number(price.toFixed(2)),
      profitLoss: Number(pnlNow.toFixed(2)),
      atExpiration: Number(pnlExpiration.toFixed(2)),
    });

    // Track max profit/loss at expiration
    if (pnlExpiration > maxProfit) maxProfit = pnlExpiration;
    if (pnlExpiration < maxLoss) maxLoss = pnlExpiration;

    // Detect breakevens (where P&L crosses zero)
    if ((lastPnL < 0 && pnlExpiration > 0) || (lastPnL > 0 && pnlExpiration < 0)) {
      breakevens.push(Number(price.toFixed(2)));
    }
    lastPnL = pnlExpiration;
  }

  // Calculate probability of profit (simplified using delta)
  // For short-term trading, positive delta = bullish, negative = bearish
  const probabilityOfProfit = 50 + totalGreeks.delta * 10; // Rough estimate

  // Expected value (simplified)
  const expectedValue = (maxProfit * (probabilityOfProfit / 100)) +
    (maxLoss * (1 - probabilityOfProfit / 100));

  // Return on risk
  const risk = Math.abs(maxLoss);
  const returnOnRisk = risk > 0 ? (maxProfit / risk) * 100 : 0;

  return {
    ...strategy,
    maxProfit: maxProfit === Infinity ? null : Number(maxProfit.toFixed(2)),
    maxLoss: maxLoss === -Infinity ? null : Number(maxLoss.toFixed(2)),
    breakevens,
    netDebit: Number(netDebit.toFixed(2)),
    probabilityOfProfit: Number(Math.max(0, Math.min(100, probabilityOfProfit)).toFixed(1)),
    expectedValue: Number(expectedValue.toFixed(2)),
    returnOnRisk: Number(returnOnRisk.toFixed(2)),
    totalGreeks: {
      delta: Number(totalGreeks.delta.toFixed(4)),
      gamma: Number(totalGreeks.gamma.toFixed(4)),
      theta: Number(totalGreeks.theta.toFixed(4)),
      vega: Number(totalGreeks.vega.toFixed(4)),
      rho: Number(totalGreeks.rho.toFixed(4)),
    },
    profitLossProfile,
  };
}

/**
 * Build strategy from template
 */
export function buildStrategyFromTemplate(
  template: StrategyTemplate,
  chain: OptionsChain,
  targetDTE?: number
): OptionStrategy | null {
  const { underlyingPrice, calls, puts } = chain;

  // Find ATM strike
  const atmStrike = calls.reduce((prev, curr) =>
    Math.abs(curr.strike - underlyingPrice) < Math.abs(prev.strike - underlyingPrice)
      ? curr
      : prev
  ).strike;

  const atmCall = calls.find((c) => c.strike === atmStrike);
  const atmPut = puts.find((p) => p.strike === atmStrike);

  if (!atmCall || !atmPut) return null;

  let legs: OptionLeg[] = [];
  let name = '';
  let description = '';

  switch (template) {
    case 'long_call':
      legs = [
        {
          id: '1',
          contract: atmCall,
          side: 'buy',
          quantity: 1,
        },
      ];
      name = 'Long Call';
      description = 'Bullish strategy with unlimited upside potential';
      break;

    case 'long_put':
      legs = [
        {
          id: '1',
          contract: atmPut,
          side: 'buy',
          quantity: 1,
        },
      ];
      name = 'Long Put';
      description = 'Bearish strategy with high profit potential';
      break;

    case 'covered_call': {
      const otmCall = calls.find((c) => c.strike > underlyingPrice * 1.03);
      if (!otmCall) return null;
      legs = [
        {
          id: '1',
          contract: otmCall,
          side: 'sell',
          quantity: 1,
        },
      ];
      name = 'Covered Call';
      description = 'Generate income on stock holdings';
      break;
    }

    case 'cash_secured_put': {
      const otmPut = puts.find((p) => p.strike < underlyingPrice * 0.97);
      if (!otmPut) return null;
      legs = [
        {
          id: '1',
          contract: otmPut,
          side: 'sell',
          quantity: 1,
        },
      ];
      name = 'Cash-Secured Put';
      description = 'Generate income or acquire stock at discount';
      break;
    }

    case 'bull_call_spread': {
      const longCall = calls.find((c) => c.strike >= atmStrike);
      const shortCall = calls.find((c) => c.strike > atmStrike * 1.05);
      if (!longCall || !shortCall) return null;
      legs = [
        { id: '1', contract: longCall, side: 'buy', quantity: 1 },
        { id: '2', contract: shortCall, side: 'sell', quantity: 1 },
      ];
      name = 'Bull Call Spread';
      description = 'Limited risk bullish strategy';
      break;
    }

    case 'bear_put_spread': {
      const longPut = puts.find((p) => p.strike >= atmStrike);
      const shortPut = puts.find((p) => p.strike < atmStrike * 0.95);
      if (!longPut || !shortPut) return null;
      legs = [
        { id: '1', contract: longPut, side: 'buy', quantity: 1 },
        { id: '2', contract: shortPut, side: 'sell', quantity: 1 },
      ];
      name = 'Bear Put Spread';
      description = 'Limited risk bearish strategy';
      break;
    }

    case 'iron_condor': {
      const shortCallStrike = atmStrike * 1.05;
      const shortPutStrike = atmStrike * 0.95;
      const longCallStrike = atmStrike * 1.10;
      const longPutStrike = atmStrike * 0.90;

      const shortCall = calls.find((c) => c.strike >= shortCallStrike);
      const shortPut = puts.find((p) => p.strike <= shortPutStrike);
      const longCall = calls.find((c) => c.strike >= longCallStrike);
      const longPut = puts.find((p) => p.strike <= longPutStrike);

      if (!shortCall || !shortPut || !longCall || !longPut) return null;

      legs = [
        { id: '1', contract: longPut, side: 'buy', quantity: 1 },
        { id: '2', contract: shortPut, side: 'sell', quantity: 1 },
        { id: '3', contract: shortCall, side: 'sell', quantity: 1 },
        { id: '4', contract: longCall, side: 'buy', quantity: 1 },
      ];
      name = 'Iron Condor';
      description = 'Profit from low volatility within range';
      break;
    }

    case 'long_straddle':
      legs = [
        { id: '1', contract: atmCall, side: 'buy', quantity: 1 },
        { id: '2', contract: atmPut, side: 'buy', quantity: 1 },
      ];
      name = 'Long Straddle';
      description = 'Profit from high volatility in either direction';
      break;

    case 'short_straddle':
      legs = [
        { id: '1', contract: atmCall, side: 'sell', quantity: 1 },
        { id: '2', contract: atmPut, side: 'sell', quantity: 1 },
      ];
      name = 'Short Straddle';
      description = 'Profit from low volatility (high risk)';
      break;

    default:
      return null;
  }

  return analyzeStrategy({ name, description, legs }, underlyingPrice);
}

/**
 * Generate comprehensive options analysis
 */
export function generateOptionsAnalysis(
  symbol: string,
  underlyingPrice: number
): OptionsAnalysis {
  // Generate multiple expiration chains
  const expirations = [7, 14, 30, 45, 60, 90]; // Days
  const chains: OptionsChain[] = expirations.map((days) => {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + days);
    return generateOptionsChain(symbol, underlyingPrice, expDate.toISOString().split('T')[0]);
  });

  // Generate flow analysis
  const flow = generateOptionsFlow(symbol, chains);

  // Generate volatility analysis
  const volatility = generateVolatilityAnalysis(symbol, chains);

  // Suggest strategies based on market conditions
  const suggestedStrategies: OptionsAnalysis['suggestedStrategies'] = [];

  // Use 30-day chain for strategy suggestions
  const chain30 = chains[2];

  // Bullish strategies if sentiment is bullish
  if (flow.sentiment === 'bullish') {
    const bullCallSpread = buildStrategyFromTemplate('bull_call_spread', chain30);
    if (bullCallSpread) {
      suggestedStrategies.push({
        template: 'bull_call_spread',
        strategy: bullCallSpread,
        reasoning: 'Options flow shows bullish sentiment with strong call buying',
        suitability: 85,
      });
    }
  }

  // Bearish strategies if sentiment is bearish
  if (flow.sentiment === 'bearish') {
    const bearPutSpread = buildStrategyFromTemplate('bear_put_spread', chain30);
    if (bearPutSpread) {
      suggestedStrategies.push({
        template: 'bear_put_spread',
        strategy: bearPutSpread,
        reasoning: 'Options flow shows bearish sentiment with strong put buying',
        suitability: 85,
      });
    }
  }

  // High IV strategies
  if (volatility.ivRank > 70) {
    const shortStraddle = buildStrategyFromTemplate('short_straddle', chain30);
    if (shortStraddle) {
      suggestedStrategies.push({
        template: 'short_straddle',
        strategy: shortStraddle,
        reasoning: `IV Rank is ${volatility.ivRank}% - premium selling opportunity`,
        suitability: 75,
      });
    }

    const ironCondor = buildStrategyFromTemplate('iron_condor', chain30);
    if (ironCondor) {
      suggestedStrategies.push({
        template: 'iron_condor',
        strategy: ironCondor,
        reasoning: 'High IV makes credit spreads attractive',
        suitability: 80,
      });
    }
  }

  // Low IV strategies
  if (volatility.ivRank < 30) {
    const longStraddle = buildStrategyFromTemplate('long_straddle', chain30);
    if (longStraddle) {
      suggestedStrategies.push({
        template: 'long_straddle',
        strategy: longStraddle,
        reasoning: `IV Rank is ${volatility.ivRank}% - volatility expansion opportunity`,
        suitability: 70,
      });
    }
  }

  // Income strategies (neutral market)
  if (flow.sentiment === 'neutral') {
    const coveredCall = buildStrategyFromTemplate('covered_call', chain30);
    if (coveredCall) {
      suggestedStrategies.push({
        template: 'covered_call',
        strategy: coveredCall,
        reasoning: 'Neutral market conditions favor income strategies',
        suitability: 75,
      });
    }
  }

  return {
    symbol,
    underlyingPrice,
    chains,
    flow,
    volatility,
    suggestedStrategies: suggestedStrategies.sort((a, b) => b.suitability - a.suitability),
  };
}
