import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { backtestApi } from '@/services/api';
import { BacktestRun } from '@/types';
import { Eye, Trash2, Clock, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BacktestResultsProps {
  runs: BacktestRun[];
  onView: (run: BacktestRun) => void;
  onDelete: (id: string) => void;
}

export default function BacktestResults({ runs, onView, onDelete }: BacktestResultsProps) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const { data: selectedRun } = useQuery({
    queryKey: ['backtest-run', selectedRunId],
    queryFn: () => backtestApi.getRun(selectedRunId!),
    enabled: !!selectedRunId,
  });

  const formatPercent = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (runs.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800 rounded-lg">
        <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Backtest Results Yet</h3>
        <p className="text-gray-400">Run a strategy to see results here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results List */}
      <div className="space-y-4">
        {runs.map((run) => (
          <div
            key={run.id}
            className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-colors ${
              selectedRunId === run.id ? 'ring-2 ring-blue-500' : 'hover:bg-gray-750'
            }`}
            onClick={() => setSelectedRunId(run.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-white">
                    {run.symbol} - {run.strategy?.name || 'Unknown Strategy'}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      run.status === 'COMPLETED'
                        ? 'bg-green-900 text-green-300'
                        : run.status === 'FAILED'
                        ? 'bg-red-900 text-red-300'
                        : run.status === 'RUNNING'
                        ? 'bg-blue-900 text-blue-300'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {run.status}
                  </span>
                  {run.optimization_type && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-purple-900 text-purple-300">
                      {run.optimization_type}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {run.start_date} - {run.end_date}
                  </span>
                  {run.total_trades !== undefined && (
                    <span>{run.total_trades} trades</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRunId(run.id);
                  }}
                  className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this backtest run?')) {
                      onDelete(run.id);
                    }
                  }}
                  className="px-3 py-2 bg-gray-700 text-red-400 rounded-lg hover:bg-gray-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {run.status === 'COMPLETED' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-gray-400 text-xs mb-1">Total Return</div>
                  <div
                    className={`text-lg font-bold ${
                      (run.total_return_percent || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {formatPercent(run.total_return_percent)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs mb-1">Win Rate</div>
                  <div className="text-lg font-bold text-white">
                    {formatPercent(run.win_rate)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs mb-1">Sharpe Ratio</div>
                  <div className="text-lg font-bold text-white">
                    {run.sharpe_ratio?.toFixed(2) || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs mb-1">Max Drawdown</div>
                  <div className="text-lg font-bold text-red-400">
                    {formatPercent(run.max_drawdown_percent)}
                  </div>
                </div>
              </div>
            )}

            {run.status === 'FAILED' && run.error_message && (
              <div className="text-red-400 text-sm mt-2">Error: {run.error_message}</div>
            )}
          </div>
        ))}
      </div>

      {/* Detailed View */}
      {selectedRun && selectedRun.status === 'COMPLETED' && (
        <div className="bg-gray-800 rounded-lg p-6 space-y-6">
          <h3 className="text-xl font-bold text-white">Detailed Results</h3>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">Final Capital</div>
              <div className="text-xl font-bold text-white">
                {formatCurrency(selectedRun.final_capital)}
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">Profit Factor</div>
              <div className="text-xl font-bold text-white">
                {selectedRun.profit_factor?.toFixed(2) || 'N/A'}
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">Avg Win</div>
              <div className="text-xl font-bold text-green-400">
                {formatCurrency(selectedRun.avg_win)}
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">Avg Loss</div>
              <div className="text-xl font-bold text-red-400">
                {formatCurrency(selectedRun.avg_loss)}
              </div>
            </div>
          </div>

          {/* Equity Curve */}
          {selectedRun.equity_curve && selectedRun.equity_curve.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Equity Curve</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={selectedRun.equity_curve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Equity']}
                  />
                  <Line
                    type="monotone"
                    dataKey="equity"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Trade List */}
          {selectedRun.trades && selectedRun.trades.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">
                Trades ({selectedRun.trades.length})
              </h4>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-900 sticky top-0">
                    <tr>
                      <th className="text-left p-3 text-gray-400">Entry</th>
                      <th className="text-left p-3 text-gray-400">Exit</th>
                      <th className="text-right p-3 text-gray-400">Price</th>
                      <th className="text-right p-3 text-gray-400">Shares</th>
                      <th className="text-right p-3 text-gray-400">P/L</th>
                      <th className="text-right p-3 text-gray-400">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRun.trades.map((trade: any, i: number) => (
                      <tr key={i} className="border-t border-gray-700">
                        <td className="p-3 text-white">
                          {new Date(trade.entry_date).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-white">
                          {trade.exit_date
                            ? new Date(trade.exit_date).toLocaleDateString()
                            : 'Open'}
                        </td>
                        <td className="p-3 text-white text-right">
                          ${trade.entry_price.toFixed(2)} → $
                          {trade.exit_price?.toFixed(2) || '-'}
                        </td>
                        <td className="p-3 text-white text-right">{trade.shares}</td>
                        <td
                          className={`p-3 text-right font-medium ${
                            (trade.profit_loss || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {formatCurrency(trade.profit_loss)}
                        </td>
                        <td
                          className={`p-3 text-right font-medium ${
                            (trade.profit_loss_percent || 0) >= 0
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}
                        >
                          {formatPercent(trade.profit_loss_percent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
