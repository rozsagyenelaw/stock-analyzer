import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { optionsApi } from '@/services/api';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Activity,
  BarChart3,
  Zap,
  Target,
} from 'lucide-react';
import type { OptionsChain, OptionContract, UnusualActivity } from '@/types';
import OptionsChainView from './OptionsChainView';
import UnusualActivityView from './UnusualActivityView';

interface OptionsTabProps {
  symbol: string;
}

export default function OptionsTab({ symbol }: OptionsTabProps) {
  const [selectedExpiration, setSelectedExpiration] = useState<string>('');
  const [viewMode, setViewMode] = useState<'overview' | 'chain' | 'unusual' | 'strategies'>(
    'overview'
  );

  // Fetch options analysis
  const { data: analysis, isLoading } = useQuery({
    queryKey: ['options-analysis', symbol],
    queryFn: () => optionsApi.getAnalysis(symbol),
    enabled: !!symbol,
    staleTime: 60000, // 1 minute
  });

  // Set default expiration when data loads
  if (analysis && !selectedExpiration && analysis.chains.length > 0) {
    setSelectedExpiration(analysis.chains[2].expiration); // Default to 30-day
  }

  const selectedChain = analysis?.chains.find((c) => c.expiration === selectedExpiration);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="card p-6">
        <p className="text-center text-gray-500">No options data available for {symbol}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Mode Tabs */}
      <div className="card p-0">
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'chain', label: 'Options Chain', icon: BarChart3 },
            { id: 'unusual', label: 'Unusual Activity', icon: Zap },
            { id: 'strategies', label: 'Strategy Builder', icon: Target },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap transition-colors ${
                viewMode === tab.id
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {viewMode === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Implied Volatility</div>
              <div className="text-2xl font-bold mt-1">
                {(analysis.volatility.currentIV * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                IV Rank: {analysis.volatility.ivRank}%
              </div>
            </div>

            <div className="card p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Put/Call Ratio</div>
              <div className="text-2xl font-bold mt-1">{analysis.flow.putCallRatio}</div>
              <div
                className={`text-xs mt-1 ${
                  analysis.flow.putCallRatio > 1
                    ? 'text-red-600'
                    : analysis.flow.putCallRatio < 0.7
                    ? 'text-green-600'
                    : 'text-gray-500'
                }`}
              >
                {analysis.flow.putCallRatio > 1
                  ? 'Bearish'
                  : analysis.flow.putCallRatio < 0.7
                  ? 'Bullish'
                  : 'Neutral'}
              </div>
            </div>

            <div className="card p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Options Sentiment</div>
              <div
                className={`text-2xl font-bold mt-1 ${
                  analysis.flow.sentiment === 'bullish'
                    ? 'text-green-600'
                    : analysis.flow.sentiment === 'bearish'
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              >
                {analysis.flow.sentiment.toUpperCase()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Score: {analysis.flow.sentimentScore > 0 ? '+' : ''}
                {analysis.flow.sentimentScore}
              </div>
            </div>

            <div className="card p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Unusual Activity</div>
              <div className="text-2xl font-bold mt-1">{analysis.flow.unusualActivity.length}</div>
              <div className="text-xs text-gray-500 mt-1">High-score signals detected</div>
            </div>
          </div>

          {/* Volatility Analysis */}
          <div className="card p-6">
            <h3 className="text-xl font-bold mb-4">Volatility Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Current IV:
                    </span>
                    <span className="font-semibold">
                      {(analysis.volatility.currentIV * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Historical Volatility:
                    </span>
                    <span className="font-semibold">
                      {(analysis.volatility.historicalVolatility * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">IV Rank:</span>
                    <span className="font-semibold">{analysis.volatility.ivRank}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      IV Percentile:
                    </span>
                    <span className="font-semibold">{analysis.volatility.ivPercentile}%</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                    Trading Recommendation
                  </div>
                  <div className="text-xs text-blue-800 dark:text-blue-300">
                    {analysis.volatility.ivRank > 70
                      ? '📉 High IV Rank suggests selling premium strategies (credit spreads, iron condors)'
                      : analysis.volatility.ivRank < 30
                      ? '📈 Low IV Rank suggests buying premium strategies (debit spreads, straddles)'
                      : '⚖️ Moderate IV - Consider directional strategies based on market outlook'}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3">IV Skew</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm">ATM IV:</span>
                    <span className="font-semibold">
                      {(analysis.volatility.skew.atmIV * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm">OTM Call IV:</span>
                    <span className="font-semibold">
                      {(analysis.volatility.skew.otmCallIV * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm">OTM Put IV:</span>
                    <span className="font-semibold">
                      {(analysis.volatility.skew.otmPutIV * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm">Skew Ratio:</span>
                    <span className="font-semibold">{analysis.volatility.skew.skewRatio}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Options Flow */}
          <div className="card p-6">
            <h3 className="text-xl font-bold mb-4">Options Flow</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold mb-3">Volume</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Call Volume:</span>
                    <span className="font-semibold text-green-600">
                      {analysis.flow.totalCallVolume.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Put Volume:</span>
                    <span className="font-semibold text-red-600">
                      {analysis.flow.totalPutVolume.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-px bg-gray-300 dark:bg-gray-600 my-2"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Total Volume:
                    </span>
                    <span className="font-semibold">
                      {(analysis.flow.totalCallVolume + analysis.flow.totalPutVolume).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3">Open Interest</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Call OI:</span>
                    <span className="font-semibold text-green-600">
                      {analysis.flow.totalCallOI.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Put OI:</span>
                    <span className="font-semibold text-red-600">
                      {analysis.flow.totalPutOI.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-px bg-gray-300 dark:bg-gray-600 my-2"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total OI:</span>
                    <span className="font-semibold">
                      {(analysis.flow.totalCallOI + analysis.flow.totalPutOI).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-sm font-semibold text-green-900 dark:text-green-200">
                  Call Premium
                </div>
                <div className="text-2xl font-bold text-green-600 mt-1">
                  ${(analysis.flow.netCallPremium / 1000000).toFixed(2)}M
                </div>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-sm font-semibold text-red-900 dark:text-red-200">
                  Put Premium
                </div>
                <div className="text-2xl font-bold text-red-600 mt-1">
                  ${(analysis.flow.netPutPremium / 1000000).toFixed(2)}M
                </div>
              </div>
            </div>
          </div>

          {/* Suggested Strategies */}
          {analysis.suggestedStrategies.length > 0 && (
            <div className="card p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Suggested Strategies
              </h3>
              <div className="space-y-4">
                {analysis.suggestedStrategies.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-primary-500"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold">{suggestion.strategy.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {suggestion.reasoning}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Suitability</div>
                        <div className="text-lg font-bold text-primary-600">
                          {suggestion.suitability}%
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      <div>
                        <div className="text-xs text-gray-500">Net Cost</div>
                        <div
                          className={`text-sm font-semibold ${
                            suggestion.strategy.netDebit < 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          ${Math.abs(suggestion.strategy.netDebit).toFixed(2)}
                          {suggestion.strategy.netDebit < 0 ? ' Credit' : ' Debit'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Max Profit</div>
                        <div className="text-sm font-semibold text-green-600">
                          {suggestion.strategy.maxProfit !== null
                            ? `$${suggestion.strategy.maxProfit.toFixed(2)}`
                            : 'Unlimited'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Max Loss</div>
                        <div className="text-sm font-semibold text-red-600">
                          {suggestion.strategy.maxLoss !== null
                            ? `$${Math.abs(suggestion.strategy.maxLoss).toFixed(2)}`
                            : 'Unlimited'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Profit Prob.</div>
                        <div className="text-sm font-semibold">
                          {suggestion.strategy.probabilityOfProfit}%
                        </div>
                      </div>
                    </div>

                    {/* Strategy Legs */}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                        Strategy Legs:
                      </div>
                      <div className="space-y-1">
                        {suggestion.strategy.legs.map((leg) => (
                          <div
                            key={leg.id}
                            className="text-xs flex items-center gap-2"
                          >
                            <span
                              className={`px-2 py-0.5 rounded ${
                                leg.side === 'buy'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}
                            >
                              {leg.side.toUpperCase()}
                            </span>
                            <span>
                              {leg.quantity} {leg.contract.type.toUpperCase()} ${leg.contract.strike} exp{' '}
                              {new Date(leg.contract.expiration).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Options Chain Tab - to be implemented */}
      {viewMode === 'chain' && selectedChain && (
        <OptionsChainView chain={selectedChain} onExpirationChange={setSelectedExpiration} chains={analysis.chains} />
      )}

      {/* Unusual Activity Tab */}
      {viewMode === 'unusual' && (
        <UnusualActivityView activity={analysis.flow.unusualActivity} underlyingPrice={analysis.underlyingPrice} />
      )}

      {/* Strategy Builder Tab - placeholder */}
      {viewMode === 'strategies' && (
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4">Strategy Builder</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Build custom multi-leg options strategies and analyze risk/reward profiles.
          </p>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-sm text-blue-900 dark:text-blue-200">
              💡 Use the suggested strategies above to get started, or build your own custom strategy
              by selecting individual options from the chain view.
            </div>
          </div>
        </div>
      )}

      {/* Demo Data Disclaimer */}
      <div className="card p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-900 dark:text-yellow-200">
            <div className="font-semibold mb-1">Demo Data & Educational Purpose</div>
            <div>
              Options data is generated using Black-Scholes model for demonstration. Greeks, IV, and
              strategies are calculated accurately but should be verified with real market data before
              trading. Always paper trade first and never risk more than you can afford to lose.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
