import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { stocksApi, watchlistApi } from '@/services/api';
import { TrendingUp, TrendingDown, Plus, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';
import EnhancedChart from '@/components/charts/EnhancedChart';
import FundamentalsTab from '@/components/fundamentals/FundamentalsTab';
import OptionsTab from '@/components/options/OptionsTab';
import AIAnalysisTab from '@/components/ai/AIAnalysisTab';
import AIRecommendationCard from '@/components/ai/AIRecommendationCard';
import EntryExitTimingCard from '@/components/ai/EntryExitTimingCard';
import RiskAssessmentCard from '@/components/ai/RiskAssessmentCard';
import TradeSignalsCard from '@/components/ai/TradeSignalsCard';
import StrategyRecommenderCard from '@/components/ai/StrategyRecommenderCard';

type TabType = 'technical' | 'fundamentals' | 'options' | 'ai' | 'trading-assistant';

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('technical');

  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ['stock-analysis', symbol],
    queryFn: () => stocksApi.getAnalysis(symbol!),
    enabled: !!symbol,
    retry: 1,
    retryDelay: 1000,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Rate Limit Warning */}
      {error && (
        <div className="card p-4 bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-600">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ API rate limit exceeded. Analysis data unavailable, but the chart will still work with client-side indicators.
          </p>
        </div>
      )}

      {/* Tab Navigation */}
      {analysis && (
        <div className="card p-0">
          <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab('technical')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'technical'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Technical Analysis
            </button>
            <button
              onClick={() => setActiveTab('fundamentals')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'fundamentals'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Fundamentals
            </button>
            <button
              onClick={() => setActiveTab('options')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'options'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Options Analysis
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'ai'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              AI Analysis
            </button>
            <button
              onClick={() => setActiveTab('trading-assistant')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'trading-assistant'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Trading Assistant
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Chart - Always show when symbol exists */}
      {symbol && activeTab === 'technical' && <EnhancedChart symbol={symbol} height={650} />}

      {/* Technical Analysis Tab */}
      {analysis && activeTab === 'technical' && (
        <>
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
                  className={`flex items-center gap-2 mt-2 text-xl ${
                    analysis.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {analysis.change >= 0 ? (
                    <TrendingUp className="w-6 h-6" />
                  ) : (
                    <TrendingDown className="w-6 h-6" />
                  )}
                  <span>
                    {analysis.change.toFixed(2)} ({analysis.changePercent.toFixed(2)}%)
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Volume: {analysis.volume.toLocaleString()}
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

          {/* AI Trading Recommendation */}
          {symbol && <AIRecommendationCard symbol={symbol} />}

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
        </>
      )}

      {/* Fundamentals Tab */}
      {symbol && activeTab === 'fundamentals' && <FundamentalsTab symbol={symbol} />}

      {/* Options Tab */}
      {symbol && activeTab === 'options' && <OptionsTab symbol={symbol} />}

      {/* AI Analysis Tab */}
      {symbol && activeTab === 'ai' && <AIAnalysisTab symbol={symbol} />}

      {/* Trading Assistant Tab */}
      {symbol && activeTab === 'trading-assistant' && (
        <div className="space-y-6">
          <TradeSignalsCard symbol={symbol} accountSize={10000} riskPercentage={1} />
          <StrategyRecommenderCard symbol={symbol} />
          <EntryExitTimingCard symbol={symbol} />
          <RiskAssessmentCard symbol={symbol} />
        </div>
      )}
    </div>
  );
}
