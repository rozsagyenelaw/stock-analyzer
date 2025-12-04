import axios from 'axios';
import type {
  StockAnalysis,
  TimeSeriesData,
  WatchlistItem,
  Trade,
  TradeStats,
  Alert,
  UserSettings,
  OptionsAnalysis,
  OptionsChain,
  OptionStrategy,
  StrategyTemplate,
} from '@/types';

// Use environment variable for API URL, fallback to local development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
});

// Stocks API
export const stocksApi = {
  search: async (query: string) => {
    const response = await api.get('/stocks/search', { params: { q: query } });
    return response.data;
  },

  getQuote: async (symbol: string) => {
    const response = await api.get(`/stocks/${symbol}/quote`);
    return response.data;
  },

  getTimeSeries: async (symbol: string, interval = '1day', outputsize = 100) => {
    const response = await api.get<{ values: TimeSeriesData[] }>(`/stocks/${symbol}/timeseries`, {
      params: { interval, outputsize },
    });
    return response.data;
  },

  getIndicators: async (symbol: string) => {
    const response = await api.get(`/stocks/${symbol}/indicators`);
    return response.data;
  },

  getAnalysis: async (symbol: string): Promise<StockAnalysis> => {
    const response = await api.get(`/stocks/${symbol}/analysis`);
    return response.data;
  },

  getProfile: async (symbol: string) => {
    const response = await api.get(`/stocks/${symbol}/profile`);
    return response.data;
  },
};

// Watchlist API
export const watchlistApi = {
  getAll: async (): Promise<WatchlistItem[]> => {
    const response = await api.get('/watchlist');
    return response.data;
  },

  getAllWithPrices: async () => {
    const response = await api.get('/watchlist/with-prices');
    return response.data;
  },

  add: async (symbol: string, name: string, sector?: string, industry?: string) => {
    const response = await api.post('/watchlist', { symbol, name, sector, industry });
    return response.data;
  },

  remove: async (symbol: string) => {
    const response = await api.delete(`/watchlist/${symbol}`);
    return response.data;
  },

  updateOrder: async (items: Array<{ symbol: string; sortOrder: number }>) => {
    const response = await api.put('/watchlist/order', { items });
    return response.data;
  },
};

// Journal API
export const journalApi = {
  getAll: async (status?: 'OPEN' | 'CLOSED'): Promise<Trade[]> => {
    const response = await api.get('/journal', { params: { status } });
    return response.data;
  },

  getById: async (id: string): Promise<Trade> => {
    const response = await api.get(`/journal/${id}`);
    return response.data;
  },

  getBySymbol: async (symbol: string): Promise<Trade[]> => {
    const response = await api.get(`/journal/symbol/${symbol}`);
    return response.data;
  },

  getStats: async (): Promise<TradeStats> => {
    const response = await api.get('/journal/stats/summary');
    return response.data;
  },

  create: async (trade: Partial<Trade>) => {
    const response = await api.post('/journal', trade);
    return response.data;
  },

  update: async (id: string, trade: Partial<Trade>) => {
    const response = await api.put(`/journal/${id}`, trade);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/journal/${id}`);
    return response.data;
  },
};

// Alerts API
export const alertsApi = {
  getAll: async (): Promise<Alert[]> => {
    const response = await api.get('/alerts');
    return response.data;
  },

  getActive: async (): Promise<Alert[]> => {
    const response = await api.get('/alerts/active');
    return response.data;
  },

  create: async (alert: Partial<Alert>) => {
    const response = await api.post('/alerts', alert);
    return response.data;
  },

  toggle: async (id: string, enabled: boolean) => {
    const response = await api.patch(`/alerts/${id}/toggle`, { enabled });
    return response.data;
  },

  reset: async (id: string) => {
    const response = await api.patch(`/alerts/${id}/reset`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/alerts/${id}`);
    return response.data;
  },
};

// Settings API
export const settingsApi = {
  get: async (): Promise<UserSettings> => {
    const response = await api.get('/settings');
    return response.data;
  },

  update: async (settings: Partial<UserSettings>) => {
    const response = await api.put('/settings', settings);
    return response.data;
  },

  testEmail: async (email: string) => {
    const response = await api.post('/settings/test-email', { email });
    return response.data;
  },
};

// Screener API
export const screenerApi = {
  getPrebuiltScans: async () => {
    const response = await api.get('/screener/scans/prebuilt');
    return response.data;
  },

  getCustomScans: async () => {
    const response = await api.get('/screener/scans/custom');
    return response.data;
  },

  saveCustomScan: async (scan: { name: string; description?: string; filters: any[] }) => {
    const response = await api.post('/screener/scans/custom', scan);
    return response.data;
  },

  deleteCustomScan: async (id: string) => {
    const response = await api.delete(`/screener/scans/custom/${id}`);
    return response.data;
  },

  runScan: async (filters: any[], symbols?: string[]) => {
    const response = await api.post('/screener/run', { filters, symbols });
    return response.data;
  },
};

