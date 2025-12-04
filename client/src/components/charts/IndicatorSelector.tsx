import { useState, useMemo } from 'react';
import { Search, X, Settings2 } from 'lucide-react';

export interface IndicatorConfig {
  id: string;
  name: string;
  category: 'trend' | 'momentum' | 'volatility' | 'volume' | 'other';
  description: string;
  defaultParams?: Record<string, number>;
  hasPanel?: boolean; // True if indicator should be in separate panel
}

export interface SelectedIndicator {
  id: string;
  params: Record<string, number>;
  panel?: boolean;
}

interface IndicatorSelectorProps {
  selectedIndicators: SelectedIndicator[];
  onToggleIndicator: (indicatorId: string, params?: Record<string, number>) => void;
  onUpdateParams: (indicatorId: string, params: Record<string, number>) => void;
}

const AVAILABLE_INDICATORS: IndicatorConfig[] = [
  // Trend Indicators
  { id: 'sma', name: 'SMA', category: 'trend', description: 'Simple Moving Average', defaultParams: { period: 20 } },
  { id: 'ema', name: 'EMA', category: 'trend', description: 'Exponential Moving Average', defaultParams: { period: 20 } },
  { id: 'wma', name: 'WMA', category: 'trend', description: 'Weighted Moving Average', defaultParams: { period: 20 } },
  { id: 'dema', name: 'DEMA', category: 'trend', description: 'Double Exponential MA', defaultParams: { period: 20 } },
  { id: 'tema', name: 'TEMA', category: 'trend', description: 'Triple Exponential MA', defaultParams: { period: 20 } },
  { id: 'hma', name: 'HMA', category: 'trend', description: 'Hull Moving Average', defaultParams: { period: 20 } },
  { id: 'kama', name: 'KAMA', category: 'trend', description: 'Kaufman Adaptive MA', defaultParams: { period: 10, fast: 2, slow: 30 } },
  { id: 'zlema', name: 'ZLEMA', category: 'trend', description: 'Zero Lag EMA', defaultParams: { period: 20 } },
  { id: 'bollinger', name: 'Bollinger Bands', category: 'trend', description: 'Bollinger Bands', defaultParams: { period: 20, stdDev: 2 } },
  { id: 'keltner', name: 'Keltner Channels', category: 'trend', description: 'Keltner Channels', defaultParams: { period: 20, multiplier: 2 } },
  { id: 'donchian', name: 'Donchian Channels', category: 'trend', description: 'Donchian Channels', defaultParams: { period: 20 } },
  { id: 'envelopes', name: 'MA Envelopes', category: 'trend', description: 'Moving Average Envelopes', defaultParams: { period: 20, percent: 2.5 } },
  { id: 'sar', name: 'Parabolic SAR', category: 'trend', description: 'Parabolic SAR', defaultParams: { acceleration: 0.02, maximum: 0.2 } },
  { id: 'ichimoku', name: 'Ichimoku Cloud', category: 'trend', description: 'Ichimoku Cloud', defaultParams: { tenkan: 9, kijun: 26, senkouB: 52 } },

  // Momentum Indicators (with panels)
  { id: 'rsi', name: 'RSI', category: 'momentum', description: 'Relative Strength Index', defaultParams: { period: 14 }, hasPanel: true },
  { id: 'stochastic', name: 'Stochastic', category: 'momentum', description: 'Stochastic Oscillator', defaultParams: { period: 14, smoothK: 3, smoothD: 3 }, hasPanel: true },
  { id: 'macd', name: 'MACD', category: 'momentum', description: 'Moving Average Convergence Divergence', defaultParams: { fast: 12, slow: 26, signal: 9 }, hasPanel: true },
  { id: 'cci', name: 'CCI', category: 'momentum', description: 'Commodity Channel Index', defaultParams: { period: 20 }, hasPanel: true },
  { id: 'williams', name: 'Williams %R', category: 'momentum', description: 'Williams %R', defaultParams: { period: 14 }, hasPanel: true },
  { id: 'roc', name: 'ROC', category: 'momentum', description: 'Rate of Change', defaultParams: { period: 12 }, hasPanel: true },
  { id: 'momentum', name: 'Momentum', category: 'momentum', description: 'Momentum Indicator', defaultParams: { period: 10 }, hasPanel: true },
  { id: 'ao', name: 'Awesome Oscillator', category: 'momentum', description: 'Awesome Oscillator', hasPanel: true },
  { id: 'uo', name: 'Ultimate Oscillator', category: 'momentum', description: 'Ultimate Oscillator', defaultParams: { period1: 7, period2: 14, period3: 28 }, hasPanel: true },
  { id: 'ppo', name: 'PPO', category: 'momentum', description: 'Percentage Price Oscillator', defaultParams: { fast: 12, slow: 26, signal: 9 }, hasPanel: true },
  { id: 'tsi', name: 'TSI', category: 'momentum', description: 'True Strength Index', defaultParams: { long: 25, short: 13, signal: 7 }, hasPanel: true },
  { id: 'kst', name: 'KST', category: 'momentum', description: 'Know Sure Thing', hasPanel: true },
  { id: 'aroon', name: 'Aroon', category: 'momentum', description: 'Aroon Indicator', defaultParams: { period: 25 }, hasPanel: true },

  // Volatility Indicators
  { id: 'atr', name: 'ATR', category: 'volatility', description: 'Average True Range', defaultParams: { period: 14 }, hasPanel: true },
  { id: 'bbwidth', name: 'BB Width', category: 'volatility', description: 'Bollinger Bands Width', defaultParams: { period: 20, stdDev: 2 }, hasPanel: true },
  { id: 'bbpercent', name: 'BB %B', category: 'volatility', description: 'Bollinger %B', defaultParams: { period: 20, stdDev: 2 }, hasPanel: true },
  { id: 'stddev', name: 'Std Deviation', category: 'volatility', description: 'Standard Deviation', defaultParams: { period: 20 }, hasPanel: true },
  { id: 'hv', name: 'Historical Volatility', category: 'volatility', description: 'Historical Volatility', defaultParams: { period: 20 }, hasPanel: true },
  { id: 'chaikinvol', name: 'Chaikin Volatility', category: 'volatility', description: 'Chaikin Volatility', defaultParams: { period: 10, roc: 10 }, hasPanel: true },
  { id: 'massindex', name: 'Mass Index', category: 'volatility', description: 'Mass Index', defaultParams: { ema: 9, sum: 25 }, hasPanel: true },
  { id: 'adx', name: 'ADX', category: 'volatility', description: 'Average Directional Index', defaultParams: { period: 14 }, hasPanel: true },

  // Volume Indicators
  { id: 'obv', name: 'OBV', category: 'volume', description: 'On Balance Volume', hasPanel: true },
  { id: 'mfi', name: 'MFI', category: 'volume', description: 'Money Flow Index', defaultParams: { period: 14 }, hasPanel: true },
  { id: 'vwap', name: 'VWAP', category: 'volume', description: 'Volume Weighted Average Price' },
  { id: 'ad', name: 'A/D Line', category: 'volume', description: 'Accumulation/Distribution', hasPanel: true },
  { id: 'cmf', name: 'CMF', category: 'volume', description: 'Chaikin Money Flow', defaultParams: { period: 20 }, hasPanel: true },
  { id: 'emv', name: 'EMV', category: 'volume', description: 'Ease of Movement', defaultParams: { period: 14 }, hasPanel: true },
  { id: 'force', name: 'Force Index', category: 'volume', description: 'Force Index', defaultParams: { period: 13 }, hasPanel: true },
  { id: 'nvi', name: 'NVI', category: 'volume', description: 'Negative Volume Index', hasPanel: true },
  { id: 'pvi', name: 'PVI', category: 'volume', description: 'Positive Volume Index', hasPanel: true },
  { id: 'vroc', name: 'VROC', category: 'volume', description: 'Volume Rate of Change', defaultParams: { period: 14 }, hasPanel: true },
  { id: 'vosc', name: 'Volume Oscillator', category: 'volume', description: 'Volume Oscillator', defaultParams: { short: 5, long: 10 }, hasPanel: true },

  // Other Indicators
  { id: 'pivot', name: 'Pivot Points', category: 'other', description: 'Standard Pivot Points' },
  { id: 'fibonacci', name: 'Fibonacci', category: 'other', description: 'Fibonacci Retracement', defaultParams: { lookback: 100 } },
  { id: 'dpo', name: 'DPO', category: 'other', description: 'Detrended Price Oscillator', defaultParams: { period: 20 }, hasPanel: true },
  { id: 'coppock', name: 'Coppock Curve', category: 'other', description: 'Coppock Curve', defaultParams: { roc1: 14, roc2: 11, wma: 10 }, hasPanel: true },
  { id: 'vortex', name: 'Vortex', category: 'other', description: 'Vortex Indicator', defaultParams: { period: 14 }, hasPanel: true },
];

