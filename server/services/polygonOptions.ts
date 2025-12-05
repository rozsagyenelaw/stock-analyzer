/**
 * Polygon.io Options Service
 *
 * Handles all options data fetching from Polygon.io API
 * Used for options chains, expirations, and contract details
 */

import axios from 'axios';
import NodeCache from 'node-cache';

const POLYGON_BASE_URL = 'https://api.polygon.io';

/**
 * Get Polygon API key with lazy evaluation
 * This ensures the key is read after environment variables are loaded
 */
function getPolygonApiKey(): string | undefined {
  return process.env.POLYGON_API_KEY;
}

// Cache for 5 minutes
const optionsCache = new NodeCache({ stdTTL: 300 });

export interface PolygonOptionContract {
  ticker: string;
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
}

/**
 * Check if Polygon.io is configured
 */
export function isPolygonConfigured(): boolean {
  const apiKey = getPolygonApiKey();
  return !!apiKey && apiKey.length > 0;
}

/**
 * Get available expiration dates for a symbol
 */
export async function getOptionsExpirations(symbol: string): Promise<string[]> {
  const cacheKey = `polygon_expirations_${symbol}`;
  const cached = optionsCache.get<string[]>(cacheKey);
  if (cached) return cached;

  const apiKey = getPolygonApiKey();
  if (!apiKey) {
    throw new Error('POLYGON_API_KEY not configured');
  }

  try {
    // Polygon uses O: prefix for options tickers
    // Fetch enough contracts to get all expirations (1000 is max per request)
    const response = await axios.get(
      `${POLYGON_BASE_URL}/v3/reference/options/contracts`,
      {
        params: {
          underlying_ticker: symbol,
          limit: 1000,
        },
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 10000,
      }
    );

    if (response.data.status === 'ERROR') {
      console.error(`Polygon API error for ${symbol}:`, response.data.error);
      return [];
    }

    // Extract unique expiration dates
    const expirations = new Set<string>();
    if (response.data.results) {
      response.data.results.forEach((contract: any) => {
        if (contract.expiration_date) {
          expirations.add(contract.expiration_date);
        }
      });
    }

    const sortedExpirations = Array.from(expirations).sort();
    optionsCache.set(cacheKey, sortedExpirations);

    console.log(`Found ${sortedExpirations.length} expirations for ${symbol}`);
    return sortedExpirations;
  } catch (error: any) {
    console.error(`Error fetching Polygon expirations for ${symbol}:`, error.message);
    return [];
  }
}

/**
 * Get options chain for a symbol and expiration
 */
