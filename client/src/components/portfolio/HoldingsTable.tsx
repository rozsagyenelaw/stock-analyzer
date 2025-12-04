import { PortfolioHolding } from '@/types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface HoldingsTableProps {
  holdings: PortfolioHolding[];
}

export default function HoldingsTable({ holdings }: HoldingsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const sortedHoldings = [...holdings].sort((a, b) => b.marketValue - a.marketValue);

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Symbol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Shares
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Avg Cost
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Current Price
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Market Value
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Total P/L
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Day Change
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Weight
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedHoldings.map((holding) => (
              <tr key={holding.id} className="hover:bg-gray-750 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-white">{holding.symbol}</div>
                    <div className="text-xs text-gray-400">{holding.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {holding.shares.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white">
                  {formatCurrency(holding.avgCost)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white">
                  {formatCurrency(holding.currentPrice)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-white">
                  {formatCurrency(holding.marketValue)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className={holding.unrealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}>
                    <div className="text-sm font-medium">{formatCurrency(holding.unrealizedPL)}</div>
                    <div className="text-xs">{formatPercent(holding.unrealizedPLPercent)}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className={`flex items-center justify-end gap-1 ${holding.dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {holding.dayChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <div>
                      <div className="text-sm">{formatCurrency(holding.dayChange)}</div>
                      <div className="text-xs">{formatPercent(holding.dayChangePercent)}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white">
                  {holding.weight.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {holdings.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No holdings yet. Add a transaction to get started.
        </div>
      )}
    </div>
  );
}
