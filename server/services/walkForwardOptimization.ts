import { v4 as uuidv4 } from 'uuid';
import db from './database';
import { runBacktest } from './backtestEngine';

interface WalkForwardParams {
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

interface OptimizationResult {
  params: { [key: string]: number };
  metric: number;
}

/**
 * Run walk-forward optimization
 */
export async function runWalkForwardOptimization(
  strategyId: string,
  symbol: string,
  startDate: string,
  endDate: string,
  params: WalkForwardParams
): Promise<string> {
  const runId = uuidv4();

  try {
    // Create backtest run record
    db.prepare(`
      INSERT INTO backtest_runs (
        id, strategy_id, symbol, start_date, end_date, timeframe,
        optimization_type, optimization_params, status
      ) VALUES (?, ?, ?, ?, ?, '1day', 'WALKFORWARD', ?, 'RUNNING')
    `).run(runId, strategyId, symbol, startDate, endDate, JSON.stringify(params));

    // Get strategy
    const strategy = db.prepare(`
      SELECT * FROM backtest_strategies WHERE id = ?
    `).get(strategyId) as any;

    if (!strategy) {
      throw new Error('Strategy not found');
    }

    // Calculate windows
    const windows = calculateWalkForwardWindows(
      startDate,
      endDate,
      params.train_window_months,
      params.test_window_months
    );

    if (windows.length === 0) {
      throw new Error('Insufficient data for walk-forward optimization');
    }

    const allTrades: any[] = [];
    const allEquityPoints: { date: string; equity: number }[] = [];
    let runningCapital = strategy.initial_capital;

    // Process each window
    for (let i = 0; i < windows.length; i++) {
      const window = windows[i];

      console.log(`Processing window ${i + 1}/${windows.length}...`);

      // Optimize on training period
      console.log(`  Optimizing on training period: ${window.train_start} to ${window.train_end}`);
      const bestParams = await optimizeParameters(
        strategyId,
        symbol,
        window.train_start,
        window.train_end,
        params.parameter_ranges,
        params.optimization_metric
      );

      // Test on out-of-sample period
      console.log(`  Testing on out-of-sample period: ${window.test_start} to ${window.test_end}`);
      const testRunId = await runBacktestWithParams(
        strategyId,
        symbol,
        window.test_start,
        window.test_end,
        bestParams
      );

      // Get test results
      const testRun = db.prepare(`
        SELECT * FROM backtest_runs WHERE id = ?
      `).get(testRunId) as any;

      const testTrades = db.prepare(`
        SELECT * FROM backtest_trades WHERE backtest_run_id = ?
      `).all(testRunId);

      // Save optimization results
      db.prepare(`
        INSERT INTO backtest_optimization_results (
          id, backtest_run_id, window_number, train_start_date, train_end_date,
          test_start_date, test_end_date, optimized_params, test_return,
          test_sharpe, test_max_drawdown
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        runId,
        i + 1,
        window.train_start,
        window.train_end,
        window.test_start,
        window.test_end,
        JSON.stringify(bestParams),
        testRun.total_return,
        testRun.sharpe_ratio,
        testRun.max_drawdown_percent
      );

      // Aggregate trades and equity
      allTrades.push(...testTrades);

      if (testRun.equity_curve) {
        const equityCurve = JSON.parse(testRun.equity_curve);
        // Adjust equity curve to account for running capital
        equityCurve.forEach((point: any) => {
          allEquityPoints.push({
            date: point.date,
            equity: runningCapital + (point.equity - strategy.initial_capital),
          });
        });
        runningCapital = allEquityPoints[allEquityPoints.length - 1].equity;
      }

      // Clean up individual test run
      db.prepare('DELETE FROM backtest_runs WHERE id = ?').run(testRunId);
    }

    // Calculate overall metrics
    const finalCapital = runningCapital;
    const totalReturn = finalCapital - strategy.initial_capital;
    const totalReturnPercent = (totalReturn / strategy.initial_capital) * 100;

    const winningTrades = allTrades.filter((t: any) => parseFloat(t.profit_loss || 0) > 0);
    const losingTrades = allTrades.filter((t: any) => parseFloat(t.profit_loss || 0) < 0);

    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + parseFloat(t.profit_loss || 0), 0) / winningTrades.length
      : 0;

    const avgLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + parseFloat(t.profit_loss || 0), 0) / losingTrades.length
      : 0;

    const profitFactor = losingTrades.length > 0
      ? Math.abs(winningTrades.reduce((sum, t) => sum + parseFloat(t.profit_loss || 0), 0) /
          losingTrades.reduce((sum, t) => sum + parseFloat(t.profit_loss || 0), 0))
      : 0;

    // Calculate Sharpe ratio
    const returns = allEquityPoints.slice(1).map((point, i) =>
      ((point.equity - allEquityPoints[i].equity) / allEquityPoints[i].equity) * 100
    );
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    // Calculate max drawdown
    let peak = strategy.initial_capital;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;

    allEquityPoints.forEach(point => {
      if (point.equity > peak) {
        peak = point.equity;
      }
      const drawdown = peak - point.equity;
      const drawdownPercent = (drawdown / peak) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
      maxDrawdownPercent = Math.max(maxDrawdownPercent, drawdownPercent);
    });

    // Update main backtest run
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
        final_capital = ?,
        equity_curve = ?,
        completed_at = datetime('now')
      WHERE id = ?
    `).run(
      allTrades.length,
      winningTrades.length,
      losingTrades.length,
      totalReturn,
      totalReturnPercent,
      sharpeRatio,
      maxDrawdown,
      maxDrawdownPercent,
      profitFactor,
      (winningTrades.length / allTrades.length) * 100,
      avgWin,
      avgLoss,
      winningTrades.length > 0 ? Math.max(...winningTrades.map(t => parseFloat(t.profit_loss || 0))) : 0,
      losingTrades.length > 0 ? Math.min(...losingTrades.map(t => parseFloat(t.profit_loss || 0))) : 0,
      finalCapital,
      JSON.stringify(allEquityPoints),
      runId
    );

    // Save all trades
    const stmt = db.prepare(`
      INSERT INTO backtest_trades (
        id, backtest_run_id, symbol, direction, entry_date, entry_price,
        exit_date, exit_price, shares, position_size, commission, slippage,
        stop_loss_price, take_profit_price, exit_reason, profit_loss,
        profit_loss_percent, mae, mfe, bars_in_trade, entry_signal, exit_signal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    allTrades.forEach(trade => {
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
        trade.entry_signal,
        trade.exit_signal
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
 * Calculate walk-forward windows
 */
function calculateWalkForwardWindows(
  startDate: string,
  endDate: string,
  trainMonths: number,
  testMonths: number
): Array<{
  train_start: string;
  train_end: string;
  test_start: string;
  test_end: string;
}> {
  const windows: Array<{
    train_start: string;
    train_end: string;
    test_start: string;
    test_end: string;
  }> = [];

  let currentDate = new Date(startDate);
  const finalDate = new Date(endDate);

  while (currentDate < finalDate) {
    const trainStart = new Date(currentDate);
    const trainEnd = new Date(currentDate);
    trainEnd.setMonth(trainEnd.getMonth() + trainMonths);

    const testStart = new Date(trainEnd);
    testStart.setDate(testStart.getDate() + 1);
    const testEnd = new Date(testStart);
    testEnd.setMonth(testEnd.getMonth() + testMonths);

    if (testEnd > finalDate) {
      testEnd.setTime(finalDate.getTime());
    }

    if (testStart < finalDate) {
      windows.push({
        train_start: trainStart.toISOString().split('T')[0],
        train_end: trainEnd.toISOString().split('T')[0],
        test_start: testStart.toISOString().split('T')[0],
        test_end: testEnd.toISOString().split('T')[0],
      });
    }

    // Move to next window
    currentDate.setMonth(currentDate.getMonth() + testMonths);
  }

  return windows;
}

/**
 * Optimize parameters on training data
 */
async function optimizeParameters(
  strategyId: string,
  symbol: string,
  startDate: string,
  endDate: string,
  paramRanges: { [param: string]: { min: number; max: number; step: number } },
  metric: string
): Promise<{ [key: string]: number }> {
  // Generate all parameter combinations
  const paramCombinations = generateParameterCombinations(paramRanges);

  let bestResult: OptimizationResult = {
    params: {},
    metric: metric === 'SHARPE' || metric === 'RETURN' || metric === 'PROFIT_FACTOR' || metric === 'WIN_RATE'
      ? -Infinity
      : Infinity,
  };

  console.log(`  Testing ${paramCombinations.length} parameter combinations...`);

  // Test each combination
  for (const params of paramCombinations) {
    try {
      const runId = await runBacktestWithParams(strategyId, symbol, startDate, endDate, params);

      const run = db.prepare(`
        SELECT * FROM backtest_runs WHERE id = ?
      `).get(runId) as any;

      let metricValue = 0;
      switch (metric) {
        case 'SHARPE':
          metricValue = run.sharpe_ratio || -Infinity;
          break;
        case 'RETURN':
          metricValue = run.total_return_percent || -Infinity;
          break;
        case 'PROFIT_FACTOR':
          metricValue = run.profit_factor || -Infinity;
          break;
        case 'WIN_RATE':
          metricValue = run.win_rate || -Infinity;
          break;
      }

      if (metricValue > bestResult.metric) {
        bestResult = { params, metric: metricValue };
      }

      // Clean up test run
      db.prepare('DELETE FROM backtest_trades WHERE backtest_run_id = ?').run(runId);
      db.prepare('DELETE FROM backtest_runs WHERE id = ?').run(runId);

    } catch (error) {
      console.error(`Error testing params ${JSON.stringify(params)}:`, error);
    }
  }

  console.log(`  Best params: ${JSON.stringify(bestResult.params)} with ${metric}=${bestResult.metric}`);

  return bestResult.params;
}

/**
 * Generate all parameter combinations
 */
function generateParameterCombinations(
  paramRanges: { [param: string]: { min: number; max: number; step: number } }
): Array<{ [key: string]: number }> {
  const params = Object.keys(paramRanges);
  const combinations: Array<{ [key: string]: number }> = [];

  function generate(index: number, current: { [key: string]: number }) {
    if (index === params.length) {
      combinations.push({ ...current });
      return;
    }

    const param = params[index];
    const range = paramRanges[param];

    for (let value = range.min; value <= range.max; value += range.step) {
      current[param] = value;
      generate(index + 1, current);
    }
  }

  generate(0, {});

  // Limit combinations to prevent excessive computation
  if (combinations.length > 100) {
    console.warn(`Generated ${combinations.length} combinations, limiting to 100 for performance`);
    return combinations.slice(0, 100);
  }

  return combinations;
}

/**
 * Run backtest with specific parameter values
 */
async function runBacktestWithParams(
  strategyId: string,
  symbol: string,
  startDate: string,
  endDate: string,
  params: { [key: string]: number }
): Promise<string> {
  // Clone strategy with new parameters
  const strategy = db.prepare(`
    SELECT * FROM backtest_strategies WHERE id = ?
  `).get(strategyId) as any;

  const tempStrategyId = uuidv4();

  // Apply parameter overrides to entry/exit rules
  const entryRules = JSON.parse(strategy.entry_rules);
  const exitRules = JSON.parse(strategy.exit_rules);

  Object.keys(params).forEach(paramKey => {
    const value = params[paramKey];

    // Update indicator parameters in rules
    entryRules.forEach((rule: any) => {
      if (rule.params && paramKey in rule.params) {
        rule.params[paramKey] = value;
      }
    });

    exitRules.forEach((rule: any) => {
      if (rule.params && paramKey in rule.params) {
        rule.params[paramKey] = value;
      }
    });
  });

  // Create temporary strategy
  db.prepare(`
    INSERT INTO backtest_strategies (
      id, name, description, entry_rules, exit_rules,
      position_sizing, position_size_value, stop_loss_percent, take_profit_percent,
      max_positions, commission_percent, slippage_percent, initial_capital
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tempStrategyId,
    strategy.name + ' (temp)',
    strategy.description,
    JSON.stringify(entryRules),
    JSON.stringify(exitRules),
    strategy.position_sizing,
    strategy.position_size_value,
    strategy.stop_loss_percent,
    strategy.take_profit_percent,
    strategy.max_positions,
    strategy.commission_percent,
    strategy.slippage_percent,
    strategy.initial_capital
  );

  const { runBacktest } = await import('./backtestEngine');
  const runId = await runBacktest(tempStrategyId, symbol, startDate, endDate);

  // Clean up temporary strategy
  db.prepare('DELETE FROM backtest_strategies WHERE id = ?').run(tempStrategyId);

  return runId;
}