export async function getOptionsChain(
  symbol: string,
  expiration?: string
): Promise<{ calls: PolygonOptionContract[]; puts: PolygonOptionContract[] }> {
  const cacheKey = `polygon_chain_${symbol}_${expiration}`;
  const cached = optionsCache.get<{ calls: PolygonOptionContract[]; puts: PolygonOptionContract[] }>(cacheKey);
  if (cached) return cached;

  const apiKey = getPolygonApiKey();
  if (!apiKey) {
    throw new Error('POLYGON_API_KEY not configured');
  }

  try {
    // If no expiration provided, get the nearest one
    let targetExpiration = expiration;
    if (!targetExpiration) {
      const expirations = await getOptionsExpirations(symbol);
      if (expirations.length === 0) {
        return { calls: [], puts: [] };
      }
      targetExpiration = expirations[0];
    }

    // Get contracts for this expiration
    const response = await axios.get(
      `${POLYGON_BASE_URL}/v3/reference/options/contracts`,
      {
        params: {
          underlying_ticker: symbol,
          expiration_date: targetExpiration,
          limit: 250,
        },
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 10000,
      }
    );

    if (response.data.status === 'ERROR') {
      console.error(`Polygon API error for ${symbol}:`, response.data.error);
      return { calls: [], puts: [] };
    }

    const calls: PolygonOptionContract[] = [];
    const puts: PolygonOptionContract[] = [];

    // Process contracts
    // Note: For basic options data, we'll use the contract info directly
    // and fetch real quotes only for filtered contracts later
    if (response.data.results) {
      // Get underlying price once for all contracts
      const stockPrice = await getUnderlyingPrice(symbol);

      if (stockPrice === 0) {
        console.error(`Failed to get stock price for ${symbol}`);
        return { calls: [], puts: [] };
      }

      for (const contract of response.data.results) {
        const strike = contract.strike_price;
        const isCall = contract.contract_type === 'call';

        // Calculate intrinsic value
        let intrinsicValue = 0;
        if (isCall) {
          intrinsicValue = Math.max(stockPrice - strike, 0);
        } else {
          intrinsicValue = Math.max(strike - stockPrice, 0);
        }

        // Estimate time value based on moneyness and DTE
        const dte = calculateDTE(contract.expiration_date);
        const timeValueMultiplier = Math.sqrt(dte / 365) * 0.3; // Rough estimate
        const atmValue = stockPrice * timeValueMultiplier;

        // Estimate fair value
        const estimatedValue = intrinsicValue + atmValue * 0.15;
        const spread = Math.max(estimatedValue * 0.03, 0.05); // 3% spread or $0.05 min

        // Estimate basic Greeks from Black-Scholes approximations
        const moneyness = isCall ? stockPrice / strike : strike / stockPrice;
        const estimatedDelta = isCall
          ? Math.min(moneyness, 1) * 0.8
          : -Math.min(1 / moneyness, 1) * 0.8;

        const optionContract: PolygonOptionContract = {
          ticker: contract.ticker,
          strike: strike,
          expiration: contract.expiration_date,
          type: isCall ? 'call' : 'put',
          bid: Math.max(estimatedValue - spread / 2, 0.01),
          ask: estimatedValue + spread / 2,
          last: estimatedValue,
          volume: 0,
          openInterest: contract.open_interest || 0,
          impliedVolatility: 0.3, // Default 30% IV
          delta: estimatedDelta,
          gamma: 0.01,
          theta: -0.05,
          vega: 0.1,
          rho: 0.01,
        };

        if (contract.contract_type === 'call') {
          calls.push(optionContract);
        } else {
          puts.push(optionContract);
        }
      }
    }

    // Sort by strike price
    calls.sort((a, b) => a.strike - b.strike);
    puts.sort((a, b) => a.strike - b.strike);

    const result = { calls, puts };
    optionsCache.set(cacheKey, result);

    console.log(`Fetched ${calls.length} calls and ${puts.length} puts for ${symbol} ${targetExpiration}`);
    return result;
  } catch (error: any) {
    console.error(`Error fetching Polygon options chain for ${symbol}:`, error.message);
    return { calls: [], puts: [] };
  }
}

/**
 * Get underlying stock price from Polygon
 */
async function getUnderlyingPrice(symbol: string): Promise<number> {
  const cacheKey = `polygon_stock_price_${symbol}`;
  const cached = optionsCache.get<number>(cacheKey);
  if (cached) return cached;

  const apiKey = getPolygonApiKey();
  if (!apiKey) {
    return 0;
  }

  try {
    // Get previous day's close
    const response = await axios.get(
      `${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol}/prev`,
      {
        params: { apiKey },
        timeout: 5000,
      }
    );

    if (response.data.status === 'OK' && response.data.results?.length > 0) {
      const price = response.data.results[0].c; // close price
      optionsCache.set(cacheKey, price, 60); // Cache for 1 minute
      return price;
    }

    return 0;
  } catch (error: any) {
    console.error(`Error fetching stock price for ${symbol}:`, error.message);
    return 0;
  }
}

/**
 * Get quote data for ALL options in a chain at once (bulk endpoint)
 */
