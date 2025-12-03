export interface Stock {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  marketCap?: number;
}

export interface IndicatorResult {
  value: number | object;
  signal: number; // -2 to +2
  interpretation: string;
}

export interface TechnicalIndicators {
  rsi: IndicatorResult;
  macd: IndicatorResult;
  movingAverages: IndicatorResult;
  bollingerBands: IndicatorResult;
  volume: IndicatorResult;
  stochastic: IndicatorResult;
  obv: IndicatorResult;
  atr: IndicatorResult;
  fiftyTwoWeek: IndicatorResult;
}

export interface SignalAnalysis {
  composite: {
    score: number; // -10 to +10
    signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
    confidence: number; // 0-100%
  };
  technicalScore: number;
  fundamentalScore: number;
  indicators: TechnicalIndicators;
  priceTargets: {
    entry: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
  };
  warnings: string[];
}

export interface StockAnalysis extends Stock {
  composite: SignalAnalysis['composite'];
  technicalScore: number;
  fundamentalScore: number;
  indicators: TechnicalIndicators;
  priceTargets: SignalAnalysis['priceTargets'];
  warnings: string[];
}

export interface FundamentalData {
  peRatio: number | null;
  forwardPe: number | null;
  pegRatio: number | null;
  eps: number;
  epsGrowth: number;
  revenueGrowth: number;
  profitMargin: number;
  debtToEquity: number;
  dividendYield: number | null;
  analystTargetPrice: number | null;
  insiderBuying: boolean;
}

export interface Trade {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price: number | null;
  entry_date: string;
  exit_date: string | null;
  shares: number;
  strategy_tag: string | null;
  notes: string | null;
  profit_loss: number | null;
  profit_loss_percent: number | null;
  status: 'OPEN' | 'CLOSED';
  created_at: string;
}

export interface TradeStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  totalProfitLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
}

export interface Alert {
  id: string;
  symbol: string;
  condition: AlertCondition;
  threshold: number | null;
  enabled: boolean;
  triggered: boolean;
  triggered_at: string | null;
  delivery_method: 'PUSH' | 'EMAIL' | 'BOTH';
  user_email: string | null;
  created_at: string;
}

export type AlertCondition =
  | 'PRICE_ABOVE'
  | 'PRICE_BELOW'
  | 'RSI_OVERSOLD'
  | 'RSI_OVERBOUGHT'
  | 'MACD_BULLISH_CROSS'
  | 'MACD_BEARISH_CROSS'
  | 'GOLDEN_CROSS'
  | 'DEATH_CROSS'
  | 'VOLUME_SPIKE'
  | 'EARNINGS_APPROACHING';

export interface WatchlistItem extends Stock {
  id: number;
  added_at: string;
  sort_order: number;
}

export interface UserSettings {
  email: string | null;
  defaultDeliveryMethod: 'PUSH' | 'EMAIL' | 'BOTH';
  indicatorWeights: {
    rsi: number;
    macd: number;
    movingAverages: number;
    bollingerBands: number;
    volume: number;
    stochastic: number;
    obv: number;
  };
  darkMode: boolean;
  defaultRiskPercent: number;
}

export interface TimeSeriesData {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface PositionSize {
  accountSize: number;
  riskPercent: number;
  entryPrice: number;
  stopLossPrice: number;
  recommendedShares: number;
  positionValue: number;
  maxLossDollars: number;
}
