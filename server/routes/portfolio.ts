import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../services/database';
import {
  calculatePortfolioBeta,
  calculateVolatility,
  calculateSharpeRatio,
  calculateVaR,
  calculateMaxDrawdown,
  calculateCorrelationMatrix,
  calculateHerfindahlIndex,
  calculateDiversificationScore,
  calculatePerformanceAttribution,
  analyzeSectorAllocation,
  generateDiversificationRecommendations
} from '../services/portfolioAnalytics';
import { getQuote, getTimeSeries } from '../services/twelveData';

const router = Router();

/**
 * GET /api/portfolio - Get all portfolios
 */
router.get('/', async (req, res) => {
  try {
    const portfolios = db.prepare(`
      SELECT p.*,
        COUNT(DISTINCT ph.id) as holdings_count,
        COALESCE(SUM(ph.shares * ph.avg_cost), 0) as total_cost
      FROM portfolios p
      LEFT JOIN portfolio_holdings ph ON p.id = ph.portfolio_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all();

    res.json(portfolios);
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    res.status(500).json({ error: 'Failed to fetch portfolios' });
  }
});

/**
 * POST /api/portfolio - Create a new portfolio
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, cash_balance = 0 } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Portfolio name is required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO portfolios (id, name, description, cash_balance, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, description || null, cash_balance, now, now);

    const portfolio = db.prepare('SELECT * FROM portfolios WHERE id = ?').get(id);
    res.status(201).json(portfolio);
  } catch (error) {
    console.error('Error creating portfolio:', error);
    res.status(500).json({ error: 'Failed to create portfolio' });
  }
});

/**
 * GET /api/portfolio/:id - Get portfolio with full analytics
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const portfolio = db.prepare('SELECT * FROM portfolios WHERE id = ?').get(id);
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const holdings = db.prepare(`
      SELECT * FROM portfolio_holdings WHERE portfolio_id = ? ORDER BY symbol
    `).all(id);

    // Fetch current prices and update holdings
    const enrichedHoldings = await enrichHoldingsWithPrices(holdings);

    // Calculate portfolio summary
    const summary = calculatePortfolioSummary(enrichedHoldings, portfolio.cash_balance);

    // Calculate risk metrics
    const riskMetrics = await calculateRiskMetrics(enrichedHoldings);

    // Calculate diversification analysis
    const diversification = calculateDiversificationAnalysis(enrichedHoldings, summary.totalValue);

    // Calculate performance attribution
    const performanceAttribution = calculatePerformanceAttribution(
      enrichedHoldings,
      summary.totalPLPercent,
      0 // Benchmark return - could be S&P 500
    );

    // Get performance history
    const performance = await calculatePerformanceHistory(id, enrichedHoldings);

    res.json({
      ...portfolio,
      holdings: enrichedHoldings,
      summary,
      riskMetrics,
      diversification,
      performanceAttribution,
      performance
    });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

/**
 * POST /api/portfolio/:id/transaction - Add a buy/sell transaction
 */
router.post('/:id/transaction', async (req, res) => {
  try {
    const { id } = req.params;
    const { symbol, type, shares, price, transaction_date, commission = 0, notes } = req.body;

    if (!symbol || !type || !shares || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const portfolio = db.prepare('SELECT * FROM portfolios WHERE id = ?').get(id);
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const transactionId = uuidv4();
    const now = new Date().toISOString();
    const txDate = transaction_date || now;

    // Get stock name
    let stockName = symbol;
    try {
      const quote = await getQuote(symbol);
      stockName = quote.name || symbol;
    } catch (e) {
      console.warn(`Could not fetch name for ${symbol}`);
    }

    // Record transaction
    db.prepare(`
      INSERT INTO portfolio_transactions
      (id, portfolio_id, symbol, type, shares, price, transaction_date, commission, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(transactionId, id, symbol, type, shares, price, txDate, commission, notes || null, now);

    // Update holdings
    const existing = db.prepare(`
      SELECT * FROM portfolio_holdings WHERE portfolio_id = ? AND symbol = ?
    `).get(id, symbol);

    if (type === 'BUY') {
      if (existing) {
        // Update existing holding
        const totalShares = existing.shares + shares;
        const totalCost = (existing.shares * existing.avg_cost) + (shares * price);
        const newAvgCost = totalCost / totalShares;

        db.prepare(`
          UPDATE portfolio_holdings
          SET shares = ?, avg_cost = ?, last_updated = ?
          WHERE id = ?
        `).run(totalShares, newAvgCost, now, existing.id);
      } else {
        // Create new holding
        const holdingId = uuidv4();
        db.prepare(`
          INSERT INTO portfolio_holdings
          (id, portfolio_id, symbol, name, shares, avg_cost, first_purchase_date, last_updated)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(holdingId, id, symbol, stockName, shares, price, txDate, now);
      }

      // Deduct cash
      const totalCost = (shares * price) + commission;
      db.prepare('UPDATE portfolios SET cash_balance = cash_balance - ?, updated_at = ? WHERE id = ?')
        .run(totalCost, now, id);

    } else if (type === 'SELL') {
      if (!existing || existing.shares < shares) {
        return res.status(400).json({ error: 'Insufficient shares to sell' });
      }

      const newShares = existing.shares - shares;
      if (newShares === 0) {
        // Remove holding
        db.prepare('DELETE FROM portfolio_holdings WHERE id = ?').run(existing.id);
      } else {
        // Update holding
        db.prepare(`
          UPDATE portfolio_holdings
          SET shares = ?, last_updated = ?
          WHERE id = ?
        `).run(newShares, now, existing.id);
      }

      // Add cash
      const totalProceeds = (shares * price) - commission;
      db.prepare('UPDATE portfolios SET cash_balance = cash_balance + ?, updated_at = ? WHERE id = ?')
        .run(totalProceeds, now, id);
    }

    res.status(201).json({ message: 'Transaction completed successfully', transactionId });
  } catch (error) {
    console.error('Error processing transaction:', error);
    res.status(500).json({ error: 'Failed to process transaction' });
  }
});

/**
 * GET /api/portfolio/:id/transactions - Get transaction history
 */
router.get('/:id/transactions', async (req, res) => {
  try {
    const { id } = req.params;

    const transactions = db.prepare(`
      SELECT * FROM portfolio_transactions
      WHERE portfolio_id = ?
      ORDER BY transaction_date DESC
    `).all(id);

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * DELETE /api/portfolio/:id - Delete a portfolio
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM portfolios WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    res.json({ message: 'Portfolio deleted successfully' });
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    res.status(500).json({ error: 'Failed to delete portfolio' });
  }
});

// Helper functions

async function enrichHoldingsWithPrices(holdings: any[]) {
  const enriched = [];

  for (const holding of holdings) {
    try {
      const quote = await getQuote(holding.symbol);
      const currentPrice = quote.price || holding.avg_cost;
      const marketValue = holding.shares * currentPrice;
      const costBasis = holding.shares * holding.avg_cost;
      const unrealizedPL = marketValue - costBasis;
      const unrealizedPLPercent = (unrealizedPL / costBasis) * 100;

      // Get previous close for day change
      const dayChange = quote.change || 0;
      const dayChangePercent = quote.percent_change || 0;

      enriched.push({
        ...holding,
        currentPrice,
        marketValue,
        costBasis,
        unrealizedPL,
        unrealizedPLPercent,
        dayChange: dayChange * holding.shares,
        dayChangePercent,
        sector: quote.sector || null,
        industry: quote.industry || null,
        weight: 0 // Will be calculated after we know total value
      });
    } catch (error) {
      console.error(`Error enriching ${holding.symbol}:`, error);
      // Use holding data as fallback
      const marketValue = holding.shares * holding.avg_cost;
      enriched.push({
        ...holding,
        currentPrice: holding.avg_cost,
        marketValue,
        costBasis: marketValue,
        unrealizedPL: 0,
        unrealizedPLPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
        weight: 0
      });
    }
  }

  // Calculate weights
  const totalValue = enriched.reduce((sum, h) => sum + h.marketValue, 0);
  enriched.forEach(h => {
    h.weight = totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0;
  });

  return enriched;
}

function calculatePortfolioSummary(holdings: any[], cashBalance: number) {
  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0) + cashBalance;
  const totalCost = holdings.reduce((sum, h) => sum + h.costBasis, 0) + cashBalance;
  const totalPL = totalValue - totalCost;
  const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
  const dayChange = holdings.reduce((sum, h) => sum + h.dayChange, 0);
  const dayChangePercent = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

  return {
    totalValue,
    totalCost,
    totalPL,
    totalPLPercent,
    dayChange,
    dayChangePercent,
    cashBalance,
    holdings: holdings.length,
    lastUpdated: new Date().toISOString()
  };
}

async function calculateRiskMetrics(holdings: any[]) {
  const symbols = holdings.map(h => h.symbol);

  // Fetch historical data for calculations
  const priceHistories: { [symbol: string]: number[] } = {};
  const betas: { [symbol: string]: number } = {};

  for (const symbol of symbols) {
    try {
      const timeseries = await getTimeSeries(symbol, '1day', 100);
      if (timeseries && timeseries.values) {
        priceHistories[symbol] = timeseries.values.map((v: any) => parseFloat(v.close));
      }
      // Simplified beta calculation (would need market data for real beta)
      betas[symbol] = 1.0 + (Math.random() - 0.5); // Placeholder
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
    }
  }

  // Calculate metrics
  const portfolioBeta = calculatePortfolioBeta(holdings, betas);

  // Calculate portfolio returns for volatility
  const portfolioReturns = calculatePortfolioReturns(holdings, priceHistories);
  const volatility = calculateVolatility(portfolioReturns);
  const sharpeRatio = calculateSharpeRatio(holdings.reduce((sum, h) => sum + h.unrealizedPLPercent * (h.weight / 100), 0) / 100, volatility);
  const valueAtRisk = calculateVaR(portfolioReturns);

  // Calculate max drawdown from portfolio history
  const portfolioValues = calculatePortfolioValues(holdings, priceHistories);
  const maxDrawdown = calculateMaxDrawdown(portfolioValues);

  const correlationMatrix = calculateCorrelationMatrix(holdings, priceHistories);

  const topWeight = holdings.length > 0 ? Math.max(...holdings.map(h => h.weight)) : 0;
  const top5Holdings = holdings
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .reduce((sum, h) => sum + h.weight, 0);

  return {
    portfolioBeta,
    sharpeRatio,
    volatility,
    valueAtRisk,
    maxDrawdown,
    correlationMatrix,
    concentrationRisk: {
      topHolding: topWeight,
      top5Holdings,
      herfindahlIndex: calculateHerfindahlIndex(holdings)
    }
  };
}

function calculatePortfolioReturns(holdings: any[], priceHistories: { [symbol: string]: number[] }): number[] {
  const periods = Math.min(...Object.values(priceHistories).map(prices => prices.length));
  if (periods < 2) return [];

  const returns: number[] = [];
  for (let i = 1; i < periods; i++) {
    let portfolioReturn = 0;
    holdings.forEach(holding => {
      const prices = priceHistories[holding.symbol];
      if (prices && prices.length > i) {
        const periodReturn = (prices[i] - prices[i - 1]) / prices[i - 1];
        portfolioReturn += (holding.weight / 100) * periodReturn;
      }
    });
    returns.push(portfolioReturn);
  }

  return returns;
}

function calculatePortfolioValues(holdings: any[], priceHistories: { [symbol: string]: number[] }): number[] {
  const periods = Math.min(...Object.values(priceHistories).map(prices => prices.length));
  if (periods < 1) return [];

  const values: number[] = [];
  for (let i = 0; i < periods; i++) {
    let totalValue = 0;
    holdings.forEach(holding => {
      const prices = priceHistories[holding.symbol];
      if (prices && prices.length > i) {
        totalValue += holding.shares * prices[i];
      }
    });
    values.push(totalValue);
  }

  return values;
}

function calculateDiversificationAnalysis(holdings: any[], totalValue: number) {
  const sectorAllocation = analyzeSectorAllocation(holdings);

  const sectorCounts: { [sector: string]: number } = {};
  sectorAllocation.forEach(s => sectorCounts[s.sector] = s.holdings);

  const diversificationScore = calculateDiversificationScore(holdings, sectorCounts);
  const recommendations = generateDiversificationRecommendations(holdings, sectorAllocation);

  const assetAllocation = [
    {
      type: 'Stocks' as const,
      value: holdings.reduce((sum, h) => sum + h.marketValue, 0),
      weight: (holdings.reduce((sum, h) => sum + h.marketValue, 0) / totalValue) * 100
    },
    {
      type: 'Cash' as const,
      value: totalValue - holdings.reduce((sum, h) => sum + h.marketValue, 0),
      weight: ((totalValue - holdings.reduce((sum, h) => sum + h.marketValue, 0)) / totalValue) * 100
    }
  ];

  return {
    sectorAllocation,
    assetAllocation,
    diversificationScore,
    recommendations
  };
}

async function calculatePerformanceHistory(portfolioId: string, holdings: any[]) {
  // Get historical portfolio values
  const history = db.prepare(`
    SELECT date, total_value, cash_balance
    FROM portfolio_history
    WHERE portfolio_id = ?
    ORDER BY date DESC
    LIMIT 365
  `).all(portfolioId);

  const daily = history.reverse().map((h: any, i: number, arr: any[]) => {
    const prevValue = i > 0 ? arr[i - 1].total_value : h.total_value;
    const returnPct = prevValue > 0 ? ((h.total_value - prevValue) / prevValue) * 100 : 0;
    return {
      date: h.date,
      value: h.total_value,
      return: returnPct
    };
  });

  // Calculate cumulative returns
  const currentValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const cumulative = {
    '1D': daily.length > 0 ? daily[daily.length - 1].return : 0,
    '1W': calculateCumulativeReturn(daily, 7),
    '1M': calculateCumulativeReturn(daily, 30),
    '3M': calculateCumulativeReturn(daily, 90),
    'YTD': calculateYTDReturn(daily),
    '1Y': calculateCumulativeReturn(daily, 365),
    'ALL': daily.length > 0 ? ((currentValue - daily[0].value) / daily[0].value) * 100 : 0
  };

  return {
    daily,
    cumulative,
    annualized: {
      '1Y': cumulative['1Y'],
      '3Y': 0, // Would need 3 years of data
      '5Y': 0, // Would need 5 years of data
      'ALL': cumulative['ALL']
    }
  };
}

function calculateCumulativeReturn(daily: any[], days: number): number {
  if (daily.length < days) return 0;
  const start = daily[daily.length - days].value;
  const end = daily[daily.length - 1].value;
  return start > 0 ? ((end - start) / start) * 100 : 0;
}

function calculateYTDReturn(daily: any[]): number {
  const now = new Date();
  const ytdStart = new Date(now.getFullYear(), 0, 1);
  const ytdData = daily.filter(d => new Date(d.date) >= ytdStart);

  if (ytdData.length < 2) return 0;
  const start = ytdData[0].value;
  const end = ytdData[ytdData.length - 1].value;
  return start > 0 ? ((end - start) / start) * 100 : 0;
}

export default router;
