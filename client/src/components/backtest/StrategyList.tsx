import { BacktestStrategy } from '@/types';
import { Play, Edit2, Trash2, TrendingUp, DollarSign } from 'lucide-react';

interface StrategyListProps {
  strategies: BacktestStrategy[];
  onEdit: (strategy: BacktestStrategy) => void;
  onRun: (strategy: BacktestStrategy) => void;
  onDelete: (id: string) => void;
}

export default function StrategyList({ strategies, onEdit, onRun, onDelete }: StrategyListProps) {
  if (strategies.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800 rounded-lg">
        <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Strategies Yet</h3>
        <p className="text-gray-400 mb-4">
          Create your first trading strategy to start backtesting
        </p>
      </div>
    );
  }

  const formatPercent = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {strategies.map((strategy) => (
        <div
          key={strategy.id}
          className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">{strategy.name}</h3>
              {strategy.description && (
                <p className="text-sm text-gray-400">{strategy.description}</p>
              )}
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Entry Rules</span>
              <span className="text-white font-medium">{strategy.entry_rules.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Exit Rules</span>
              <span className="text-white font-medium">{strategy.exit_rules.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Position Sizing</span>
              <span className="text-white font-medium">
                {strategy.position_sizing === 'FIXED' && '$'}
                {strategy.position_size_value}
                {strategy.position_sizing === 'PERCENT_CAPITAL' && '%'}
              </span>
            </div>
            {strategy.stop_loss_percent && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Stop Loss</span>
                <span className="text-red-400 font-medium">
                  {formatPercent(strategy.stop_loss_percent)}
                </span>
              </div>
            )}
            {strategy.take_profit_percent && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Take Profit</span>
                <span className="text-green-400 font-medium">
                  {formatPercent(strategy.take_profit_percent)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Initial Capital</span>
              <span className="text-white font-medium flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {strategy.initial_capital.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onRun(strategy)}
              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Run
            </button>
            <button
              onClick={() => onEdit(strategy)}
              className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete strategy "${strategy.name}"?`)) {
                  onDelete(strategy.id);
                }
              }}
              className="px-3 py-2 bg-gray-700 text-red-400 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
