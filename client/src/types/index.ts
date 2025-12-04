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

// Screener Types
export type FilterOperator = 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';

export interface ScreenerFilter {
  field: string;
  operator: FilterOperator;
  value: number | number[];
  label?: string;
}

export interface ScreenerScan {
  id?: string;
  name: string;
  description?: string;
  filters: ScreenerFilter[];
  isPrebuilt?: boolean;
  created_at?: string;
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  rsi?: number;
  macd?: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  peRatio?: number;
  signal?: string;
  score?: number;
}

// Fundamental Analysis Types
export interface IncomeStatement {
  fiscalYear: string;
  fiscalQuarter?: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
  ebitda: number;
}

export interface BalanceSheet {
  fiscalYear: string;
  fiscalQuarter?: string;
  totalAssets: number;
  currentAssets: number;
  totalLiabilities: number;
  currentLiabilities: number;
  totalEquity: number;
  cash: number;
  debt: number;
  workingCapital: number;
}

export interface CashFlow {
  fiscalYear: string;
  fiscalQuarter?: string;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  freeCashFlow: number;
  capitalExpenditures: number;
}

export interface FinancialRatios {
  // Profitability
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  roe: number; // Return on Equity
  roa: number; // Return on Assets
  roic: number; // Return on Invested Capital

  // Liquidity
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;

  // Leverage
  debtToEquity: number;
  debtToAssets: number;
  interestCoverage: number;

  // Efficiency
  assetTurnover: number;
  inventoryTurnover: number;
  receivablesTurnover: number;

  // Valuation
  peRatio: number;
  pbRatio: number;
  psRatio: number;
  pegRatio: number;
  evToEbitda: number;
  priceToFreeCashFlow: number;
}

export interface DCFValuation {
  currentPrice: number;
  intrinsicValue: number;
  upside: number; // percentage
  assumptions: {
    revenueGrowthRate: number;
    terminalGrowthRate: number;
    discountRate: number;
    projectionYears: number;
    fcfMargin: number;
  };
  projections: Array<{
    year: number;
    revenue: number;
    freeCashFlow: number;
    discountedFCF: number;
  }>;
  terminalValue: number;
  enterpriseValue: number;
}

export interface InsiderTransaction {
  filingDate: string;
  transactionDate: string;
  insider: string;
  title: string;
  transactionType: 'Buy' | 'Sell' | 'Option Exercise' | 'Gift';
  shares: number;
  pricePerShare: number;
  totalValue: number;
  sharesOwned: number;
}

export interface CompanyFundamentals {
  symbol: string;
  name: string;
  description?: string;
  sector: string;
  industry: string;
  marketCap: number;
  employees?: number;
  founded?: string;
  headquarters?: string;

  // Financial Statements (latest 4 quarters or years)
  incomeStatements: IncomeStatement[];
  balanceSheets: BalanceSheet[];
  cashFlows: CashFlow[];

  // Analysis
  ratios: FinancialRatios;
  dcf: DCFValuation;
  insiderTransactions: InsiderTransaction[];

  // Growth Metrics
  revenueGrowthQoQ: number;
  revenueGrowthYoY: number;
  earningsGrowthQoQ: number;
  earningsGrowthYoY: number;
}

// ============================================================================
// OPTIONS ANALYSIS TYPES
// ============================================================================

export type OptionType = 'call' | 'put';
export type OptionSide = 'buy' | 'sell';

// The Greeks - measures of risk and sensitivity
export interface OptionGreeks {
  delta: number; // Price sensitivity (0-1 for calls, -1-0 for puts)
  gamma: number; // Rate of delta change
  theta: number; // Time decay per day
  vega: number; // Volatility sensitivity
  rho: number; // Interest rate sensitivity
}

// Individual option contract
export interface OptionContract {
  symbol: string; // Option symbol (e.g., AAPL250117C00150000)
  strike: number;
  expiration: string; // ISO date
  type: OptionType;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number; // IV as decimal (e.g., 0.35 = 35%)
  greeks: OptionGreeks;
  inTheMoney: boolean;
  daysToExpiration: number;
  intrinsicValue: number;
  extrinsicValue: number;
  breakeven: number;
  probabilityITM: number; // Probability of being in the money at expiration
}

// Options chain for a specific expiration
export interface OptionsChain {
  symbol: string;
  underlyingPrice: number;
  expiration: string;
  daysToExpiration: number;
  calls: OptionContract[];
  puts: OptionContract[];
  impliedVolatility: number; // Average IV for the chain
}

