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
