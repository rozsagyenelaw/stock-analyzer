import { TrendingUp, TrendingDown, Zap, AlertCircle } from 'lucide-react';
import type { UnusualActivity } from '@/types';

interface UnusualActivityViewProps {
  activity: UnusualActivity[];
  underlyingPrice: number;
}

export default function UnusualActivityView({ activity, underlyingPrice }: UnusualActivityViewProps) {
  if (activity.length === 0) {
    return (
      <div className="card p-6">
        <div className="text-center py-12">
          <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No Unusual Activity Detected
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            There are currently no high-score unusual options activity signals for this symbol.
          </p>
        </div>
      </div>
    );
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'bearish':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'bearish':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600 font-bold';
    if (score >= 60) return 'text-orange-600 font-semibold';
    return 'text-yellow-600';
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="card p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-500" />
          Unusual Options Activity Detection
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Signals</div>
            <div className="text-3xl font-bold text-yellow-600">{activity.length}</div>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Bullish Signals</div>
            <div className="text-3xl font-bold text-green-600">
              {activity.filter((a) => a.sentiment === 'bullish').length}
            </div>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Bearish Signals</div>
            <div className="text-3xl font-bold text-red-600">
              {activity.filter((a) => a.sentiment === 'bearish').length}
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-sm text-blue-900 dark:text-blue-200">
            <span className="font-semibold">💡 How to interpret:</span> High scores (80+) indicate
            very unusual activity that may signal informed trading. Golden sweeps and high volume/OI
            ratios suggest aggressive positioning. Always verify with other technical/fundamental
            analysis.
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="card p-6">
        <h3 className="text-xl font-bold mb-4">Detailed Activity</h3>
        <div className="space-y-4">
          {activity.map((item, idx) => (
            <div
              key={idx}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getSentimentIcon(item.sentiment)}
                  <div>
                    <div className="font-semibold text-lg">
                      {item.contract.type.toUpperCase()} ${item.contract.strike}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Expires: {new Date(item.contract.expiration).toLocaleDateString()} (
                      {item.contract.daysToExpiration}d)
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Activity Score</div>
                  <div className={`text-3xl font-bold ${getScoreColor(item.score)}`}>
                    {item.score}
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div>
                  <div className="text-xs text-gray-500">Premium Traded</div>
                  <div className="text-sm font-semibold">
                    ${(item.premium / 1000).toFixed(1)}K
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Volume</div>
                  <div className="text-sm font-semibold">{item.volume.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Open Interest</div>
                  <div className="text-sm font-semibold">{item.openInterest.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Vol/OI Ratio</div>
                  <div className="text-sm font-semibold">{item.volumeOIRatio.toFixed(2)}x</div>
                </div>
              </div>

              {/* Flags */}
              <div className="flex flex-wrap gap-2 mb-3">
                {item.flags.map((flag) => (
                  <span
                    key={flag}
                    className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  >
                    {flag.replace(/_/g, ' ').toUpperCase()}
                  </span>
                ))}
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${getSentimentColor(
                    item.sentiment
                  )}`}
                >
                  {item.sentiment.toUpperCase()}
                </span>
              </div>

              {/* Contract Details */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Last Price:</span>{' '}
                    <span className="font-semibold">${item.contract.last.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">IV:</span>{' '}
                    <span className="font-semibold">
                      {(item.contract.impliedVolatility * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Delta:</span>{' '}
                    <span className="font-semibold">{item.contract.greeks.delta.toFixed(3)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      {item.contract.inTheMoney ? 'ITM' : 'OTM'}
                    </span>{' '}
                    <span className="font-semibold">
                      {(
                        ((item.contract.strike - underlyingPrice) / underlyingPrice) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <div className="mt-2 text-xs text-gray-500">
                Detected: {new Date(item.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="card p-6">
        <h3 className="text-lg font-bold mb-3">Activity Flags Explained</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-semibold">High Volume:</span> Significantly elevated trading activity
          </div>
          <div>
            <span className="font-semibold">Unusual Sweep:</span> Volume/OI ratio &gt; 2x (rapid accumulation)
          </div>
          <div>
            <span className="font-semibold">Golden Sweep:</span> Volume/OI ratio &gt; 5x (very aggressive)
          </div>
          <div>
            <span className="font-semibold">Block Trade:</span> Large premium (&gt;$100K) suggests institutional
          </div>
          <div>
            <span className="font-semibold">Above Ask:</span> Buyer paying premium (bullish urgency)
          </div>
          <div>
            <span className="font-semibold">Below Bid:</span> Seller accepting discount (bearish urgency)
          </div>
        </div>
      </div>
    </div>
  );
}
