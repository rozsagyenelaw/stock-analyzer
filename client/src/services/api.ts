import axios from 'axios';
import type {
  StockAnalysis,
  TimeSeriesData,
  WatchlistItem,
  Trade,
  TradeStats,
  Alert,
  UserSettings,
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

export default api;
