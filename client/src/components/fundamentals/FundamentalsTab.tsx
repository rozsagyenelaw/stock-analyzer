import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fundamentalsApi } from '@/services/api';
import { CompanyFundamentals } from '@/types';
import { TrendingUp, TrendingDown, DollarSign, Calculator, Users, Building2, Calendar } from 'lucide-react';

interface FundamentalsTabProps {
  symbol: string;
}

export default function FundamentalsTab({ symbol }: FundamentalsTabProps) {
  const [dcfAssumptions, setDcfAssumptions] = useState({
    revenueGrowthRate: 0.15,
    terminalGrowthRate: 0.03,
    discountRate: 0.10,
    projectionYears: 5,
    fcfMargin: 0.15,
  });

  const { data: fundamentals, isLoading } = useQuery<CompanyFundamentals>({
    queryKey: ['fundamentals', symbol],
    queryFn: () => fundamentalsApi.get(symbol),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!fundamentals) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">No fundamental data available</p>
      </div>
    );
  }

  const latestIncome = fundamentals.incomeStatements[0];
  const latestBalance = fundamentals.balanceSheets[0];
  const latestCashFlow = fundamentals.cashFlows[0];
  const { ratios, dcf } = fundamentals;

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  return (
    <div className="space-y-6">
      {/* Company Overview */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-4">Company Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">Sector</span>
            </div>
            <div className="font-semibold">{fundamentals.sector}</div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">Industry</span>
            </div>
            <div className="font-semibold">{fundamentals.industry}</div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">Employees</span>
            </div>
            <div className="font-semibold">{fundamentals.employees?.toLocaleString() || 'N/A'}</div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Market Cap</span>
            </div>
            <div className="font-semibold">{formatCurrency(fundamentals.marketCap)}</div>
          </div>
        </div>
      </div>

      {/* DCF Valuation */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Calculator className="w-6 h-6" />
          DCF Valuation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Price</div>
            <div className="text-2xl font-bold">{formatCurrency(dcf.currentPrice)}</div>
          </div>
          <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Intrinsic Value</div>
            <div className="text-2xl font-bold text-primary-600">{formatCurrency(dcf.intrinsicValue)}</div>
          </div>
          <div className={`p-4 rounded-lg ${dcf.upside > 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Upside/Downside</div>
            <div className={`text-2xl font-bold flex items-center gap-2 ${dcf.upside > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {dcf.upside > 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
              {formatPercent(Math.abs(dcf.upside))}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold mb-2">Assumptions</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Revenue Growth:</span>
              <span className="ml-2 font-semibold">{formatPercent(dcf.assumptions.revenueGrowthRate * 100)}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Terminal Growth:</span>
              <span className="ml-2 font-semibold">{formatPercent(dcf.assumptions.terminalGrowthRate * 100)}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Discount Rate:</span>
              <span className="ml-2 font-semibold">{formatPercent(dcf.assumptions.discountRate * 100)}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Projection Years:</span>
              <span className="ml-2 font-semibold">{dcf.assumptions.projectionYears}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">FCF Margin:</span>
              <span className="ml-2 font-semibold">{formatPercent(dcf.assumptions.fcfMargin * 100)}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Cash Flow Projections</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left">Year</th>
                  <th className="px-4 py-2 text-right">Revenue</th>
                  <th className="px-4 py-2 text-right">Free Cash Flow</th>
                  <th className="px-4 py-2 text-right">Discounted FCF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {dcf.projections.map((proj) => (
                  <tr key={proj.year}>
                    <td className="px-4 py-2">Year {proj.year}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(proj.revenue)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(proj.freeCashFlow)}</td>
                    <td className="px-4 py-2 text-right font-semibold">{formatCurrency(proj.discountedFCF)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 dark:bg-gray-800 font-semibold">
                  <td className="px-4 py-2">Terminal Value</td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2 text-right">{formatCurrency(dcf.terminalValue)}</td>
                </tr>
                <tr className="bg-primary-50 dark:bg-primary-900/20 font-bold">
                  <td className="px-4 py-2">Enterprise Value</td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2 text-right text-primary-600">{formatCurrency(dcf.enterpriseValue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Financial Ratios */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-4">Financial Ratios</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Profitability */}
          <div>
            <h3 className="font-semibold mb-3 text-primary-600">Profitability</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Gross Margin:</span>
                <span className="font-semibold">{formatPercent(ratios.grossMargin)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Operating Margin:</span>
                <span className="font-semibold">{formatPercent(ratios.operatingMargin)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Net Margin:</span>
                <span className="font-semibold">{formatPercent(ratios.netMargin)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">ROE:</span>
                <span className="font-semibold">{formatPercent(ratios.roe)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">ROA:</span>
                <span className="font-semibold">{formatPercent(ratios.roa)}</span>
              </div>
            </div>
          </div>

          {/* Liquidity */}
          <div>
            <h3 className="font-semibold mb-3 text-blue-600">Liquidity</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Current Ratio:</span>
                <span className="font-semibold">{ratios.currentRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Quick Ratio:</span>
                <span className="font-semibold">{ratios.quickRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Cash Ratio:</span>
                <span className="font-semibold">{ratios.cashRatio.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Leverage */}
          <div>
            <h3 className="font-semibold mb-3 text-orange-600">Leverage</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Debt/Equity:</span>
                <span className="font-semibold">{ratios.debtToEquity.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Debt/Assets:</span>
                <span className="font-semibold">{ratios.debtToAssets.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Interest Coverage:</span>
                <span className="font-semibold">{ratios.interestCoverage.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Valuation */}
          <div>
            <h3 className="font-semibold mb-3 text-green-600">Valuation</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">P/E Ratio:</span>
                <span className="font-semibold">{ratios.peRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">P/B Ratio:</span>
                <span className="font-semibold">{ratios.pbRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">P/S Ratio:</span>
                <span className="font-semibold">{ratios.psRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">PEG Ratio:</span>
                <span className="font-semibold">{ratios.pegRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">EV/EBITDA:</span>
                <span className="font-semibold">{ratios.evToEbitda.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insider Transactions */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-4">Recent Insider Transactions</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left">Filing Date</th>
                <th className="px-4 py-3 text-left">Insider</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">Shares</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {fundamentals.insiderTransactions.map((transaction, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 text-sm">{transaction.filingDate}</td>
                  <td className="px-4 py-3 text-sm font-semibold">{transaction.insider}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{transaction.title}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      transaction.transactionType === 'Buy'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {transaction.transactionType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">{transaction.shares.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right">${transaction.pricePerShare.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">{formatCurrency(transaction.totalValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Growth Metrics */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-4">Growth Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Revenue Growth (QoQ)</div>
            <div className={`text-2xl font-bold ${fundamentals.revenueGrowthQoQ > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(fundamentals.revenueGrowthQoQ)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Revenue Growth (YoY)</div>
            <div className={`text-2xl font-bold ${fundamentals.revenueGrowthYoY > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(fundamentals.revenueGrowthYoY)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Earnings Growth (QoQ)</div>
            <div className={`text-2xl font-bold ${fundamentals.earningsGrowthQoQ > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(fundamentals.earningsGrowthQoQ)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Earnings Growth (YoY)</div>
            <div className={`text-2xl font-bold ${fundamentals.earningsGrowthYoY > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(fundamentals.earningsGrowthYoY)}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          ℹ️ <strong>Demo Data:</strong> This is demo/simulated fundamental data. In production, this would be powered by real financial APIs like Alpha Vantage, Financial Modeling Prep, or TwelveData Pro/Enterprise tier.
        </p>
      </div>
    </div>
  );
}