// Fundamentals API
export const fundamentalsApi = {
  get: async (symbol: string) => {
    const response = await api.get(`/fundamentals/${symbol}`);
    return response.data;
  },

  calculateDCF: async (symbol: string, assumptions: {
    revenueGrowthRate: number;
    terminalGrowthRate: number;
    discountRate: number;
    projectionYears: number;
    fcfMargin: number;
  }) => {
    const response = await api.post(`/fundamentals/${symbol}/dcf`, assumptions);
    return response.data;
  },
};

// Options API
export const optionsApi = {
  getAnalysis: async (symbol: string): Promise<OptionsAnalysis> => {
    const response = await api.get(`/options/${symbol}`);
    return response.data;
  },

  getChain: async (symbol: string, expiration: string): Promise<OptionsChain> => {
    const response = await api.get(`/options/${symbol}/chain`, {
      params: { expiration },
    });
    return response.data;
  },

  analyzeStrategy: async (symbol: string, strategy: {
    name: string;
    description?: string;
    legs: any[];
  }): Promise<OptionStrategy> => {
    const response = await api.post(`/options/${symbol}/strategy`, strategy);
    return response.data;
  },

  buildStrategy: async (
    symbol: string,
    template: StrategyTemplate,
    params?: { expiration?: string; dte?: number }
  ): Promise<OptionStrategy> => {
    const response = await api.get(`/options/${symbol}/strategy/${template}`, {
      params,
    });
    return response.data;
  },
};

// AI & ML API
export const aiApi = {
  getStatus: async () => {
    const response = await api.get('/ai/status');
    return response.data;
  },

  getPatterns: async (symbol: string, interval = '1day') => {
    const response = await api.get(`/ai/${symbol}/patterns`, {
      params: { interval },
    });
    return response.data;
  },

  getPredictions: async (symbol: string, model?: 'linear' | 'arima', interval = '1day') => {
    const response = await api.get(`/ai/${symbol}/predictions`, {
      params: { model, interval },
    });
    return response.data;
  },

  getSentiment: async (symbol: string, interval = '1day', optionsData?: any, patterns?: any[]) => {
    const response = await api.post(`/ai/${symbol}/sentiment`, {
      interval,
      optionsData,
      patterns,
    });
    return response.data;
  },

  getComprehensiveAnalysis: async (symbol: string, interval = '1day') => {
    const response = await api.get(`/ai/${symbol}/comprehensive`, {
      params: { interval },
    });
    return response.data;
  },

  analyzeNews: async (symbol: string, headlines: string[]) => {
    const response = await api.post(`/ai/${symbol}/analyze-news`, {
      headlines,
    });
    return response.data;
  },

  getRecommendation: async (
    symbol: string,
    data: {
      price: number;
      technicalAnalysis: any;
      fundamentals?: any;
      optionsFlow?: any;
      patterns?: any[];
    }
  ) => {
    const response = await api.post(`/ai/${symbol}/recommendation`, data);
    return response.data;
  },

  askQuestion: async (question: string, symbol?: string, marketData?: any) => {
    const response = await api.post('/ai/ask', {
      question,
      symbol,
      marketData,
    });
    return response.data;
  },

  explainPattern: async (patternName: string, symbol: string, patternDetails?: any) => {
    const response = await api.post('/ai/explain-pattern', {
      patternName,
      symbol,
      patternDetails,
    });
    return response.data;
  },

  getMarketCommentary: async (data: {
    topGainers: Array<{ symbol: string; change: number }>;
    topLosers: Array<{ symbol: string; change: number }>;
    sectorPerformance?: Record<string, number>;
    marketSentiment: 'bullish' | 'bearish' | 'neutral';
  }) => {
    const response = await api.post('/ai/market-commentary', data);
    return response.data;
  },

  getAlertReasoning: async (
    symbol: string,
    alertType: string,
    triggerValue: number,
    currentData?: any
  ) => {
    const response = await api.post('/ai/alert-reasoning', {
      symbol,
      alertType,
      triggerValue,
      currentData,
    });
    return response.data;
  },

  analyzeEarnings: async (symbol: string, transcript: string) => {
    const response = await api.post(`/ai/${symbol}/earnings-analysis`, {
      transcript,
    });
    return response.data;
  },

  backtestModel: async (symbol: string, model = 'linear_regression', period = 30, interval = '1day') => {
    const response = await api.get(`/ai/${symbol}/backtest`, {
      params: { model, period, interval },
    });
    return response.data;
  },
};

export default api;
