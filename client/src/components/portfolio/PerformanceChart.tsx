import { PortfolioPerformance, PerformanceAttribution } from '@/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PerformanceChartProps {
  performance: PortfolioPerformance;
  performanceAttribution: PerformanceAttribution;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function PerformanceChart({ performance, performanceAttribution }: PerformanceChartProps) {
  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  const chartData = performance.daily.slice(-90).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: d.value,
  }));

  const attributionData = performanceAttribution.attribution.slice(0, 10).map((attr, index) => ({
    ...attr,
    fill: attr.contribution >= 0 ? '#10b981' : '#ef4444',
  }));

  return (
    <div className="space-y-6">
      {/* Cumulative Returns */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {Object.entries(performance.cumulative).map(([period, value]) => (
          <div key={period} className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-xs mb-1">{period}</div>
            <div className={`text-lg font-bold ${value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatPercent(value)}
            </div>
          </div>
        ))}
      </div>

      {/* Performance Chart */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Portfolio Value (Last 90 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              formatter={(value: number) => `$${value.toLocaleString()}`}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Attribution */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Attribution</h3>

        {/* Alpha */}
        <div className="mb-6 p-4 bg-gray-750 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm">Alpha vs Benchmark</div>
              <div className={`text-2xl font-bold ${performanceAttribution.alpha >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercent(performanceAttribution.alpha)}
              </div>
            </div>
            {performanceAttribution.alpha >= 0 ? (
              <TrendingUp className="w-8 h-8 text-green-400" />
            ) : (
              <TrendingDown className="w-8 h-8 text-red-400" />
            )}
          </div>
        </div>

        {/* Attribution Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={attributionData} layout="vertical" margin={{ left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9ca3af" tickFormatter={(value) => `${value.toFixed(1)}%`} />
            <YAxis type="category" dataKey="symbol" stroke="#9ca3af" width={60} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              formatter={(value: number) => `${value.toFixed(2)}%`}
            />
            <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
              {attributionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Top Contributors Table */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-400 mb-3">Top Contributors to Return</h4>
          <div className="space-y-2">
            {performanceAttribution.attribution.slice(0, 5).map((attr) => (
              <div key={attr.symbol} className="flex items-center justify-between p-3 bg-gray-750 rounded">
                <div className="font-medium text-white">{attr.symbol}</div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-400">
                    Weight: {attr.weight.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400">
                    Return: {formatPercent(attr.return)}
                  </div>
                  <div className={`font-medium ${attr.contribution >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercent(attr.contribution)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
