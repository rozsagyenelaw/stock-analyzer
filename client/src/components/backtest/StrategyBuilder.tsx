import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { backtestApi } from '@/services/api';
import { BacktestStrategy, StrategyCondition } from '@/types';
import { X, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface StrategyBuilderProps {
  strategy: BacktestStrategy | null;
  onClose: () => void;
  onSave: () => void;
}

const OPERATORS = [
  { value: '>', label: 'Greater than' },
  { value: '<', label: 'Less than' },
  { value: '>=', label: 'Greater or equal' },
  { value: '<=', label: 'Less or equal' },
  { value: '==', label: 'Equal to' },
  { value: 'CROSS_ABOVE', label: 'Crosses above' },
  { value: 'CROSS_BELOW', label: 'Crosses below' },
];

export default function StrategyBuilder({ strategy, onClose, onSave }: StrategyBuilderProps) {
  const [name, setName] = useState(strategy?.name || '');
  const [description, setDescription] = useState(strategy?.description || '');
  const [entryRules, setEntryRules] = useState<StrategyCondition[]>(strategy?.entry_rules || []);
  const [exitRules, setExitRules] = useState<StrategyCondition[]>(strategy?.exit_rules || []);
  const [positionSizing, setPositionSizing] = useState(strategy?.position_sizing || 'PERCENT_CAPITAL');
  const [positionSizeValue, setPositionSizeValue] = useState(strategy?.position_size_value || 10);
  const [stopLoss, setStopLoss] = useState(strategy?.stop_loss_percent?.toString() || '');
  const [takeProfit, setTakeProfit] = useState(strategy?.take_profit_percent?.toString() || '');
  const [initialCapital, setInitialCapital] = useState(strategy?.initial_capital || 10000);

  const { data: indicators = [] } = useQuery({
    queryKey: ['backtest-indicators'],
    queryFn: backtestApi.getIndicators,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      strategy
        ? backtestApi.updateStrategy(strategy.id, data)
        : backtestApi.createStrategy(data),
    onSuccess: () => {
      toast.success(strategy ? 'Strategy updated' : 'Strategy created');
      onSave();
    },
    onError: () => {
      toast.error('Failed to save strategy');
    },
  });

  const handleSave = () => {
    if (!name || entryRules.length === 0 || exitRules.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    saveMutation.mutate({
      name,
      description,
      entry_rules: entryRules,
      exit_rules: exitRules,
      position_sizing: positionSizing,
      position_size_value: positionSizeValue,
      stop_loss_percent: stopLoss ? parseFloat(stopLoss) : undefined,
      take_profit_percent: takeProfit ? parseFloat(takeProfit) : undefined,
      max_positions: 1,
      commission_percent: 0,
      slippage_percent: 0.1,
      initial_capital: initialCapital,
    });
  };

  const addEntryRule = () => {
    setEntryRules([
      ...entryRules,
      { indicator: 'RSI', operator: '<', value: 30, params: { period: 14 } },
    ]);
  };

  const addExitRule = () => {
    setExitRules([
      ...exitRules,
      { indicator: 'RSI', operator: '>', value: 70, params: { period: 14 } },
    ]);
  };

  const updateRule = (
    type: 'entry' | 'exit',
    index: number,
    field: keyof StrategyCondition,
    value: any
  ) => {
    const rules = type === 'entry' ? [...entryRules] : [...exitRules];
    rules[index] = { ...rules[index], [field]: value };
    if (type === 'entry') {
      setEntryRules(rules);
    } else {
      setExitRules(rules);
    }
  };

  const removeRule = (type: 'entry' | 'exit', index: number) => {
    if (type === 'entry') {
      setEntryRules(entryRules.filter((_, i) => i !== index));
    } else {
      setExitRules(exitRules.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            {strategy ? 'Edit Strategy' : 'Create Strategy'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Strategy Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                placeholder="My Trading Strategy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                rows={2}
                placeholder="Optional description..."
              />
            </div>
          </div>

          {/* Entry Rules */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Entry Rules *</h3>
              <button
                onClick={addEntryRule}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Rule
              </button>
            </div>
            <div className="space-y-2">
              {entryRules.map((rule, i) => (
                <div key={i} className="flex gap-2 items-center bg-gray-900 p-3 rounded-lg">
                  <select
                    value={rule.indicator}
                    onChange={(e) => updateRule('entry', i, 'indicator', e.target.value)}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  >
                    {indicators.map((ind: any) => (
                      <option key={ind.id} value={ind.outputs[0]}>
                        {ind.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={rule.operator}
                    onChange={(e) => updateRule('entry', i, 'operator', e.target.value)}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  >
                    {OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={rule.value}
                    onChange={(e) => updateRule('entry', i, 'value', parseFloat(e.target.value))}
                    className="w-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  />
                  <button
                    onClick={() => removeRule('entry', i)}
                    className="p-2 text-red-400 hover:bg-gray-800 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Exit Rules */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Exit Rules *</h3>
              <button
                onClick={addExitRule}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Rule
              </button>
            </div>
            <div className="space-y-2">
              {exitRules.map((rule, i) => (
                <div key={i} className="flex gap-2 items-center bg-gray-900 p-3 rounded-lg">
                  <select
                    value={rule.indicator}
                    onChange={(e) => updateRule('exit', i, 'indicator', e.target.value)}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  >
                    {indicators.map((ind: any) => (
                      <option key={ind.id} value={ind.outputs[0]}>
                        {ind.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={rule.operator}
                    onChange={(e) => updateRule('exit', i, 'operator', e.target.value)}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  >
                    {OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={rule.value}
                    onChange={(e) => updateRule('exit', i, 'value', parseFloat(e.target.value))}
                    className="w-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  />
                  <button
                    onClick={() => removeRule('exit', i)}
                    className="p-2 text-red-400 hover:bg-gray-800 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Position & Risk Management */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Position Sizing
              </label>
              <select
                value={positionSizing}
                onChange={(e) => setPositionSizing(e.target.value as any)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              >
                <option value="FIXED">Fixed Dollar Amount</option>
                <option value="PERCENT_CAPITAL">Percent of Capital</option>
                <option value="KELLY">Kelly Criterion</option>
                <option value="VOLATILITY">Volatility-Based</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Size Value
              </label>
              <input
                type="number"
                value={positionSizeValue}
                onChange={(e) => setPositionSizeValue(parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stop Loss %
              </label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Take Profit %
              </label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                placeholder="Optional"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Initial Capital
              </label>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              />
            </div>
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
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Strategy'}
          </button>
        </div>
      </div>
    </div>
  );
}
