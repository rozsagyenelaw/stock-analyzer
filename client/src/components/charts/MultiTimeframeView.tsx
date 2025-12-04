import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { stocksApi } from '@/services/api';
import MultiTimeframeChart from './MultiTimeframeChart';

interface MultiTimeframeViewProps {
  symbol: string;
  onClose: () => void;
}

const TIMEFRAMES = [
  { key: '5min', interval: '5min', outputsize: 100, label: '5 Min' },
  { key: '15min', interval: '15min', outputsize: 100, label: '15 Min' },
  { key: '1hour', interval: '1h', outputsize: 100, label: '1 Hour' },
  { key: '4hour', interval: '4h', outputsize: 100, label: '4 Hour' },
  { key: 'daily', interval: '1day', outputsize: 100, label: 'Daily' },
  { key: 'weekly', interval: '1week', outputsize: 100, label: 'Weekly' },
];

export default function MultiTimeframeView({ symbol, onClose }: MultiTimeframeViewProps) {
  // Fetch data for all timeframes
  const timeframeQueries = TIMEFRAMES.map(tf =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ['stock-timeseries', symbol, tf.key],
      queryFn: () => stocksApi.getTimeSeries(symbol, tf.interval, tf.outputsize),
      enabled: !!symbol,
    })
  );

  const isLoading = timeframeQueries.some(q => q.isLoading);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            Multi-Timeframe Analysis - {symbol}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Charts Grid */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <span className="ml-4 text-gray-300">Loading charts...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {timeframeQueries.map((query, index) => {
                const tf = TIMEFRAMES[index];
                if (!query.data?.values) return null;

                return (
                  <MultiTimeframeChart
                    key={tf.key}
                    symbol={symbol}
                    data={query.data.values}
                    timeframe={tf.label}
                    height={250}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Analysis Tips */}
        <div className="p-4 border-t border-gray-700 bg-gray-900">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">
            Multi-Timeframe Analysis Tips:
          </h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Look for trend alignment across timeframes for stronger signals</li>
            <li>• Use higher timeframes for trend direction, lower for entry/exit timing</li>
            <li>• Watch for divergences between timeframes as potential reversal signals</li>
            <li>• Key support/resistance levels on higher timeframes often hold on lower ones</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
