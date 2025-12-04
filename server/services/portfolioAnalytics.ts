import { PortfolioHolding, RiskMetrics, DiversificationAnalysis, PerformanceAttribution } from '../types';

/**
 * Calculate portfolio beta (weighted average of individual stock betas)
 */
export function calculatePortfolioBeta(holdings: PortfolioHolding[], betas: { [symbol: string]: number }): number {
  let weightedBeta = 0;
  holdings.forEach(holding => {
    const beta = betas[holding.symbol] || 1.0;
    weightedBeta += holding.weight * beta;
  });
  return weightedBeta;
}

/**
 * Calculate portfolio volatility (standard deviation of returns)
 */
export function calculateVolatility(returns: number[]): number {
  if (returns.length < 2) return 0;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((sum, sd) => sum + sd, 0) / (returns.length - 1);

  // Annualize (assuming daily returns)
  return Math.sqrt(variance) * Math.sqrt(252);
}

/**
 * Calculate Sharpe Ratio
 * (Portfolio Return - Risk Free Rate) / Portfolio Volatility
 */
export function calculateSharpeRatio(
  portfolioReturn: number,
  volatility: number,
  riskFreeRate: number = 0.04
): number {
  if (volatility === 0) return 0;
  return (portfolioReturn - riskFreeRate) / volatility;
}

/**
 * Calculate Value at Risk (VaR) using historical method
 * 95% confidence level
 */
export function calculateVaR(returns: number[], confidence: number = 0.95): number {
  if (returns.length === 0) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * sorted.length);
  return Math.abs(sorted[index] || 0);
}

/**
 * Calculate maximum drawdown
 */
