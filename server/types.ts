/**
 * Shared TypeScript types for server-side code
 */

export interface TimeSeriesData {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  symbol?: string; // Added by our code when mapping TwelveData responses
}

export interface PortfolioHolding {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  sector?: string;
  industry?: string;
  weight: number;
  firstPurchaseDate: string;
  lastUpdated: string;
}
