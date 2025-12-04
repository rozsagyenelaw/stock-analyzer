import { DiversificationAnalysis } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DiversificationChartProps {
  diversification: DiversificationAnalysis;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function DiversificationChart({ diversification }: DiversificationChartProps) {
  const sectorData = diversification.sectorAllocation.map((sector, index) => ({
    ...sector,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* Sector Bar Chart */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Sector Allocation</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={sectorData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="sector" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" tickFormatter={(value) => `${value}%`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              formatter={(value: number) => `${value.toFixed(2)}%`}
            />
            <Bar dataKey="weight" radius={[8, 8, 0, 0]}>
              {sectorData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Diversification Score */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Diversification Score</h3>
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="text-5xl font-bold text-white mb-2">
              {diversification.diversificationScore}/100
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${
                  diversification.diversificationScore >= 70
                    ? 'bg-green-500'
                    : diversification.diversificationScore >= 40
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${diversification.diversificationScore}%` }}
              />
            </div>
            <div className="mt-2 text-sm text-gray-400">
              {diversification.diversificationScore >= 70
                ? 'Well diversified'
                : diversification.diversificationScore >= 40
                ? 'Moderately diversified'
                : 'Needs diversification'}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
        <div className="space-y-3">
          {diversification.recommendations.map((rec, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-4 bg-gray-750 rounded-lg"
            >
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {index + 1}
              </div>
              <div className="text-sm text-gray-300">{rec}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
