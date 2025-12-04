import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { backtestApi } from '@/services/api';
import { BacktestStrategy } from '@/types';
import { Plus, BarChart3, Settings } from 'lucide-react';
import StrategyList from '@/components/backtest/StrategyList';
import StrategyBuilder from '@/components/backtest/StrategyBuilder';
import BacktestResults from '@/components/backtest/BacktestResults';
import RunBacktestModal from '@/components/backtest/RunBacktestModal';

export default function Backtest() {
  const [selectedTab, setSelectedTab] = useState<'strategies' | 'results'>('strategies');
  const [showStrategyBuilder, setShowStrategyBuilder] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<BacktestStrategy | null>(null);

  const { data: strategies = [], refetch: refetchStrategies } = useQuery({
    queryKey: ['backtest-strategies'],
    queryFn: backtestApi.getStrategies,
  });

  const { data: runs = [], refetch: refetchRuns } = useQuery({
    queryKey: ['backtest-runs'],
    queryFn: backtestApi.getRuns,
  });

  const handleEditStrategy = (strategy: BacktestStrategy) => {
    setSelectedStrategy(strategy);
    setShowStrategyBuilder(true);
  };

  const handleRunStrategy = (strategy: BacktestStrategy) => {
    setSelectedStrategy(strategy);
    setShowRunModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Backtesting Engine</h1>
          <p className="text-gray-400">
            Build, test, and optimize trading strategies with historical data
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setSelectedStrategy(null);
              setShowStrategyBuilder(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Strategy
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700 mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => setSelectedTab('strategies')}
            className={`py-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
              selectedTab === 'strategies'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5" />
            Strategies
          </button>
          <button
            onClick={() => setSelectedTab('results')}
            className={`py-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
              selectedTab === 'results'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Results ({runs.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {selectedTab === 'strategies' && (
        <StrategyList
          strategies={strategies}
          onEdit={handleEditStrategy}
          onRun={handleRunStrategy}
          onDelete={async (id) => {
            await backtestApi.deleteStrategy(id);
            refetchStrategies();
          }}
        />
      )}

      {selectedTab === 'results' && (
        <BacktestResults
          runs={runs}
          onView={() => {}}
          onDelete={async (id) => {
            await backtestApi.deleteRun(id);
            refetchRuns();
          }}
        />
      )}

      {/* Modals */}
      {showStrategyBuilder && (
        <StrategyBuilder
          strategy={selectedStrategy}
          onClose={() => {
            setShowStrategyBuilder(false);
            setSelectedStrategy(null);
          }}
          onSave={() => {
            refetchStrategies();
            setShowStrategyBuilder(false);
            setSelectedStrategy(null);
          }}
        />
      )}

      {showRunModal && selectedStrategy && (
        <RunBacktestModal
          strategy={selectedStrategy}
          onClose={() => {
            setShowRunModal(false);
            setSelectedStrategy(null);
          }}
          onComplete={() => {
            refetchRuns();
            setShowRunModal(false);
            setSelectedStrategy(null);
            setSelectedTab('results');
          }}
        />
      )}
    </div>
  );
}