export function calculateMaxDrawdown(values: number[]): number {
  if (values.length < 2) return 0;

  let maxDrawdown = 0;
  let peak = values[0];

  for (const value of values) {
    if (value > peak) {
      peak = value;
    }
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

/**
 * Calculate correlation matrix for portfolio holdings
 */
export function calculateCorrelationMatrix(
  holdings: PortfolioHolding[],
  priceHistories: { [symbol: string]: number[] }
): { [key: string]: { [key: string]: number } } {
  const matrix: { [key: string]: { [key: string]: number } } = {};

  holdings.forEach(holding1 => {
    matrix[holding1.symbol] = {};
    holdings.forEach(holding2 => {
      if (holding1.symbol === holding2.symbol) {
        matrix[holding1.symbol][holding2.symbol] = 1.0;
      } else {
        const corr = calculateCorrelation(
          priceHistories[holding1.symbol] || [],
          priceHistories[holding2.symbol] || []
        );
        matrix[holding1.symbol][holding2.symbol] = corr;
      }
    });
  });

  return matrix;
}

/**
 * Calculate correlation coefficient between two price series
 */
function calculateCorrelation(series1: number[], series2: number[]): number {
  const n = Math.min(series1.length, series2.length);
  if (n < 2) return 0;

  const returns1 = calculateReturns(series1.slice(0, n));
  const returns2 = calculateReturns(series2.slice(0, n));

  const mean1 = returns1.reduce((sum, r) => sum + r, 0) / returns1.length;
  const mean2 = returns2.reduce((sum, r) => sum + r, 0) / returns2.length;

  let numerator = 0;
  let sumSq1 = 0;
  let sumSq2 = 0;

  for (let i = 0; i < returns1.length; i++) {
    const diff1 = returns1[i] - mean1;
    const diff2 = returns2[i] - mean2;
    numerator += diff1 * diff2;
    sumSq1 += diff1 * diff1;
    sumSq2 += diff2 * diff2;
  }

  const denominator = Math.sqrt(sumSq1 * sumSq2);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate returns from price series
 */
function calculateReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
}

/**
 * Calculate Herfindahl Index (concentration measure)
 */
export function calculateHerfindahlIndex(holdings: PortfolioHolding[]): number {
  return holdings.reduce((sum, holding) => {
    const weight = holding.weight / 100; // Convert percentage to decimal
    return sum + (weight * weight);
  }, 0);
}

/**
 * Calculate diversification score (0-100)
 * Based on number of holdings, sector diversity, and concentration
 */
export function calculateDiversificationScore(
  holdings: PortfolioHolding[],
  sectorCounts: { [sector: string]: number }
): number {
  let score = 0;

  // Holdings count (up to 30 points)
  const holdingsScore = Math.min(holdings.length * 2, 30);
  score += holdingsScore;

  // Sector diversity (up to 40 points)
  const uniqueSectors = Object.keys(sectorCounts).length;
  const sectorScore = Math.min(uniqueSectors * 4, 40);
  score += sectorScore;

  // Concentration (up to 30 points)
  const herfindahl = calculateHerfindahlIndex(holdings);
  const concentrationScore = Math.max(0, 30 - (herfindahl * 100));
  score += concentrationScore;

  return Math.round(score);
}

/**
 * Calculate performance attribution
 */
export function calculatePerformanceAttribution(
  holdings: PortfolioHolding[],
  portfolioReturn: number,
  benchmarkReturn: number = 0
): PerformanceAttribution {
  const attribution = holdings.map(holding => {
    const holdingReturn = holding.unrealizedPLPercent;
    const contribution = (holding.weight / 100) * holdingReturn;

    return {
      symbol: holding.symbol,
      contribution: contribution,
      weight: holding.weight,
      return: holdingReturn
    };
  });

  // Sort by contribution
  attribution.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const alpha = portfolioReturn - benchmarkReturn;

  return {
    periodReturn: portfolioReturn,
    benchmarkReturn,
    alpha,
    attribution,
    timeWeightedReturn: portfolioReturn,
    moneyWeightedReturn: portfolioReturn // Simplified, would need cash flow data for accurate IRR
  };
}

/**
 * Analyze sector allocation
 */
export function analyzeSectorAllocation(holdings: PortfolioHolding[]): {
  sector: string;
  value: number;
  weight: number;
  holdings: number;
}[] {
  const sectorMap = new Map<string, { value: number; count: number }>();

  holdings.forEach(holding => {
    const sector = holding.sector || 'Unknown';
    const current = sectorMap.get(sector) || { value: 0, count: 0 };
    sectorMap.set(sector, {
      value: current.value + holding.marketValue,
      count: current.count + 1
    });
  });

  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);

  return Array.from(sectorMap.entries()).map(([sector, data]) => ({
    sector,
    value: data.value,
    weight: (data.value / totalValue) * 100,
    holdings: data.count
  })).sort((a, b) => b.value - a.value);
}

/**
 * Generate diversification recommendations
 */
export function generateDiversificationRecommendations(
  holdings: PortfolioHolding[],
  sectorAllocation: { sector: string; weight: number; holdings: number }[]
): string[] {
  const recommendations: string[] = [];

  // Check holdings count
  if (holdings.length < 8) {
    recommendations.push(`Consider adding more holdings. You currently have ${holdings.length} positions. A well-diversified portfolio typically has 10-20 holdings.`);
  }

  // Check concentration
  const herfindahl = calculateHerfindahlIndex(holdings);
  if (herfindahl > 0.25) {
    recommendations.push('Your portfolio is highly concentrated. Consider reducing position sizes to improve diversification.');
  }

  // Check top holding weight
  if (holdings.length > 0) {
    const topWeight = Math.max(...holdings.map(h => h.weight));
    if (topWeight > 20) {
      recommendations.push(`Your largest position represents ${topWeight.toFixed(1)}% of your portfolio. Consider reducing to below 15-20%.`);
    }
  }

  // Check sector concentration
  const topSector = sectorAllocation[0];
  if (topSector && topSector.weight > 30) {
    recommendations.push(`Your ${topSector.sector} exposure is ${topSector.weight.toFixed(1)}%. Consider diversifying into other sectors.`);
  }

  // Check sector diversity
  if (sectorAllocation.length < 4) {
    recommendations.push(`You're only invested in ${sectorAllocation.length} sectors. Consider expanding to 5-8 sectors for better diversification.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Your portfolio shows good diversification across holdings and sectors.');
  }

  return recommendations;
}
