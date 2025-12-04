/**
 * Fundamental Analysis Service
 *
 * Note: This is a demo implementation. In production, you would integrate with:
 * - Alpha Vantage (financial statements)
 * - SEC EDGAR API (insider transactions)
 * - Or TwelveData Pro/Enterprise tier
 */

interface DCFAssumptions {
  revenueGrowthRate: number;
  terminalGrowthRate: number;
  discountRate: number; // WACC
  projectionYears: number;
  fcfMargin: number; // Free Cash Flow as % of revenue
}

export function calculateDCF(
  currentRevenue: number,
  currentPrice: number,
  sharesOutstanding: number,
  assumptions: DCFAssumptions
) {
  const projections = [];
  let revenue = currentRevenue;

  // Project future cash flows
  for (let year = 1; year <= assumptions.projectionYears; year++) {
    revenue *= (1 + assumptions.revenueGrowthRate);
    const freeCashFlow = revenue * assumptions.fcfMargin;
    const discountedFCF = freeCashFlow / Math.pow(1 + assumptions.discountRate, year);

    projections.push({
      year,
      revenue,
      freeCashFlow,
      discountedFCF,
    });
  }

  // Calculate terminal value
  const terminalFCF = projections[projections.length - 1].freeCashFlow * (1 + assumptions.terminalGrowthRate);
  const terminalValue = terminalFCF / (assumptions.discountRate - assumptions.terminalGrowthRate);
  const discountedTerminalValue = terminalValue / Math.pow(1 + assumptions.discountRate, assumptions.projectionYears);

  // Calculate enterprise value
  const pvOfProjectedFCF = projections.reduce((sum, p) => sum + p.discountedFCF, 0);
  const enterpriseValue = pvOfProjectedFCF + discountedTerminalValue;

  // Calculate equity value per share
  const equityValue = enterpriseValue; // Simplified: not adjusting for debt/cash
  const intrinsicValue = equityValue / sharesOutstanding;
  const upside = ((intrinsicValue - currentPrice) / currentPrice) * 100;

  return {
    currentPrice,
    intrinsicValue,
    upside,
    assumptions,
    projections,
    terminalValue: discountedTerminalValue,
    enterpriseValue,
  };
}

export function calculateFinancialRatios(
  incomeStatement: any,
  balanceSheet: any,
  marketCap: number,
  price: number
) {
  const revenue = incomeStatement.revenue || 1;
  const netIncome = incomeStatement.netIncome || 0;
  const grossProfit = incomeStatement.grossProfit || 0;
  const operatingIncome = incomeStatement.operatingIncome || 0;
  const totalAssets = balanceSheet.totalAssets || 1;
  const totalEquity = balanceSheet.totalEquity || 1;
  const currentAssets = balanceSheet.currentAssets || 0;
  const currentLiabilities = balanceSheet.currentLiabilities || 1;
  const cash = balanceSheet.cash || 0;
  const debt = balanceSheet.debt || 0;
  const sharesOutstanding = marketCap / price || 1;

  return {
    // Profitability
    grossMargin: (grossProfit / revenue) * 100,
    operatingMargin: (operatingIncome / revenue) * 100,
    netMargin: (netIncome / revenue) * 100,
    roe: (netIncome / totalEquity) * 100,
    roa: (netIncome / totalAssets) * 100,
    roic: (netIncome / (totalEquity + debt)) * 100,

    // Liquidity
    currentRatio: currentAssets / currentLiabilities,
    quickRatio: (currentAssets - (currentAssets * 0.3)) / currentLiabilities, // Assuming 30% inventory
    cashRatio: cash / currentLiabilities,

    // Leverage
    debtToEquity: debt / totalEquity,
    debtToAssets: debt / totalAssets,
    interestCoverage: operatingIncome / (debt * 0.05), // Assuming 5% interest rate

    // Efficiency
    assetTurnover: revenue / totalAssets,
    inventoryTurnover: revenue / (currentAssets * 0.3), // Estimate
    receivablesTurnover: revenue / (currentAssets * 0.25), // Estimate

    // Valuation
    peRatio: price / (netIncome / sharesOutstanding),
    pbRatio: price / (totalEquity / sharesOutstanding),
    psRatio: marketCap / revenue,
    pegRatio: (price / (netIncome / sharesOutstanding)) / 15, // Assuming 15% growth
    evToEbitda: (marketCap + debt - cash) / (incomeStatement.ebitda || operatingIncome),
    priceToFreeCashFlow: marketCap / (revenue * 0.15), // Estimate 15% FCF margin
  };
}

