import { v4 as uuidv4 } from 'uuid';
import db from './database';
import { getTimeSeries } from './twelveData';
import * as indicators from './indicators';

interface StrategyCondition {
  indicator: string;
  operator: string;
  value: number | string;
  params?: { [key: string]: any };
}

interface BacktestStrategy {
  id: string;
  name: string;
  entry_rules: StrategyCondition[];
  exit_rules: StrategyCondition[];
  position_sizing: 'FIXED' | 'PERCENT_CAPITAL' | 'KELLY' | 'VOLATILITY';
  position_size_value: number;
  stop_loss_percent?: number;
  take_profit_percent?: number;
  max_positions: number;
  commission_percent: number;
  slippage_percent: number;
  initial_capital: number;
}

interface OHLCV {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface IndicatorValues {
  [key: string]: number | any;
}

interface Position {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_date: string;
  entry_price: number;
  shares: number;
  position_size: number;
  commission: number;
  slippage: number;
  stop_loss_price?: number;
  take_profit_price?: number;
  entry_signal: IndicatorValues;
  lowest_price: number; // for MAE
  highest_price: number; // for MFE
  bars_in_trade: number;
}

/**
 * Calculate technical indicators for a data point
 */
function calculateIndicators(data: OHLCV[], currentIndex: number): IndicatorValues {
  const subset = data.slice(0, currentIndex + 1);
  const closes = subset.map(d => d.close);
  const highs = subset.map(d => d.high);
  const lows = subset.map(d => d.low);
  const volumes = subset.map(d => d.volume);
  const current = data[currentIndex];

  const result: IndicatorValues = {
    close: current.close,
    high: current.high,
    low: current.low,
    open: current.open,
    volume: current.volume,
  };

  // RSI
  if (closes.length >= 14) {
    result.RSI = indicators.calculateRSI(closes, 14);
    result.RSI_9 = indicators.calculateRSI(closes, 9);
    result.RSI_25 = indicators.calculateRSI(closes, 25);
  }

  // MACD
  if (closes.length >= 26) {
    const macd = indicators.calculateMACD(closes);
    result.MACD = macd.macd;
    result.MACD_signal = macd.signal;
    result.MACD_histogram = macd.histogram;
  }

  // Moving Averages
  if (closes.length >= 200) {
    result.SMA_10 = indicators.calculateSMA(closes, 10);
    result.SMA_20 = indicators.calculateSMA(closes, 20);
    result.SMA_50 = indicators.calculateSMA(closes, 50);
    result.SMA_100 = indicators.calculateSMA(closes, 100);
    result.SMA_200 = indicators.calculateSMA(closes, 200);
    result.EMA_10 = indicators.calculateEMA(closes, 10);
    result.EMA_20 = indicators.calculateEMA(closes, 20);
    result.EMA_50 = indicators.calculateEMA(closes, 50);
  }

  // Bollinger Bands
  if (closes.length >= 20) {
    const bb = indicators.calculateBollingerBands(closes, 20, 2);
    result.BB_upper = bb.upper;
    result.BB_middle = bb.middle;
    result.BB_lower = bb.lower;
    result.BB_width = bb.upper - bb.lower;
  }

  // Stochastic
  if (highs.length >= 14) {
    const stoch = indicators.calculateStochastic(highs, lows, closes, 14, 3);
    result.STOCH_k = stoch.k;
    result.STOCH_d = stoch.d;
  }

  // ATR
  if (highs.length >= 14) {
    result.ATR = indicators.calculateATR(highs, lows, closes, 14);
    result.ATR_20 = indicators.calculateATR(highs, lows, closes, 20);
  }

  // ADX
  if (highs.length >= 14) {
    result.ADX = indicators.calculateADX(highs, lows, closes, 14);
  }

  return result;
}

/**
 * Evaluate a condition against indicator values
 */
function evaluateCondition(
  condition: StrategyCondition,
  currentIndicators: IndicatorValues,
  previousIndicators: IndicatorValues | null
): boolean {
  const { indicator, operator, value } = condition;

  const currentValue = currentIndicators[indicator];
  if (currentValue === undefined) return false;

  const numValue = typeof value === 'string' ? currentIndicators[value] : value;
  if (numValue === undefined) return false;

  switch (operator) {
    case '>':
      return currentValue > numValue;
    case '<':
      return currentValue < numValue;
    case '>=':
      return currentValue >= numValue;
    case '<=':
      return currentValue <= numValue;
    case '==':
      return Math.abs(currentValue - numValue) < 0.0001;
    case 'CROSS_ABOVE':
      if (!previousIndicators) return false;
      const prevValue = previousIndicators[indicator];
      const prevCompare = typeof value === 'string' ? previousIndicators[value] : value;
      return prevValue <= prevCompare && currentValue > numValue;
    case 'CROSS_BELOW':
      if (!previousIndicators) return false;
      const prevVal = previousIndicators[indicator];
      const prevComp = typeof value === 'string' ? previousIndicators[value] : value;
      return prevVal >= prevComp && currentValue < numValue;
    default:
      return false;
  }
}

/**
 * Check if entry conditions are met
 */
function checkEntrySignal(
  strategy: BacktestStrategy,
  currentIndicators: IndicatorValues,
  previousIndicators: IndicatorValues | null
): boolean {
  return strategy.entry_rules.every(rule =>
    evaluateCondition(rule, currentIndicators, previousIndicators)
  );
}

/**
 * Check if exit conditions are met
 */
function checkExitSignal(
  strategy: BacktestStrategy,
  currentIndicators: IndicatorValues,
  previousIndicators: IndicatorValues | null
): boolean {
  return strategy.exit_rules.every(rule =>
    evaluateCondition(rule, currentIndicators, previousIndicators)
  );
}

/**
 * Calculate position size based on strategy
 */
function calculatePositionSize(
  strategy: BacktestStrategy,
  currentCapital: number,
  currentPrice: number,
  atr?: number
): number {
  let dollarAmount: number;

  switch (strategy.position_sizing) {
    case 'FIXED':
      dollarAmount = strategy.position_size_value;
      break;
    case 'PERCENT_CAPITAL':
      dollarAmount = currentCapital * (strategy.position_size_value / 100);
      break;
    case 'KELLY':
      // Simplified Kelly - would need win rate and avg win/loss from past trades
      dollarAmount = currentCapital * 0.02; // Conservative 2%
      break;
    case 'VOLATILITY':
      // ATR-based position sizing
      if (atr) {
        const riskPerShare = atr * 2;
        const maxRisk = currentCapital * 0.02;
        const shares = Math.floor(maxRisk / riskPerShare);
        dollarAmount = shares * currentPrice;
      } else {
        dollarAmount = currentCapital * 0.02;
      }
      break;
    default:
      dollarAmount = strategy.position_size_value;
  }

  return Math.min(dollarAmount, currentCapital * 0.95); // Max 95% of capital
}

/**
 * Execute backtest on historical data
 */
export async function runBacktest(
  strategyId: string,
  symbol: string,
  startDate: string,
  endDate: string,
  timeframe: string = '1day'
): Promise<string> {
  const runId = uuidv4();

  try {
    // Get strategy
    const strategy = db.prepare(`
      SELECT * FROM backtest_strategies WHERE id = ?
    `).get(strategyId) as any;

    if (!strategy) {
      throw new Error('Strategy not found');
    }

    strategy.entry_rules = JSON.parse(strategy.entry_rules);
    strategy.exit_rules = JSON.parse(strategy.exit_rules);

    // Create backtest run record
    db.prepare(`
      INSERT INTO backtest_runs (
        id, strategy_id, symbol, start_date, end_date, timeframe, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'RUNNING')
    `).run(runId, strategyId, symbol, startDate, endDate, timeframe);

    // Fetch historical data
    const timeseries = await getTimeSeries(symbol, timeframe, 1000);

    if (!timeseries || !timeseries.values || timeseries.values.length === 0) {
      throw new Error('No historical data available');
    }

    // Convert and filter data
    const data: OHLCV[] = timeseries.values
      .map((v: any) => ({
        datetime: v.datetime,
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
        volume: parseFloat(v.volume),
      }))
      .filter((d: OHLCV) => d.datetime >= startDate && d.datetime <= endDate)
      .reverse(); // oldest first

    if (data.length < 200) {
      throw new Error('Insufficient data for backtest (minimum 200 bars required)');
    }

    // Run simulation
    let capital = strategy.initial_capital;
    let positions: Position[] = [];
    const trades: any[] = [];
    const equityCurve: { date: string; equity: number }[] = [];
    let peakCapital = capital;
    let maxDrawdown = 0;

    for (let i = 200; i < data.length; i++) {
      const currentBar = data[i];
      const currentIndicators = calculateIndicators(data, i);
      const previousIndicators = i > 200 ? calculateIndicators(data, i - 1) : null;

      // Update existing positions
      for (const position of positions) {
        const currentPrice = currentBar.close;
        position.bars_in_trade++;

        // Track MAE and MFE
        if (position.direction === 'LONG') {
          position.lowest_price = Math.min(position.lowest_price, currentBar.low);
          position.highest_price = Math.max(position.highest_price, currentBar.high);
        }

        // Check stop loss
        if (position.stop_loss_price) {
          const stopHit = position.direction === 'LONG'
            ? currentBar.low <= position.stop_loss_price
            : currentBar.high >= position.stop_loss_price;

          if (stopHit) {
            closePosition(position, position.stop_loss_price!, currentBar.datetime, 'STOP_LOSS', currentIndicators);
            continue;
          }
        }

        // Check take profit
        if (position.take_profit_price) {
          const tpHit = position.direction === 'LONG'
            ? currentBar.high >= position.take_profit_price
            : currentBar.low <= position.take_profit_price;

          if (tpHit) {
            closePosition(position, position.take_profit_price!, currentBar.datetime, 'TAKE_PROFIT', currentIndicators);
            continue;
          }
        }

        // Check exit signal
        if (checkExitSignal(strategy, currentIndicators, previousIndicators)) {
          const exitPrice = currentPrice * (1 - strategy.slippage_percent / 100);
          closePosition(position, exitPrice, currentBar.datetime, 'SIGNAL', currentIndicators);
        }
      }

      // Remove closed positions
      const closedPositions = positions.filter(p => 'exit_date' in p);
      closedPositions.forEach(p => {
        trades.push(p);
        const pl = (p as any).profit_loss;
        capital += pl;
      });
      positions = positions.filter(p => !('exit_date' in p));

      // Check for new entry signals
      if (positions.length < strategy.max_positions) {
        if (checkEntrySignal(strategy, currentIndicators, previousIndicators)) {
          const entryPrice = currentBar.close * (1 + strategy.slippage_percent / 100);
          const positionSize = calculatePositionSize(
            strategy,
            capital,
            entryPrice,
            currentIndicators.ATR as number
          );
          const shares = Math.floor(positionSize / entryPrice);

          if (shares > 0) {
            const commission = positionSize * (strategy.commission_percent / 100);
            const totalCost = shares * entryPrice + commission;

            if (totalCost <= capital) {
              capital -= totalCost;

              const position: Position = {
                id: uuidv4(),
                symbol,
                direction: 'LONG',
                entry_date: currentBar.datetime,
                entry_price: entryPrice,
                shares,
                position_size: positionSize,
                commission,
                slippage: entryPrice * (strategy.slippage_percent / 100) * shares,
                entry_signal: currentIndicators,
                lowest_price: currentBar.low,
                highest_price: currentBar.high,
                bars_in_trade: 0,
              };

              // Set stop loss and take profit
              if (strategy.stop_loss_percent) {
                position.stop_loss_price = entryPrice * (1 - strategy.stop_loss_percent / 100);
              }
              if (strategy.take_profit_percent) {
                position.take_profit_price = entryPrice * (1 + strategy.take_profit_percent / 100);
              }

              positions.push(position);
            }
          }
        }
      }

      // Calculate equity
      const positionValue = positions.reduce((sum, p) =>
        sum + p.shares * currentBar.close, 0
      );
      const equity = capital + positionValue;
      equityCurve.push({ date: currentBar.datetime, equity });

      // Track drawdown
      if (equity > peakCapital) {
        peakCapital = equity;
      }
      const drawdown = ((peakCapital - equity) / peakCapital) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    // Close any remaining positions
    if (positions.length > 0) {
      const lastBar = data[data.length - 1];
      const lastIndicators = calculateIndicators(data, data.length - 1);
      positions.forEach(p => {
        closePosition(p, lastBar.close, lastBar.datetime, 'END_OF_DATA', lastIndicators);
        trades.push(p);
        const pl = (p as any).profit_loss;
        capital += pl;
      });
    }

    // Calculate performance metrics
    const metrics = calculatePerformanceMetrics(trades, strategy.initial_capital, capital, equityCurve);

    // Update backtest run
    db.prepare(`
      UPDATE backtest_runs SET
        status = 'COMPLETED',
        total_trades = ?,
        winning_trades = ?,
        losing_trades = ?,
        total_return = ?,
        total_return_percent = ?,
        sharpe_ratio = ?,
        max_drawdown = ?,
        max_drawdown_percent = ?,
        profit_factor = ?,
        win_rate = ?,
        avg_win = ?,
        avg_loss = ?,
        largest_win = ?,
        largest_loss = ?,
        avg_bars_in_trade = ?,
        final_capital = ?,
        equity_curve = ?,
        monthly_returns = ?,
        completed_at = datetime('now')
      WHERE id = ?
    `).run(
      metrics.totalTrades,
      metrics.winningTrades,
      metrics.losingTrades,
      metrics.totalReturn,
      metrics.totalReturnPercent,
      metrics.sharpeRatio,
      metrics.maxDrawdown,
      metrics.maxDrawdownPercent,
      metrics.profitFactor,
      metrics.winRate,
      metrics.avgWin,
      metrics.avgLoss,
      metrics.largestWin,
      metrics.largestLoss,
      metrics.avgBarsInTrade,
      capital,
      JSON.stringify(equityCurve),
      JSON.stringify(metrics.monthlyReturns),
      runId
    );

    // Save trades
    const stmt = db.prepare(`
      INSERT INTO backtest_trades (
        id, backtest_run_id, symbol, direction, entry_date, entry_price,
        exit_date, exit_price, shares, position_size, commission, slippage,
        stop_loss_price, take_profit_price, exit_reason, profit_loss,
        profit_loss_percent, mae, mfe, bars_in_trade, entry_signal, exit_signal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    trades.forEach(trade => {
      stmt.run(
        trade.id,
        runId,
        trade.symbol,
        trade.direction,
        trade.entry_date,
        trade.entry_price,
        trade.exit_date,
        trade.exit_price,
        trade.shares,
        trade.position_size,
        trade.commission,
        trade.slippage,
        trade.stop_loss_price || null,
        trade.take_profit_price || null,
        trade.exit_reason,
        trade.profit_loss,
        trade.profit_loss_percent,
        trade.mae,
        trade.mfe,
        trade.bars_in_trade,
        JSON.stringify(trade.entry_signal),
        JSON.stringify(trade.exit_signal)
      );
    });

    return runId;

  } catch (error: any) {
    db.prepare(`
      UPDATE backtest_runs SET
        status = 'FAILED',
        error_message = ?,
        completed_at = datetime('now')
      WHERE id = ?
    `).run(error.message, runId);

    throw error;
  }
}

/**
 * Close a position and calculate P/L
 */
function closePosition(
  position: Position,
  exitPrice: number,
  exitDate: string,
  exitReason: string,
  exitSignal: IndicatorValues
): void {
  (position as any).exit_date = exitDate;
  (position as any).exit_price = exitPrice;
  (position as any).exit_reason = exitReason;
  (position as any).exit_signal = exitSignal;

  const proceeds = position.shares * exitPrice;
  const cost = position.shares * position.entry_price + position.commission;
  const exitCommission = proceeds * (position.commission / (position.shares * position.entry_price));

  (position as any).profit_loss = proceeds - cost - exitCommission;
  (position as any).profit_loss_percent = ((proceeds - cost - exitCommission) / cost) * 100;

  // Calculate MAE and MFE
  if (position.direction === 'LONG') {
    (position as any).mae = ((position.lowest_price - position.entry_price) / position.entry_price) * 100;
    (position as any).mfe = ((position.highest_price - position.entry_price) / position.entry_price) * 100;
  }
}

/**
 * Calculate performance metrics
 */
function calculatePerformanceMetrics(
  trades: any[],
  initialCapital: number,
  finalCapital: number,
  equityCurve: { date: string; equity: number }[]
) {
  const winningTrades = trades.filter(t => t.profit_loss > 0);
  const losingTrades = trades.filter(t => t.profit_loss < 0);

  const totalReturn = finalCapital - initialCapital;
  const totalReturnPercent = (totalReturn / initialCapital) * 100;

  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + t.profit_loss, 0) / winningTrades.length
    : 0;

  const avgLoss = losingTrades.length > 0
    ? losingTrades.reduce((sum, t) => sum + t.profit_loss, 0) / losingTrades.length
    : 0;

  const profitFactor = losingTrades.length > 0
    ? Math.abs(winningTrades.reduce((sum, t) => sum + t.profit_loss, 0) /
        losingTrades.reduce((sum, t) => sum + t.profit_loss, 0))
    : 0;

  // Calculate Sharpe Ratio
  const returns = equityCurve.slice(1).map((point, i) =>
    ((point.equity - equityCurve[i].equity) / equityCurve[i].equity) * 100
  );
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  );
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  // Calculate max drawdown
  let peak = initialCapital;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  equityCurve.forEach(point => {
    if (point.equity > peak) {
      peak = point.equity;
    }
    const drawdown = peak - point.equity;
    const drawdownPercent = (drawdown / peak) * 100;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
    maxDrawdownPercent = Math.max(maxDrawdownPercent, drawdownPercent);
  });

  // Monthly returns
  const monthlyReturns: { [key: string]: number } = {};
  equityCurve.forEach((point, i) => {
    if (i === 0) return;
    const month = point.date.substring(0, 7); // YYYY-MM
    const ret = ((point.equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity) * 100;
    if (!monthlyReturns[month]) {
      monthlyReturns[month] = 0;
    }
    monthlyReturns[month] += ret;
  });

  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    totalReturn,
    totalReturnPercent,
    sharpeRatio,
    maxDrawdown,
    maxDrawdownPercent,
    profitFactor,
    winRate: (winningTrades.length / trades.length) * 100,
    avgWin,
    avgLoss,
    largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.profit_loss)) : 0,
    largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.profit_loss)) : 0,
    avgBarsInTrade: trades.reduce((sum, t) => sum + t.bars_in_trade, 0) / trades.length,
    monthlyReturns,
  };
}
