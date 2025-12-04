import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { backtestApi } from '@/services/api';
import { BacktestStrategy } from '@/types';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface RunBacktestModalProps {
  strategy: BacktestStrategy;
  onClose: () => void;
  onComplete: () => void;
}

export default function RunBacktestModal({ strategy, onClose, onComplete }: RunBacktestModalProps) {
  const [symbol, setSymbol] = useState('AAPL');
  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [useOptimization, setUseOptimization] = useState(false);
  const [trainWindow, setTrainWindow] = useState(6);
  const [testWindow, setTestWindow] = useState(3);

  const runMutation = useMutation({
    mutationFn: (data: any) => backtestApi.runBacktest(data),
    onSuccess: () => {
      toast.success('Backtest started successfully');
      onComplete();
    },
    onError: () => {
      toast.error('Failed to start backtest');
    },
  });

  const handleRun = () => {
    if (!symbol || !startDate || !endDate) {
      toast.error('Please fill in all fields');
      return;
    }

    const data: any = {
      strategy_id: strategy.id,
      symbol: symbol.toUpperCase(),
      start_date: startDate,
      end_date: endDate,
      timeframe: '1day',
    };

    if (useOptimization) {
      data.optimization_type = 'WALKFORWARD';
      data.optimization_params = {
        train_window_months: trainWindow,
        test_window_months: testWindow,
        parameter_ranges: {
          period: { min: 10, max: 20, step: 5 },
        },
        optimization_metric: 'SHARPE',
      };
    }

    runMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Run Backtest</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Strategy</label>
            <input
              type="text"
              value={strategy.name}
              disabled
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Symbol *</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white uppercase"
              placeholder="AAPL"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={useOptimization}
                onChange={(e) => setUseOptimization(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-300">
                Walk-Forward Optimization
              </span>
            </label>

            {useOptimization && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Train Window (months)
                  </label>
                  <input
                    type="number"
                    value={trainWindow}
                    onChange={(e) => setTrainWindow(parseInt(e.target.value))}
                    min="1"
                    max="24"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Test Window (months)
                  </label>
                  <input
                    type="number"
                    value={testWindow}
                    onChange={(e) => setTestWindow(parseInt(e.target.value))}
                    min="1"
                    max="12"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleRun}
            disabled={runMutation.isPending}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {runMutation.isPending ? 'Running...' : 'Run Backtest'}
          </button>
        </div>
      </div>
    </div>
  );
}
