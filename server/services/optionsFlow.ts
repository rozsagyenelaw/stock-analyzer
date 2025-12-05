/**
 * Options Flow Analysis Service
 * Tracks unusual options activity and identifies "smart money" moves
 */

export interface OptionsFlowData {
  symbol: string;
  timestamp: string;
  type: 'call' | 'put';
  strike: number;
  expiration: string;
  premium: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  underlyingPrice: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  size: 'small' | 'medium' | 'large' | 'block';
  unusual: boolean;
  spotGammaLevel?: number;
}

export interface FlowAnalysis {
  symbol: string;
  totalCallVolume: number;
  totalPutVolume: number;
  totalCallPremium: number;
  totalPutPremium: number;
  putCallRatio: number;
  netSentiment: 'bullish' | 'bearish' | 'neutral';
  unusualActivity: OptionsFlowData[];
  largestTrades: OptionsFlowData[];
  spotGammaExposure?: {
    level: number;
    strikes: { strike: number; gamma: number }[];
  };
}

/**
 * Generate simulated options flow data for a symbol
 * In production, this would connect to real-time options data feed
 */
export function generateOptionsFlow(
  symbol: string,
  currentPrice: number,
  count: number = 20
): OptionsFlowData[] {
  const flows: OptionsFlowData[] = [];
  const now = new Date();

  // Generate expirations (weekly and monthly)
  const expirations = [
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  ];

  for (let i = 0; i < count; i++) {
    const type = Math.random() > 0.5 ? 'call' : 'put';
    const strikeDistance = (Math.random() - 0.5) * 0.2; // -10% to +10%
    const strike = Math.round((currentPrice * (1 + strikeDistance)) / 5) * 5; // Round to nearest $5

    const expiration = expirations[Math.floor(Math.random() * expirations.length)];

    // Generate volume (favor larger volumes)
    const volumeBase = Math.floor(Math.random() * 5000);
    const volume = Math.floor(volumeBase * (Math.random() > 0.7 ? 10 : 1)); // 30% chance of 10x volume

    // Calculate premium (price per contract)
    const daysToExpiry = (new Date(expiration).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const moneyness = type === 'call' ? (strike - currentPrice) / currentPrice : (currentPrice - strike) / currentPrice;
    const basePrice = Math.max(0.5, currentPrice * 0.03 * Math.sqrt(daysToExpiry / 30) * (1 - Math.abs(moneyness) * 2));
    const premium = parseFloat(basePrice.toFixed(2));

    const totalPremium = premium * volume * 100; // Each contract is 100 shares

    // Determine size based on total premium
    let size: 'small' | 'medium' | 'large' | 'block';
    if (totalPremium > 1000000) size = 'block';
    else if (totalPremium > 250000) size = 'large';
    else if (totalPremium > 50000) size = 'medium';
    else size = 'small';

    // Unusual activity: large premium, high volume, or both
    const unusual = totalPremium > 100000 || volume > 2000 || (volume > 500 && totalPremium > 50000);

    // Sentiment based on strike vs current price
    let sentiment: 'bullish' | 'bearish' | 'neutral';
    if (type === 'call') {
      sentiment = strike > currentPrice * 1.05 ? 'bullish' : strike < currentPrice * 0.95 ? 'neutral' : 'bullish';
    } else {
      sentiment = strike < currentPrice * 0.95 ? 'bearish' : strike > currentPrice * 1.05 ? 'neutral' : 'bearish';
    }

    flows.push({
      symbol,
      timestamp: new Date(now.getTime() - Math.random() * 6 * 60 * 60 * 1000).toISOString(),
      type,
      strike,
      expiration,
      premium,
      volume,
      openInterest: Math.floor(volume * (1 + Math.random() * 3)),
      impliedVolatility: 0.2 + Math.random() * 0.6, // 20% to 80% IV
      underlyingPrice: currentPrice,
      sentiment,
      size,
      unusual,
      spotGammaLevel: Math.random() * 100,
    });
  }

  // Sort by timestamp (most recent first)
  return flows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Analyze options flow data for a symbol
 */
export function analyzeOptionsFlow(symbol: string, currentPrice: number): FlowAnalysis {
  const flows = generateOptionsFlow(symbol, currentPrice, 50);

  // Calculate metrics
  const callFlows = flows.filter(f => f.type === 'call');
  const putFlows = flows.filter(f => f.type === 'put');

  const totalCallVolume = callFlows.reduce((sum, f) => sum + f.volume, 0);
  const totalPutVolume = putFlows.reduce((sum, f) => sum + f.volume, 0);

  const totalCallPremium = callFlows.reduce((sum, f) => sum + (f.premium * f.volume * 100), 0);
  const totalPutPremium = putFlows.reduce((sum, f) => sum + (f.premium * f.volume * 100), 0);

  const putCallRatio = totalPutVolume / (totalCallVolume || 1);

  // Determine net sentiment
  let netSentiment: 'bullish' | 'bearish' | 'neutral';
  if (putCallRatio < 0.7) netSentiment = 'bullish';
  else if (putCallRatio > 1.3) netSentiment = 'bearish';
  else netSentiment = 'neutral';

  // Get unusual activity
  const unusualActivity = flows.filter(f => f.unusual).slice(0, 10);

  // Get largest trades by premium
  const largestTrades = [...flows]
    .sort((a, b) => (b.premium * b.volume) - (a.premium * a.volume))
    .slice(0, 10);

  // Calculate spot gamma exposure
  const strikes = [...new Set(flows.map(f => f.strike))].sort((a, b) => a - b);
  const gammaByStrike = strikes.map(strike => ({
    strike,
    gamma: flows
      .filter(f => f.strike === strike)
      .reduce((sum, f) => {
        const gamma = (f.spotGammaLevel || 0) * f.volume;
        return sum + (f.type === 'call' ? gamma : -gamma);
      }, 0)
  }));

  return {
    symbol,
    totalCallVolume,
    totalPutVolume,
    totalCallPremium,
    totalPutPremium,
    putCallRatio,
    netSentiment,
    unusualActivity,
    largestTrades,
    spotGammaExposure: {
      level: Math.abs(gammaByStrike.reduce((sum, s) => sum + s.gamma, 0)),
      strikes: gammaByStrike,
    },
  };
}

/**
 * Get real-time options flow alerts
 */
export function getFlowAlerts(symbols: string[], currentPrices: { [symbol: string]: number }): {
  symbol: string;
  alert: string;
  severity: 'high' | 'medium' | 'low';
  flow: OptionsFlowData;
}[] {
  const alerts: {
    symbol: string;
    alert: string;
    severity: 'high' | 'medium' | 'low';
    flow: OptionsFlowData;
  }[] = [];

  for (const symbol of symbols) {
    const price = currentPrices[symbol];
    if (!price) continue;

    const flows = generateOptionsFlow(symbol, price, 30);
    const unusual = flows.filter(f => f.unusual);

    for (const flow of unusual.slice(0, 3)) {
      const totalPremium = flow.premium * flow.volume * 100;

      let alert = '';
      let severity: 'high' | 'medium' | 'low' = 'low';

      if (flow.size === 'block') {
        alert = `BLOCK TRADE: $${(totalPremium / 1000000).toFixed(2)}M ${flow.type.toUpperCase()} sweep`;
        severity = 'high';
      } else if (totalPremium > 500000) {
        alert = `Large ${flow.type} order: $${(totalPremium / 1000).toFixed(0)}K premium`;
        severity = 'high';
      } else if (flow.volume > 2000) {
        alert = `High volume ${flow.type} activity: ${flow.volume.toLocaleString()} contracts`;
        severity = 'medium';
      } else {
        alert = `Unusual ${flow.type} activity at $${flow.strike}`;
        severity = 'medium';
      }

      alerts.push({ symbol, alert, severity, flow });
    }
  }

  return alerts.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
