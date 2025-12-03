import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { stocksApi, watchlistApi } from '@/services/api';
import { TrendingUp, TrendingDown, Plus, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import AdvancedChart from '@/components/charts/AdvancedChart';

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();

  const { data: analysis, isLoading } = useQuery({
    queryKey: ['stock-analysis', symbol],
    queryFn: () => stocksApi.getAnalysis(symbol!),
    enabled: !!symbol,
  });

  const { data: timeSeries, isLoading: isLoadingChart } = useQuery({
    queryKey: ['stock-timeseries', symbol],
    queryFn: () => stocksApi.getTimeSeries(symbol!, '1day', 200),
    enabled: !!symbol,
  });

  const { data: watchlist, refetch: refetchWatchlist } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => watchlistApi.getAll(),
  });

  const isInWatchlist = watchlist?.some((item) => item.symbol === symbol);

  const handleAddToWatchlist = async () => {
    if (!analysis) return;

    try {
      if (isInWatchlist) {
        await watchlistApi.remove(symbol!);
        toast.success('Removed from watchlist');
      } else {
        await watchlistApi.add(symbol!, analysis.name);
        toast.success('Added to watchlist');
      }
      refetchWatchlist();
    } catch (error) {
      toast.error('Failed to update watchlist');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">Failed to load stock data</p>
      </div>
    );
  }

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'STRONG_BUY':
        return 'bg-green-600 text-white';
      case 'BUY':
        return 'bg-green-500 text-white';
      case 'HOLD':
        return 'bg-yellow-500 text-white';
      case 'SELL':
        return 'bg-red-500 text-white';
      case 'STRONG_SELL':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{analysis.symbol}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{analysis.name}</p>
          </div>

          <button onClick={handleAddToWatchlist} className="btn btn-secondary flex items-center gap-2">
            {isInWatchlist ? (
              <>
                <Check className="w-5 h-5" />
                In Watchlist
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Add to Watchlist
              </>
            )}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-4xl font-bold">${analysis.price.toFixed(2)}</div>
            <div
              className={`flex items-center gap-2 mt-2 ${
                analysis.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {analysis.change >= 0 ? <TrendingUp /> : <TrendingDown />}
              <span className="text-xl font-semibold">
                {analysis.change.toFixed(2)} ({analysis.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Signal</div>
            <div
              className={`inline-block px-4 py-2 rounded-lg text-lg font-bold ${getSignalColor(
                analysis.composite.signal
              )}`}
            >
              {analysis.composite.signal.replace('_', ' ')}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Confidence: {analysis.composite.confidence}%
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Score Breakdown</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Composite:</span>
                <span className="font-semibold">{analysis.composite.score.toFixed(1)}/10</span>
              </div>
              <div className="flex justify-between">
                <span>Technical:</span>
                <span className="font-semibold">{analysis.technicalScore.toFixed(1)}/10</span>
              </div>
              <div className="flex justify-between">
                <span>Fundamental:</span>
                <span className="font-semibold">{analysis.fundamentalScore.toFixed(1)}/10</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Chart */}
      {!isLoadingChart && timeSeries && timeSeries.values && timeSeries.values.length > 0 && (
        <AdvancedChart symbol={symbol!} data={timeSeries.values} height={600} />
      )}

      {isLoadingChart && (
        <div className="card p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <span className="ml-4 text-gray-600 dark:text-gray-400">Loading chart...</span>
          </div>
        </div>
      )}

      {/* Technical Indicators */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-4">Technical Indicators</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(analysis.indicators).map(([key, indicator]: [string, any]) => (
            <div key={key} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold uppercase text-sm">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    indicator.signal > 0
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : indicator.signal < 0
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                  }`}
                >
                  {indicator.signal > 0 ? 'BULLISH' : indicator.signal < 0 ? 'BEARISH' : 'NEUTRAL'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{indicator.interpretation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Price Targets */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-4">Price Targets</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Entry</div>
            <div className="text-2xl font-bold text-blue-600">
              ${analysis.priceTargets.entry.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Stop Loss</div>
            <div className="text-2xl font-bold text-red-600">
              ${analysis.priceTargets.stopLoss.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Take Profit 1 (2:1)</div>
            <div className="text-2xl font-bold text-green-600">
              ${analysis.priceTargets.takeProfit1.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Take Profit 2 (3:1)</div>
            <div className="text-2xl font-bold text-green-600">
              ${analysis.priceTargets.takeProfit2.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <div className="card p-6 border-l-4 border-yellow-500">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-yellow-500">⚠️</span>
            Warnings
          </h2>
          <ul className="space-y-2">
            {analysis.warnings.map((warning, index) => (
              <li key={index} className="text-gray-700 dark:text-gray-300">
                • {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