// Multi-leg option strategy
export interface OptionLeg {
  id: string;
  contract: OptionContract;
  side: OptionSide; // buy or sell
  quantity: number;
}

export interface OptionStrategy {
  id?: string;
  name: string;
  description?: string;
  legs: OptionLeg[];

  // Strategy analysis
  maxProfit: number | null; // null = unlimited
  maxLoss: number | null; // null = unlimited
  breakevens: number[];
  netDebit: number; // Negative for credit strategies
  probabilityOfProfit: number;
  expectedValue: number;
  returnOnRisk: number; // Potential return / max risk

  // Greeks for the entire strategy
  totalGreeks: OptionGreeks;

  // Risk profile at different price points
  profitLossProfile: Array<{
    price: number;
    profitLoss: number;
    atExpiration: number;
  }>;
}

// Pre-defined strategy templates
export type StrategyTemplate =
  // Single leg
  | 'long_call' | 'long_put' | 'covered_call' | 'cash_secured_put'
  // Spreads
  | 'bull_call_spread' | 'bear_put_spread' | 'bull_put_spread' | 'bear_call_spread'
  // Volatility
  | 'long_straddle' | 'short_straddle' | 'long_strangle' | 'short_strangle'
  | 'iron_condor' | 'iron_butterfly' | 'butterfly_spread'
  // Advanced
  | 'calendar_spread' | 'diagonal_spread' | 'ratio_spread' | 'jade_lizard';

export interface StrategyTemplateInfo {
  id: StrategyTemplate;
  name: string;
  description: string;
  category: 'bullish' | 'bearish' | 'neutral' | 'volatility';
  complexity: 'beginner' | 'intermediate' | 'advanced';
  outlook: string;
  maxProfit: 'limited' | 'unlimited';
  maxLoss: 'limited' | 'unlimited';
  idealConditions: string;
  legs: number;
}

// Unusual options activity
export interface UnusualActivity {
  symbol: string;
  contract: OptionContract;
  timestamp: string;
  volume: number;
  openInterest: number;
  volumeOIRatio: number; // Volume / Open Interest
  premium: number; // Total premium traded
  sentiment: 'bullish' | 'bearish' | 'neutral';
  score: number; // Unusual activity score (0-100)
  flags: Array<'high_volume' | 'unusual_sweep' | 'golden_sweep' | 'block_trade' | 'above_ask' | 'below_bid'>;
}

// Options flow for a symbol
export interface OptionsFlow {
  symbol: string;
  date: string;
  underlyingPrice: number;

  // Aggregate statistics
  totalCallVolume: number;
  totalPutVolume: number;
  putCallRatio: number;
  totalCallOI: number;
  totalPutOI: number;
  netCallPremium: number;
  netPutPremium: number;

  // Sentiment indicators
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number; // -100 (bearish) to +100 (bullish)

  // Unusual activity
  unusualActivity: UnusualActivity[];

  // Large trades
  blockTrades: Array<{
    contract: OptionContract;
    side: OptionSide;
    size: number;
    premium: number;
    timestamp: string;
  }>;
}

// Volatility analysis
export interface VolatilityAnalysis {
  symbol: string;
  currentIV: number; // Current implied volatility
  historicalVolatility: number; // Actual realized volatility
  ivRank: number; // Where current IV ranks in 52-week range (0-100)
  ivPercentile: number; // Percentage of days IV was below current level

  // IV by expiration
  volatilityTermStructure: Array<{
    expiration: string;
    daysToExpiration: number;
    iv: number;
  }>;

  // IV skew (puts vs calls)
  skew: {
    atmIV: number; // At-the-money IV
    otmCallIV: number; // Out-of-money call IV
    otmPutIV: number; // Out-of-money put IV
    skewRatio: number; // Put IV / Call IV
  };
}

// Options screener result
export interface OptionScreenerResult {
  contract: OptionContract;
  score: number;
  reasons: string[];
  indicators: {
    highVolume?: boolean;
    highIV?: boolean;
    lowIV?: boolean;
    undervalued?: boolean;
    goodRiskReward?: boolean;
    nearEarnings?: boolean;
  };
}

