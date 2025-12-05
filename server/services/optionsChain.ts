import axios from 'axios';
import NodeCache from 'node-cache';

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;
const TWELVE_DATA_URL = 'https://api.twelvedata.com';

// Cache options data for 5 minutes (prices change fast)
const optionsCache = new NodeCache({ stdTTL: 300 });

interface OptionContract {
  symbol: string;
  strike: number;
  expiration: string;
  type: 'call' | 'put';
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  inTheMoney: boolean;
}

interface OptionsChain {
  symbol: string;
  stockPrice: number;
  timestamp: string;
  expirations: string[];
  calls: OptionContract[];
  puts: OptionContract[];
}

interface GreeksCalculation {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

/**
 * Fetch options expiration dates for a symbol
 */
export async function getOptionsExpirations(symbol: string): Promise<string[]> {
  const cacheKey = `expirations_${symbol}`;
  const cached = optionsCache.get<string[]>(cacheKey);
  if (cached) return cached;

  if (!TWELVE_DATA_API_KEY) {
    throw new Error('TWELVE_DATA_API_KEY not configured');
  }

  try {
    const response = await axios.get(`${TWELVE_DATA_URL}/options/expiration`, {
      params: {
        symbol,
        apikey: TWELVE_DATA_API_KEY,
      },
      timeout: 10000,
    });

    const expirations = response.data.expirations || [];
    optionsCache.set(cacheKey, expirations);
    return expirations;
  } catch (error: any) {
    console.error(`Error fetching expirations for ${symbol}:`, error.message);

    // Fallback: generate common expiration dates
    return generateFallbackExpirations();
  }
}

/**
 * Fetch full options chain for a symbol and expiration
 */
export async function getOptionsChain(
  symbol: string,
  expiration?: string
): Promise<OptionsChain> {
  const cacheKey = `chain_${symbol}_${expiration || 'nearest'}`;
  const cached = optionsCache.get<OptionsChain>(cacheKey);
  if (cached) return cached;

  if (!TWELVE_DATA_API_KEY) {
    throw new Error('TWELVE_DATA_API_KEY not configured');
  }

  try {
    // If no expiration specified, get nearest one
    if (!expiration) {
      const expirations = await getOptionsExpirations(symbol);
      expiration = expirations[0];
    }

    const response = await axios.get(`${TWELVE_DATA_URL}/options/chain`, {
      params: {
        symbol,
        expiration_date: expiration,
        apikey: TWELVE_DATA_API_KEY,
      },
      timeout: 15000,
    });

    const chain: OptionsChain = {
      symbol,
      stockPrice: response.data.stock_price || 0,
      timestamp: new Date().toISOString(),
      expirations: response.data.expirations || [expiration],
      calls: response.data.calls?.map(formatOptionContract) || [],
      puts: response.data.puts?.map(formatOptionContract) || [],
    };

    optionsCache.set(cacheKey, chain);
    return chain;
  } catch (error: any) {
    console.error(`Error fetching options chain for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch options chain: ${error.message}`);
  }
}

/**
 * Calculate Greeks for an option using Black-Scholes model
 * Note: This is a simplified implementation. For production, use a proper options pricing library
 */
export function calculateGreeks(
  stockPrice: number,
  strikePrice: number,
  daysToExpiration: number,
  volatility: number,
  riskFreeRate: number,
  optionType: 'call' | 'put'
): GreeksCalculation {
  const T = daysToExpiration / 365;
  const S = stockPrice;
  const K = strikePrice;
  const sigma = volatility;
  const r = riskFreeRate;

  // Avoid division by zero
  if (T === 0 || sigma === 0) {
    return { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }

  const d1 = (Math.log(S / K) + (r + (sigma ** 2) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  // Standard normal CDF
  const normalCDF = (x: number): number => {
    return (1 + erf(x / Math.sqrt(2))) / 2;
  };

  // Standard normal PDF
  const normalPDF = (x: number): number => {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  };

  // Error function approximation
  function erf(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1 / (1 + p * x);
    const y = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;

    return sign * (1 - y * Math.exp(-x * x));
  }

  const Nd1 = normalCDF(d1);
  const Nd2 = normalCDF(d2);
  const nd1 = normalPDF(d1);

  let delta: number;
  let rho: number;

  if (optionType === 'call') {
    delta = Nd1;
    rho = K * T * Math.exp(-r * T) * Nd2 / 100;
  } else {
    delta = Nd1 - 1;
    rho = -K * T * Math.exp(-r * T) * normalCDF(-d2) / 100;
  }

  const gamma = nd1 / (S * sigma * Math.sqrt(T));
  const vega = S * nd1 * Math.sqrt(T) / 100;
  const theta = -(S * nd1 * sigma) / (2 * Math.sqrt(T)) / 365;

  if (optionType === 'call') {
    theta -= (r * K * Math.exp(-r * T) * Nd2) / 365;
  } else {
    theta += (r * K * Math.exp(-r * T) * normalCDF(-d2)) / 365;
  }

  return {
    delta: Number(delta.toFixed(4)),
    gamma: Number(gamma.toFixed(4)),
    theta: Number(theta.toFixed(4)),
    vega: Number(vega.toFixed(4)),
    rho: Number(rho.toFixed(4)),
  };
}

/**
 * Calculate IV Rank: (Current IV - 52wk Low) / (52wk High - 52wk Low) * 100
 */
export function calculateIVRank(currentIV: number, ivLow52w: number, ivHigh52w: number): number {
  if (ivHigh52w === ivLow52w) return 50;
  return ((currentIV - ivLow52w) / (ivHigh52w - ivLow52w)) * 100;
}

/**
 * Calculate probability of profit (simplified using delta)
 */
export function calculateProbabilityOfProfit(
  delta: number,
  strategy: 'sell_put' | 'sell_call' | 'buy_call' | 'buy_put'
): number {
  switch (strategy) {
    case 'sell_put':
      return (1 - Math.abs(delta)) * 100; // Probability stock stays above strike
    case 'sell_call':
      return (1 - delta) * 100; // Probability stock stays below strike
    case 'buy_call':
      return delta * 100; // Probability of ITM
    case 'buy_put':
      return Math.abs(delta) * 100; // Probability of ITM
    default:
      return 50;
  }
}

/**
 * Calculate annualized return
 */
export function calculateAnnualizedReturn(
  premium: number,
  buyingPower: number,
  daysToExpiration: number
): number {
  if (buyingPower === 0 || daysToExpiration === 0) return 0;
  return ((premium / buyingPower) * (365 / daysToExpiration)) * 100;
}

/**
 * Calculate days to expiration
 */
export function calculateDTE(expirationDate: string): number {
  const expiration = new Date(expirationDate);
  const now = new Date();
  const diff = expiration.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Format option contract from API response
 */
function formatOptionContract(contract: any): OptionContract {
  return {
    symbol: contract.contract_symbol || contract.symbol,
    strike: parseFloat(contract.strike),
    expiration: contract.expiration_date || contract.expiration,
    type: contract.option_type === 'call' ? 'call' : 'put',
    bid: parseFloat(contract.bid) || 0,
    ask: parseFloat(contract.ask) || 0,
    last: parseFloat(contract.last_price) || 0,
    volume: parseInt(contract.volume) || 0,
    openInterest: parseInt(contract.open_interest) || 0,
    impliedVolatility: parseFloat(contract.implied_volatility) || 0,
    delta: parseFloat(contract.delta) || 0,
    gamma: parseFloat(contract.gamma) || 0,
    theta: parseFloat(contract.theta) || 0,
    vega: parseFloat(contract.vega) || 0,
    rho: parseFloat(contract.rho) || 0,
    inTheMoney: contract.in_the_money === true,
  };
}

/**
 * Generate fallback expiration dates (3rd Friday of each month)
 */
function generateFallbackExpirations(): string[] {
  const expirations: string[] = [];
  const now = new Date();

  for (let i = 0; i < 6; i++) {
    const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const thirdFriday = getThirdFriday(month.getFullYear(), month.getMonth());

    if (thirdFriday > now) {
      expirations.push(thirdFriday.toISOString().split('T')[0]);
    }
  }

  return expirations;
}

/**
 * Get third Friday of a month (standard options expiration)
 */
function getThirdFriday(year: number, month: number): Date {
  const firstDay = new Date(year, month, 1);
  const firstFriday = firstDay.getDay() <= 5
    ? 1 + (5 - firstDay.getDay())
    : 1 + (12 - firstDay.getDay());

  return new Date(year, month, firstDay + 14);
}

export type { OptionContract, OptionsChain, GreeksCalculation };
