import axios from 'axios';
import { cache } from './cache';

const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';

function getApiKey(): string {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) {
    throw new Error('TWELVE_DATA_API_KEY is not set in environment variables');
  }
  return key;
}

interface TwelveDataTimeSeriesResponse {
  meta: {
    symbol: string;
    interval: string;
    currency: string;
    exchange_timezone: string;
    exchange: string;
    mic_code: string;
    type: string;
  };
  values: Array<{
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }>;
  status: string;
}

interface TwelveDataQuoteResponse {
  symbol: string;
  name: string;
  exchange: string;
  mic_code: string;
  currency: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
  average_volume: string;
  is_market_open: boolean;
  fifty_two_week: {
    low: string;
    high: string;
    low_change: string;
    high_change: string;
    low_change_percent: string;
    high_change_percent: string;
    range: string;
  };
}

interface TwelveDataIndicatorResponse {
  meta: {
    symbol: string;
    interval: string;
    indicator_name: string;
  };
  values: Array<{
    datetime: string;
    [key: string]: string;
  }>;
  status: string;
}

export async function getQuote(symbol: string): Promise<TwelveDataQuoteResponse> {
  const cacheKey = `quote:${symbol}`;
  const cached = cache.get<TwelveDataQuoteResponse>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get(`${TWELVE_DATA_BASE_URL}/quote`, {
      params: {
        symbol,
        apikey: getApiKey(),
      },
    });

    if (response.data.status === 'error') {
      throw new Error(response.data.message || 'Failed to fetch quote');
    }

    cache.set(cacheKey, response.data, 60); // Cache for 1 minute
    return response.data;
  } catch (error: any) {
    console.error('Error fetching quote:', error.message);
    throw error;
  }
}

export async function getTimeSeries(
  symbol: string,
  interval: string = '1day',
  outputsize: number = 100
): Promise<TwelveDataTimeSeriesResponse> {
  const cacheKey = `timeseries:${symbol}:${interval}:${outputsize}`;
  const cached = cache.get<TwelveDataTimeSeriesResponse>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get(`${TWELVE_DATA_BASE_URL}/time_series`, {
      params: {
        symbol,
        interval,
        outputsize,
        apikey: getApiKey(),
      },
    });

    if (response.data.status === 'error') {
      throw new Error(response.data.message || 'Failed to fetch time series');
    }

    cache.set(cacheKey, response.data, 300); // Cache for 5 minutes
    return response.data;
  } catch (error: any) {
    console.error('Error fetching time series:', error.message);
    throw error;
  }
}

export async function getIndicator(
  symbol: string,
  indicator: string,
  params: Record<string, any> = {}
): Promise<TwelveDataIndicatorResponse> {
  const cacheKey = `indicator:${symbol}:${indicator}:${JSON.stringify(params)}`;
  const cached = cache.get<TwelveDataIndicatorResponse>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get(`${TWELVE_DATA_BASE_URL}/${indicator}`, {
      params: {
        symbol,
        interval: '1day',
        outputsize: 100,
        ...params,
        apikey: getApiKey(),
      },
    });

    if (response.data.status === 'error') {
      throw new Error(response.data.message || `Failed to fetch ${indicator}`);
    }

    cache.set(cacheKey, response.data, 300); // Cache for 5 minutes
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching ${indicator}:`, error.message);
    throw error;
  }
}

export async function searchSymbol(query: string): Promise<any> {
  const cacheKey = `search:${query}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get(`${TWELVE_DATA_BASE_URL}/symbol_search`, {
      params: {
        symbol: query,
        apikey: getApiKey(),
      },
    });

    cache.set(cacheKey, response.data, 3600); // Cache for 1 hour
    return response.data;
  } catch (error: any) {
    console.error('Error searching symbol:', error.message);
    throw error;
  }
}

export async function getProfile(symbol: string): Promise<any> {
  const cacheKey = `profile:${symbol}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get(`${TWELVE_DATA_BASE_URL}/profile`, {
      params: {
        symbol,
        apikey: getApiKey(),
      },
    });

    if (response.data.status === 'error') {
      throw new Error(response.data.message || 'Failed to fetch profile');
    }

    cache.set(cacheKey, response.data, 86400); // Cache for 24 hours
    return response.data;
  } catch (error: any) {
    console.error('Error fetching profile:', error.message);
    throw error;
  }
}

export async function getStatistics(symbol: string): Promise<any> {
  const cacheKey = `statistics:${symbol}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get(`${TWELVE_DATA_BASE_URL}/statistics`, {
      params: {
        symbol,
        apikey: getApiKey(),
      },
    });

    if (response.data.status === 'error') {
      throw new Error(response.data.message || 'Failed to fetch statistics');
    }

    cache.set(cacheKey, response.data, 86400); // Cache for 24 hours
    return response.data;
  } catch (error: any) {
    console.error('Error fetching statistics:', error.message);
    throw error;
  }
}

export default {
  getQuote,
  getTimeSeries,
  getIndicator,
  searchSymbol,
  getProfile,
  getStatistics,
};
