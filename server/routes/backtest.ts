import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../services/database';
import { runBacktest } from '../services/backtestEngine';
import { runWalkForwardOptimization } from '../services/walkForwardOptimization';

const router = Router();

/**
 * GET /api/backtest/strategies - Get all strategies
 */
router.get('/strategies', async (req, res) => {
  try {
    const strategies = db.prepare(`
      SELECT * FROM backtest_strategies
      ORDER BY updated_at DESC
    `).all();

    strategies.forEach((s: any) => {
      s.entry_rules = JSON.parse(s.entry_rules);
      s.exit_rules = JSON.parse(s.exit_rules);
    });

    res.json(strategies);
  } catch (error: any) {
    console.error('Error fetching strategies:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/backtest/strategies/:id - Get strategy by ID
 */
router.get('/strategies/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const strategy = db.prepare(`
      SELECT * FROM backtest_strategies WHERE id = ?
    `).get(id) as any;

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    strategy.entry_rules = JSON.parse(strategy.entry_rules);
    strategy.exit_rules = JSON.parse(strategy.exit_rules);

    res.json(strategy);
  } catch (error: any) {
    console.error('Error fetching strategy:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/backtest/strategies - Create new strategy
 */
router.post('/strategies', async (req, res) => {
  try {
    const {
      name,
      description,
      entry_rules,
      exit_rules,
      position_sizing = 'PERCENT_CAPITAL',
      position_size_value = 10,
      stop_loss_percent,
      take_profit_percent,
      max_positions = 1,
      commission_percent = 0,
      slippage_percent = 0,
      initial_capital = 10000,
    } = req.body;

    if (!name || !entry_rules || !exit_rules) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();

    db.prepare(`
      INSERT INTO backtest_strategies (
        id, name, description, entry_rules, exit_rules,
        position_sizing, position_size_value, stop_loss_percent, take_profit_percent,
        max_positions, commission_percent, slippage_percent, initial_capital
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      description || null,
      JSON.stringify(entry_rules),
      JSON.stringify(exit_rules),
      position_sizing,
      position_size_value,
      stop_loss_percent || null,
      take_profit_percent || null,
      max_positions,
      commission_percent,
      slippage_percent,
      initial_capital
    );

    const strategy = db.prepare(`
      SELECT * FROM backtest_strategies WHERE id = ?
    `).get(id) as any;

    strategy.entry_rules = JSON.parse(strategy.entry_rules);
    strategy.exit_rules = JSON.parse(strategy.exit_rules);

    res.json(strategy);
  } catch (error: any) {
    console.error('Error creating strategy:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/backtest/strategies/:id - Update strategy
 */
router.put('/strategies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      entry_rules,
      exit_rules,
      position_sizing,
      position_size_value,
      stop_loss_percent,
      take_profit_percent,
      max_positions,
      commission_percent,
      slippage_percent,
      initial_capital,
    } = req.body;

    db.prepare(`
      UPDATE backtest_strategies SET
        name = ?,
        description = ?,
        entry_rules = ?,
        exit_rules = ?,
        position_sizing = ?,
        position_size_value = ?,
        stop_loss_percent = ?,
        take_profit_percent = ?,
        max_positions = ?,
        commission_percent = ?,
        slippage_percent = ?,
        initial_capital = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name,
      description || null,
      JSON.stringify(entry_rules),
      JSON.stringify(exit_rules),
      position_sizing,
      position_size_value,
      stop_loss_percent || null,
      take_profit_percent || null,
      max_positions,
      commission_percent,
      slippage_percent,
      initial_capital,
      id
    );

    const strategy = db.prepare(`
      SELECT * FROM backtest_strategies WHERE id = ?
    `).get(id) as any;

    strategy.entry_rules = JSON.parse(strategy.entry_rules);
    strategy.exit_rules = JSON.parse(strategy.exit_rules);

    res.json(strategy);
  } catch (error: any) {
    console.error('Error updating strategy:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/backtest/strategies/:id - Delete strategy
 */
router.delete('/strategies/:id', async (req, res) => {
  try {
    const { id } = req.params;

    db.prepare(`
      DELETE FROM backtest_strategies WHERE id = ?
    `).run(id);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting strategy:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/backtest/runs - Get all backtest runs
 */
router.get('/runs', async (req, res) => {
  try {
    const runs = db.prepare(`
      SELECT br.*, bs.name as strategy_name
      FROM backtest_runs br
      LEFT JOIN backtest_strategies bs ON br.strategy_id = bs.id
      ORDER BY br.created_at DESC
    `).all();

    runs.forEach((r: any) => {
      if (r.equity_curve) r.equity_curve = JSON.parse(r.equity_curve);
      if (r.monthly_returns) r.monthly_returns = JSON.parse(r.monthly_returns);
      if (r.optimization_params) r.optimization_params = JSON.parse(r.optimization_params);
    });

    res.json(runs);
  } catch (error: any) {
    console.error('Error fetching runs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/backtest/runs/:id - Get backtest run by ID
 */
router.get('/runs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const run = db.prepare(`
      SELECT * FROM backtest_runs WHERE id = ?
    `).get(id) as any;

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    if (run.equity_curve) run.equity_curve = JSON.parse(run.equity_curve);
    if (run.monthly_returns) run.monthly_returns = JSON.parse(run.monthly_returns);
    if (run.optimization_params) run.optimization_params = JSON.parse(run.optimization_params);

    // Get strategy
    const strategy = db.prepare(`
      SELECT * FROM backtest_strategies WHERE id = ?
    `).get(run.strategy_id) as any;

    if (strategy) {
      strategy.entry_rules = JSON.parse(strategy.entry_rules);
      strategy.exit_rules = JSON.parse(strategy.exit_rules);
      run.strategy = strategy;
    }

    // Get trades
    const trades = db.prepare(`
      SELECT * FROM backtest_trades WHERE backtest_run_id = ?
      ORDER BY entry_date ASC
    `).all(id);

    trades.forEach((t: any) => {
      if (t.entry_signal) t.entry_signal = JSON.parse(t.entry_signal);
      if (t.exit_signal) t.exit_signal = JSON.parse(t.exit_signal);
    });

    run.trades = trades;

    // Get optimization results if any
    if (run.optimization_type) {
      const optResults = db.prepare(`
        SELECT * FROM backtest_optimization_results
        WHERE backtest_run_id = ?
        ORDER BY window_number ASC
      `).all(id);

      optResults.forEach((r: any) => {
        if (r.optimized_params) r.optimized_params = JSON.parse(r.optimized_params);
      });

      run.optimization_results = optResults;
    }

    res.json(run);
  } catch (error: any) {
    console.error('Error fetching run:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/backtest/run - Start a backtest
 */
router.post('/run', async (req, res) => {
  try {
    const {
      strategy_id,
      symbol,
      start_date,
      end_date,
      timeframe = '1day',
      optimization_type,
      optimization_params,
    } = req.body;

    if (!strategy_id || !symbol || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let runId: string;

    if (optimization_type === 'WALKFORWARD' && optimization_params) {
      // Run walk-forward optimization
      runId = await runWalkForwardOptimization(
        strategy_id,
        symbol,
        start_date,
        end_date,
        optimization_params
      );
    } else {
      // Run simple backtest
      runId = await runBacktest(strategy_id, symbol, start_date, end_date, timeframe);
    }

    const run = db.prepare(`
      SELECT * FROM backtest_runs WHERE id = ?
    `).get(runId) as any;

    if (run.equity_curve) run.equity_curve = JSON.parse(run.equity_curve);
    if (run.monthly_returns) run.monthly_returns = JSON.parse(run.monthly_returns);

    res.json(run);
  } catch (error: any) {
    console.error('Error running backtest:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/backtest/runs/:id - Delete backtest run
 */
router.delete('/runs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    db.prepare(`
      DELETE FROM backtest_runs WHERE id = ?
    `).run(id);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting run:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/backtest/indicators - Get available indicators
 */
router.get('/indicators', async (req, res) => {
  try {
    const indicators = [
      {
        id: 'RSI',
        name: 'Relative Strength Index',
        params: [{ name: 'period', type: 'number', default: 14, min: 2, max: 50 }],
        outputs: ['RSI'],
      },
      {
        id: 'MACD',
        name: 'MACD',
        params: [
          { name: 'fast', type: 'number', default: 12, min: 2, max: 50 },
          { name: 'slow', type: 'number', default: 26, min: 2, max: 100 },
          { name: 'signal', type: 'number', default: 9, min: 2, max: 50 },
        ],
        outputs: ['MACD', 'MACD_signal', 'MACD_histogram'],
      },
      {
        id: 'SMA',
        name: 'Simple Moving Average',
        params: [{ name: 'period', type: 'number', default: 20, min: 2, max: 200 }],
        outputs: ['SMA_{period}'],
      },
      {
        id: 'EMA',
        name: 'Exponential Moving Average',
        params: [{ name: 'period', type: 'number', default: 20, min: 2, max: 200 }],
        outputs: ['EMA_{period}'],
      },
      {
        id: 'BB',
        name: 'Bollinger Bands',
        params: [
          { name: 'period', type: 'number', default: 20, min: 2, max: 100 },
          { name: 'std_dev', type: 'number', default: 2, min: 1, max: 3 },
        ],
        outputs: ['BB_upper', 'BB_middle', 'BB_lower', 'BB_width'],
      },
      {
        id: 'STOCH',
        name: 'Stochastic Oscillator',
        params: [
          { name: 'k_period', type: 'number', default: 14, min: 2, max: 50 },
          { name: 'd_period', type: 'number', default: 3, min: 2, max: 20 },
        ],
        outputs: ['STOCH_k', 'STOCH_d'],
      },
      {
        id: 'ATR',
        name: 'Average True Range',
        params: [{ name: 'period', type: 'number', default: 14, min: 2, max: 50 }],
        outputs: ['ATR'],
      },
      {
        id: 'ADX',
        name: 'Average Directional Index',
        params: [{ name: 'period', type: 'number', default: 14, min: 2, max: 50 }],
        outputs: ['ADX'],
      },
      {
        id: 'PRICE',
        name: 'Price',
        params: [],
        outputs: ['close', 'open', 'high', 'low'],
      },
      {
        id: 'VOLUME',
        name: 'Volume',
        params: [],
        outputs: ['volume'],
      },
    ];

    res.json(indicators);
  } catch (error: any) {
    console.error('Error fetching indicators:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