// Mock data generator for demo purposes
export function generateMockFundamentals(symbol: string, name: string, price: number, marketCap: number) {
  const revenue = marketCap * 2; // Rough estimate
  const netIncome = revenue * 0.15;
  const totalAssets = revenue * 1.5;
  const totalEquity = totalAssets * 0.6;
  const debt = totalAssets * 0.2;

  const incomeStatement = {
    fiscalYear: '2024',
    revenue,
    costOfRevenue: revenue * 0.6,
    grossProfit: revenue * 0.4,
    operatingExpenses: revenue * 0.2,
    operatingIncome: revenue * 0.2,
    netIncome,
    eps: netIncome / (marketCap / price),
    ebitda: revenue * 0.25,
  };

  const balanceSheet = {
    fiscalYear: '2024',
    totalAssets,
    currentAssets: totalAssets * 0.4,
    totalLiabilities: totalAssets - totalEquity,
    currentLiabilities: (totalAssets - totalEquity) * 0.5,
    totalEquity,
    cash: totalAssets * 0.15,
    debt,
    workingCapital: totalAssets * 0.4 - (totalAssets - totalEquity) * 0.5,
  };

  const cashFlow = {
    fiscalYear: '2024',
    operatingCashFlow: netIncome * 1.2,
    investingCashFlow: -revenue * 0.1,
    financingCashFlow: -revenue * 0.05,
    freeCashFlow: netIncome * 1.2 - revenue * 0.1,
    capitalExpenditures: revenue * 0.1,
  };

  const ratios = calculateFinancialRatios(incomeStatement, balanceSheet, marketCap, price);

  const dcfAssumptions = {
    revenueGrowthRate: 0.15,
    terminalGrowthRate: 0.03,
    discountRate: 0.10,
    projectionYears: 5,
    fcfMargin: 0.15,
  };

  const dcf = calculateDCF(
    revenue,
    price,
    marketCap / price,
    dcfAssumptions
  );

  // Mock insider transactions
  const insiderTransactions = [
    {
      filingDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      transactionDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      insider: 'John Smith',
      title: 'CEO',
      transactionType: 'Buy' as const,
      shares: 10000,
      pricePerShare: price * 0.95,
      totalValue: 10000 * price * 0.95,
      sharesOwned: 500000,
    },
    {
      filingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      transactionDate: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      insider: 'Jane Doe',
      title: 'CFO',
      transactionType: 'Sell' as const,
      shares: 5000,
      pricePerShare: price * 1.02,
      totalValue: 5000 * price * 1.02,
      sharesOwned: 250000,
    },
    {
      filingDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      transactionDate: new Date(Date.now() - 62 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      insider: 'Robert Johnson',
      title: 'Director',
      transactionType: 'Buy' as const,
      shares: 25000,
      pricePerShare: price * 0.92,
      totalValue: 25000 * price * 0.92,
      sharesOwned: 100000,
    },
  ];

  return {
    symbol,
    name,
    description: `${name} is a leading company in its industry.`,
    sector: 'Technology',
    industry: 'Software',
    marketCap,
    employees: Math.floor(marketCap / 500000),
    founded: '2010',
    headquarters: 'San Francisco, CA',

    incomeStatements: [incomeStatement],
    balanceSheets: [balanceSheet],
    cashFlows: [cashFlow],

    ratios,
    dcf,
    insiderTransactions,

    revenueGrowthQoQ: 8.5,
    revenueGrowthYoY: 22.3,
    earningsGrowthQoQ: 12.1,
    earningsGrowthYoY: 28.7,
  };
}