export default function IndicatorSelector({
  selectedIndicators,
  onToggleIndicator,
  onUpdateParams
}: IndicatorSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIndicator, setExpandedIndicator] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All', count: AVAILABLE_INDICATORS.length },
    { id: 'trend', label: 'Trend', count: AVAILABLE_INDICATORS.filter(i => i.category === 'trend').length },
    { id: 'momentum', label: 'Momentum', count: AVAILABLE_INDICATORS.filter(i => i.category === 'momentum').length },
    { id: 'volatility', label: 'Volatility', count: AVAILABLE_INDICATORS.filter(i => i.category === 'volatility').length },
    { id: 'volume', label: 'Volume', count: AVAILABLE_INDICATORS.filter(i => i.category === 'volume').length },
    { id: 'other', label: 'Other', count: AVAILABLE_INDICATORS.filter(i => i.category === 'other').length },
  ];

  const filteredIndicators = useMemo(() => {
    return AVAILABLE_INDICATORS.filter(indicator => {
      const matchesSearch = indicator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           indicator.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || indicator.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const isSelected = (indicatorId: string) => {
    return selectedIndicators.some(si => si.id === indicatorId);
  };

  const getIndicatorParams = (indicatorId: string) => {
    const selected = selectedIndicators.find(si => si.id === indicatorId);
    return selected?.params;
  };

  const handleToggle = (indicator: IndicatorConfig) => {
    if (isSelected(indicator.id)) {
      onToggleIndicator(indicator.id);
    } else {
      onToggleIndicator(indicator.id, indicator.defaultParams);
    }
  };

  const handleParamChange = (indicatorId: string, paramName: string, value: number) => {
    const currentParams = getIndicatorParams(indicatorId) || {};
    onUpdateParams(indicatorId, { ...currentParams, [paramName]: value });
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search indicators..."
          className="input pl-10 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === category.id
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {category.label} ({category.count})
          </button>
        ))}
      </div>

      {/* Indicators List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredIndicators.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No indicators found
          </div>
        ) : (
          filteredIndicators.map(indicator => {
            const selected = isSelected(indicator.id);
            const params = getIndicatorParams(indicator.id);
            const isExpanded = expandedIndicator === indicator.id;

            return (
              <div
                key={indicator.id}
                className={`p-3 rounded-lg border transition-colors ${
                  selected
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleToggle(indicator)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <div>
                        <div className="font-semibold text-sm">{indicator.name}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {indicator.description}
                        </div>
                      </div>
                    </div>
                  </div>

                  {selected && indicator.defaultParams && (
                    <button
                      onClick={() => setExpandedIndicator(isExpanded ? null : indicator.id)}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Parameter Settings */}
                {selected && isExpanded && indicator.defaultParams && params && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    {Object.keys(indicator.defaultParams).map(paramName => (
                      <div key={paramName} className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
                          {paramName}:
                        </label>
                        <input
                          type="number"
                          value={params[paramName] ?? indicator.defaultParams![paramName]}
                          onChange={(e) => handleParamChange(indicator.id, paramName, parseFloat(e.target.value))}
                          className="input text-xs w-20 p-1"
                          step={paramName.includes('acceleration') || paramName.includes('percent') ? 0.01 : 1}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {selectedIndicators.length} indicator{selectedIndicators.length !== 1 ? 's' : ''} selected
        </div>
      </div>
    </div>
  );
}

export { AVAILABLE_INDICATORS };
