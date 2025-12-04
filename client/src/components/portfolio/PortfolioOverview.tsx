import { Portfolio } from '@/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PortfolioOverviewProps {
  portfolio: Portfolio;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function PortfolioOverview({ portfolio }: PortfolioOverviewProps) {
  const sectorData = portfolio.diversification.sectorAllocation.map((sector, index) => ({
    name: sector.sector,
    value: sector.value,
    weight: sector.weight,
    fill: COLORS[index % COLORS.length],
  }));

  const assetData = portfolio.diversification.assetAllocation.map((asset, index) => ({
    name: asset.type,
    value: asset.value,
    weight: asset.weight,
    fill: COLORS[index % COLORS.length],
  }));

  const topHoldings = [...portfolio.holdings]
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, 5);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Allocation */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Sector Allocation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sectorData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, weight }) => `${name} ${weight.toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {sectorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Asset Allocation */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Asset Allocation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={assetData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, weight }) => `${name} ${weight.toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {assetData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Holdings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Top 5 Holdings</h3>
        <div className="space-y-3">
          {topHoldings.map((holding) => (
            <div key={holding.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-12 bg-blue-500 rounded" style={{ opacity: holding.weight / 100 }} />
                <div>
                  <div className="font-medium text-white">{holding.symbol}</div>
                  <div className="text-sm text-gray-400">{holding.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-white">{formatCurrency(holding.marketValue)}</div>
                <div className={`text-sm ${holding.unrealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {holding.unrealizedPL >= 0 ? '+' : ''}{holding.unrealizedPLPercent.toFixed(2)}%
                </div>
              </div>
              <div className="text-sm text-gray-400 w-16 text-right">
                {holding.weight.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Diversification Score */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Diversification Analysis</h3>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Diversification Score</span>
            <span className="text-2xl font-bold text-white">
              {portfolio.diversification.diversificationScore}/100
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${portfolio.diversification.diversificationScore}%` }}
            />
          </div>
        </div>
        <div className="space-y-2">
          {portfolio.diversification.recommendations.map((rec, index) => (
            <div key={index} className="text-sm text-gray-300 flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