async function getBulkContractQuotes(
  symbol: string,
  expiration: string
): Promise<Record<string, any>> {
  const cacheKey = `polygon_bulk_quotes_${symbol}_${expiration}`;
  const cached = optionsCache.get<Record<string, any>>(cacheKey);
  if (cached) return cached;

  const apiKey = getPolygonApiKey();
  if (!apiKey) {
    return {};
  }

  try {
    // Use the options chain snapshot endpoint - gets all options data at once
    const response = await axios.get(
      `${POLYGON_BASE_URL}/v3/snapshot/options/${symbol}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 10000,
      }
    );

    const quotesMap: Record<string, any> = {};

    if (response.data.status === 'OK' && response.data.results) {
      // Process all results and build a map by ticker
      for (const result of response.data.results) {
        // Only include contracts for the target expiration
        if (result.details?.expiration_date === expiration) {
          // For Polygon free tier, we need to estimate bid/ask from last price
          const lastPrice = result.day?.close || 0;
          const spread = Math.max(lastPrice * 0.02, 0.05); // 2% spread or $0.05 min

          quotesMap[result.details.ticker] = {
            bid: lastPrice > 0 ? Math.max(lastPrice - spread / 2, 0.01) : 0,
            ask: lastPrice > 0 ? lastPrice + spread / 2 : 0,
            last: lastPrice,
            volume: result.day?.volume || 0,
            impliedVolatility: result.implied_volatility || 0,
            greeks: result.greeks || {},
          };
        }
      }
    }

    // If we got less than 20 contracts, the snapshot may be incomplete
    // This is a limitation of Polygon's free tier
    if (Object.keys(quotesMap).length < 20) {
      console.log(`⚠️  Limited snapshot data for ${symbol} - only ${Object.keys(quotesMap).length} contracts available`);
    }

    optionsCache.set(cacheKey, quotesMap);
    console.log(`Fetched bulk quotes for ${symbol} ${expiration}: ${Object.keys(quotesMap).length} contracts`);
    return quotesMap;
  } catch (error: any) {
    console.error(`Error fetching bulk quotes for ${symbol}:`, error.message);
    return {};
  }
}

/**
 * Get quote data for a specific option contract (fallback for individual quotes)
 */
async function getContractQuote(ticker: string): Promise<any> {
  const cacheKey = `polygon_quote_${ticker}`;
  const cached = optionsCache.get(cacheKey);
  if (cached) return cached;

  const apiKey = getPolygonApiKey();
  if (!apiKey) {
    return { bid: 0, ask: 0, last: 0, volume: 0, impliedVolatility: 0, greeks: {} };
  }

  try {
    // Get snapshot for this option
    const response = await axios.get(
      `${POLYGON_BASE_URL}/v3/snapshot/options/${ticker}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 5000,
      }
    );

    if (response.data.status === 'OK' && response.data.results) {
      const result = response.data.results;
      const quote = {
        bid: result.day?.close || result.last_quote?.bid || 0,
        ask: result.last_quote?.ask || 0,
        last: result.day?.close || 0,
        volume: result.day?.volume || 0,
        impliedVolatility: result.implied_volatility || 0,
        greeks: result.greeks || {},
      };

      optionsCache.set(cacheKey, quote);
      return quote;
    }

    return { bid: 0, ask: 0, last: 0, volume: 0, impliedVolatility: 0, greeks: {} };
  } catch (error: any) {
    // Don't log every quote error, too verbose
    return { bid: 0, ask: 0, last: 0, volume: 0, impliedVolatility: 0, greeks: {} };
  }
}

/**
 * Calculate days to expiration
 */
export function calculateDTE(expiration: string): number {
  const exp = new Date(expiration);
  const now = new Date();
  const diff = exp.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calculate annualized return
 */
export function calculateAnnualizedReturn(
  premium: number,
  investment: number,
  daysToExpiration: number
): number {
  if (daysToExpiration === 0 || investment === 0) return 0;
  const returnPercent = (premium / investment) * 100;
  return (returnPercent * 365) / daysToExpiration;
}

/**
 * Calculate probability of profit based on delta
 */
export function calculateProbabilityOfProfit(
  delta: number,
  position: 'sell_call' | 'sell_put' | 'buy_call' | 'buy_put'
): number {
  // Delta approximates probability ITM
  // For selling options, we want OTM, so invert
  switch (position) {
    case 'sell_call':
      return (1 - Math.abs(delta)) * 100;
    case 'sell_put':
      return (1 - Math.abs(delta)) * 100;
    case 'buy_call':
      return Math.abs(delta) * 100;
    case 'buy_put':
      return Math.abs(delta) * 100;
    default:
      return 50;
  }
}