// Complete options analysis for a symbol
export interface OptionsAnalysis {
  symbol: string;
  underlyingPrice: number;
  chains: OptionsChain[];
  flow: OptionsFlow;
  volatility: VolatilityAnalysis;
  suggestedStrategies: Array<{
    template: StrategyTemplate;
    strategy: OptionStrategy;
    reasoning: string;
    suitability: number; // 0-100 score
  }>;
  earnings?: {
    date: string;
    confirmed: boolean;
    daysUntil: number;
  };
}

// Portfolio Management Types
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
  weight: number; // Portfolio weight percentage
  firstPurchaseDate: string;
  lastUpdated: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPL: number;
  totalPLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  cashBalance: number;
  holdings: number;
  lastUpdated: string;
}

export interface RiskMetrics {
  portfolioBeta: number;
  sharpeRatio: number;
  volatility: number; // Annualized standard deviation
  valueAtRisk: number; // VaR 95%
  maxDrawdown: number;
  correlationMatrix: { [key: string]: { [key: string]: number } };
  concentrationRisk: {
    topHolding: number;
    top5Holdings: number;
    herfindahlIndex: number;
  };
}

export interface DiversificationAnalysis {
  sectorAllocation: {
    sector: string;
    value: number;
    weight: number;
    holdings: number;
  }[];
  assetAllocation: {
    type: 'Stocks' | 'Cash' | 'Options';
    value: number;
    weight: number;
  }[];
  diversificationScore: number; // 0-100
  recommendations: string[];
}

export interface PerformanceAttribution {
  periodReturn: number;
  benchmarkReturn: number;
  alpha: number;
  attribution: {
    symbol: string;
    contribution: number; // Contribution to total return
    weight: number;
    return: number;
  }[];
  timeWeightedReturn: number;
  moneyWeightedReturn: number; // IRR
}

export interface PortfolioPerformance {
  daily: { date: string; value: number; return: number }[];
  cumulative: {
    '1D': number;
    '1W': number;
    '1M': number;
    '3M': number;
    'YTD': number;
    '1Y': number;
    'ALL': number;
  };
  annualized: {
    '1Y': number;
    '3Y': number;
    '5Y': number;
    'ALL': number;
  };
}

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  holdings: PortfolioHolding[];
  summary: PortfolioSummary;
  riskMetrics: RiskMetrics;
  diversification: DiversificationAnalysis;
  performance: PortfolioPerformance;
  performanceAttribution: PerformanceAttribution;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// BACKTESTING TYPES
// ============================================================================

export type PositionSizing = 'FIXED' | 'PERCENT_CAPITAL' | 'KELLY' | 'VOLATILITY';
export type OptimizationType = 'WALKFORWARD' | 'MONTE_CARLO';
export type BacktestStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type ExitReason = 'SIGNAL' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'END_OF_DATA';

export interface StrategyCondition {
  indicator: string; // 'RSI', 'MACD', 'SMA', 'EMA', 'BB', 'STOCH', etc.
  operator: string; // '>', '<', '>=', '<=', '==', 'CROSS_ABOVE', 'CROSS_BELOW'
  value: number | string; // comparison value or another indicator
  params?: { [key: string]: any }; // indicator parameters (e.g., { period: 14 })
}

export interface BacktestStrategy {
  id: string;
  name: string;
  description?: string;
  entry_rules: StrategyCondition[];
  exit_rules: StrategyCondition[];
  position_sizing: PositionSizing;
  position_size_value: number;
  stop_loss_percent?: number;
  take_profit_percent?: number;
  max_positions: number;
  commission_percent: number;
  slippage_percent: number;
  initial_capital: number;
  created_at: string;
  updated_at: string;
}

export interface BacktestTrade {
  id: string;
  backtest_run_id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_date: string;
  entry_price: number;
  exit_date?: string;
  exit_price?: number;
  shares: number;
  position_size: number;
  commission: number;
  slippage: number;
  stop_loss_price?: number;
  take_profit_price?: number;
  exit_reason?: ExitReason;
  profit_loss?: number;
  profit_loss_percent?: number;
  mae?: number; // Maximum Adverse Excursion
  mfe?: number; // Maximum Favorable Excursion
  bars_in_trade?: number;
  entry_signal?: { [key: string]: any };
  exit_signal?: { [key: string]: any };
}

export interface EquityPoint {
  date: string;
  equity: number;
  drawdown?: number;
  drawdown_percent?: number;
}

export interface BacktestRun {
  id: string;
  strategy_id: string;
  strategy?: BacktestStrategy;
  name?: string;
  symbol?: string;
  start_date: string;
  end_date: string;
  timeframe: string;
  optimization_type?: OptimizationType;
  optimization_params?: { [key: string]: any };
  status: BacktestStatus;

  // Performance metrics
  total_trades?: number;
  winning_trades?: number;
  losing_trades?: number;
  total_return?: number;
  total_return_percent?: number;
  sharpe_ratio?: number;
  max_drawdown?: number;
  max_drawdown_percent?: number;
  profit_factor?: number;
  win_rate?: number;
  avg_win?: number;
  avg_loss?: number;
  largest_win?: number;
  largest_loss?: number;
  avg_bars_in_trade?: number;
  final_capital?: number;

  // Data
  equity_curve?: EquityPoint[];
  monthly_returns?: { [month: string]: number };
  trades?: BacktestTrade[];

  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface OptimizationWindow {
  id: string;
  backtest_run_id: string;
  window_number?: number;
  train_start_date: string;
  train_end_date: string;
  test_start_date?: string;
  test_end_date?: string;
  optimized_params: { [key: string]: any };
  train_return?: number;
  test_return?: number;
  train_sharpe?: number;
  test_sharpe?: number;
  train_max_drawdown?: number;
  test_max_drawdown?: number;
  created_at: string;
}

export interface WalkForwardOptimizationParams {
  train_window_months: number;
  test_window_months: number;
  parameter_ranges: {
    [param: string]: {
      min: number;
      max: number;
      step: number;
    };
  };
  optimization_metric: 'SHARPE' | 'RETURN' | 'PROFIT_FACTOR' | 'WIN_RATE';
}

export interface BacktestRequest {
  strategy_id: string;
  name?: string;
  symbol: string;
  start_date: string;
  end_date: string;
  timeframe?: string;
  optimization_type?: OptimizationType;
  optimization_params?: WalkForwardOptimizationParams;
}

// ============================================================================
// NEWS & SOCIAL SENTIMENT TYPES
// ============================================================================

export type SentimentLabel = 'BEARISH' | 'NEUTRAL' | 'BULLISH';
export type SocialPlatform = 'REDDIT' | 'TWITTER';
export type SentimentSource = 'NEWS' | 'REDDIT' | 'TWITTER' | 'COMBINED';

export interface NewsArticle {
  id: string;
  symbol?: string;
  title: string;
  description?: string;
  content?: string;
  url: string;
  source: string;
  author?: string;
  image_url?: string;
  published_at: string;
  sentiment_score?: number; // -1 to 1
  sentiment_label?: SentimentLabel;
  sentiment_magnitude?: number; // 0 to 1
  category?: string;
  keywords?: string[];
  created_at: string;
}

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  symbol?: string;
  post_id: string;
  author?: string;
  title?: string;
  content?: string;
  url: string;
  score: number;
  comments_count: number;
  shares_count: number;
  sentiment_score?: number;
  sentiment_label?: SentimentLabel;
  sentiment_magnitude?: number;
  posted_at: string;
  created_at: string;
}

export interface SentimentMetrics {
  id: string;
  symbol: string;
  date: string;
  timeframe: 'hourly' | 'daily' | 'weekly';
  source: SentimentSource;
  avg_sentiment: number;
  sentiment_label: SentimentLabel;
  volume: number;
  bullish_count: number;
  neutral_count: number;
  bearish_count: number;
  trend?: 'INCREASING' | 'DECREASING' | 'STABLE';
  created_at: string;
}

export interface TrendingSymbol {
  id: string;
  symbol: string;
  rank: number;
  source: SentimentSource;
  mentions_count: number;
  sentiment_score?: number;
  change_24h: number;
  timeframe: string;
  date: string;
  created_at: string;
}

export interface SentimentSummary {
  symbol: string;
  overall_sentiment: SentimentLabel;
  sentiment_score: number;
  news: {
    sentiment: SentimentLabel;
    score: number;
    volume: number;
    recent_articles: NewsArticle[];
  };
  reddit: {
    sentiment: SentimentLabel;
    score: number;
    volume: number;
    trending_posts: SocialPost[];
  };
  twitter: {
    sentiment: SentimentLabel;
    score: number;
    volume: number;
    trending_posts: SocialPost[];
  };
  history: SentimentMetrics[];
}
