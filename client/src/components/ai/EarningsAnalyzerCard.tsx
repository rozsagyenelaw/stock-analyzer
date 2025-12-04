/**
 * AI Earnings Event Analyzer
 *
 * Analyzes upcoming earnings events for options trading opportunities
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, TrendingUp, AlertCircle, Target, DollarSign, Activity } from 'lucide-react';
import { aiApi } from '@/services/api';

interface EarningsAnalyzerCardProps {
  symbol: string;
}

export default function EarningsAnalyzerCard({ symbol }: EarningsAnalyzerCardProps) {
  const [earningsDate, setEarningsDate] = useState('');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [currentIV, setCurrentIV] = useState(50);
  const [daysUntilEarnings, setDaysUntilEarnings] = useState(7);
  const [historicalMoves, setHistoricalMoves] = useState('5.2, -3.8, 7.1, -2.5');

  // Fetch earnings analysis
  const { data: analysis, isLoading, error, refetch } = useQuery({
    queryKey: ['earnings-analysis', symbol, earningsDate, currentPrice, currentIV, daysUntilEarnings, historicalMoves],
    queryFn: async () => {
      if (!currentPrice || !earningsDate) return null;

      const moves = historicalMoves
        .split(',')
        .map(m => parseFloat(m.trim()))
        .filter(m => !isNaN(m));

      return aiApi.getEarningsAnalysis(symbol, {
        currentPrice,
        earningsDate,
        daysUntilEarnings,
        currentIV,
        historicalMoves: moves,
      });
    },
    enabled: false,
    staleTime: 10 * 60 * 1000,
  });

  const handleAnalyze = () => {
    if (currentPrice > 0 && earningsDate) {
      refetch();
    }
  };

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-bold">AI Earnings Event Analyzer</h2>
      </div>

      {/* Input Form */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-4">Earnings Event Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Current Price ($)</label>
            <input
              type="number"
              value={currentPrice || ''}
              onChange={(e) => setCurrentPrice(parseFloat(e.target.value))}
              className="input"
              placeholder="150.00"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Earnings Date</label>
            <input
              type="date"
              value={earningsDate}
              onChange={(e) => setEarningsDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Days Until Earnings</label>
            <input
              type="number"
              value={daysUntilEarnings}
              onChange={(e) => setDaysUntilEarnings(parseInt(e.target.value))}
              className="input"
              min="0"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Current IV (%)</label>
            <input
              type="number"
              value={currentIV}
              onChange={(e) => setCurrentIV(parseFloat(e.target.value))}
              className="input"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Historical Moves (comma-separated %)</label>
            <input
              type="text"
              value={historicalMoves}
              onChange={(e) => setHistoricalMoves(e.target.value)}
              className="input"
              placeholder="5.2, -3.8, 7.1"
            />
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={!currentPrice || !earningsDate}
          className="btn btn-primary"
        >
          Analyze Earnings Event
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">Earnings analysis requires OpenAI API configuration.</p>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !isLoading && (
        <>
          {/* Expected Move */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="w-6 h-6" />
              Expected Move
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Percentage</div>
                <div className="text-2xl font-bold">±{analysis.expectedMove.percentage.toFixed(1)}%</div>
              </div>
              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Dollar Amount</div>
                <div className="text-2xl font-bold">±${analysis.expectedMove.dollarAmount.toFixed(2)}</div>
              </div>
              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Upper Target</div>
                <div className="text-2xl font-bold text-green-600">${analysis.expectedMove.upperTarget.toFixed(2)}</div>
              </div>
              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Lower Target</div>
                <div className="text-2xl font-bold text-red-600">${analysis.expectedMove.lowerTarget.toFixed(2)}</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
              <strong>Confidence:</strong> {analysis.expectedMove.confidence}%
            </div>
          </div>

          {/* IV Crush Warning */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertCircle className="w-6 h-6" />
              IV Crush Risk
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pre-Earnings IV</div>
                <div className="text-2xl font-bold">{analysis.ivCrush.preEarningsIV.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Post-Earnings IV</div>
                <div className="text-2xl font-bold">{analysis.ivCrush.expectedPostEarningsIV.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">IV Drop</div>
                <div className="text-2xl font-bold text-red-600">-{analysis.ivCrush.ivDropPercentage.toFixed(0)}%</div>
              </div>
            </div>
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <strong>Impact:</strong> {analysis.ivCrush.impactOnOptions}
            </p>
          </div>

          {/* Sentiment */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4">Market Sentiment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`rounded-lg p-4 ${
                analysis.sentiment.overall === 'bullish'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700'
                  : analysis.sentiment.overall === 'bearish'
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700'
                  : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700'
              }`}>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Overall</div>
                <div className="text-2xl font-bold capitalize">{analysis.sentiment.overall}</div>
              </div>
              <div className={`rounded-lg p-4 ${
                analysis.sentiment.optionsFlowSignal === 'bullish'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700'
                  : analysis.sentiment.optionsFlowSignal === 'bearish'
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700'
                  : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700'
              }`}>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Options Flow</div>
                <div className="text-2xl font-bold capitalize">{analysis.sentiment.optionsFlowSignal}</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Put/Call Ratio</div>
                <div className="text-2xl font-bold">{analysis.sentiment.putCallRatio.toFixed(2)}</div>
              </div>
            </div>
            {analysis.sentiment.interpretation && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">{analysis.sentiment.interpretation}</p>
              </div>
            )}
          </div>

          {/* Recommended Strategies */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Target className="w-6 h-6" />
              Recommended Strategies
            </h3>
            <div className="space-y-4">
              {analysis.strategies.recommended.map((strategy: any, idx: number) => {
                const riskColors: Record<string, string> = {
                  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
                  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
                  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
                };
                const rewardColors: Record<string, string> = {
                  low: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200',
                  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
                  high: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
                };

                return (
                  <div key={idx} className="border dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg">{strategy.name}</h4>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${riskColors[strategy.risk]}`}>
                          {strategy.risk.toUpperCase()} RISK
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${rewardColors[strategy.reward]}`}>
                          {strategy.reward.toUpperCase()} REWARD
                        </span>
                      </div>
                    </div>
                    <p className="text-sm mb-3 text-gray-700 dark:text-gray-300">{strategy.description}</p>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                      <div className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Setup:</div>
                      <div className="text-sm">{strategy.setup}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risks & Opportunities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-red-800 dark:text-red-200">
                <AlertCircle className="w-5 h-5" />
                Key Risks
              </h4>
              <ul className="space-y-2">
                {analysis.risks.map((risk: string, idx: number) => (
                  <li key={idx} className="text-sm text-red-800 dark:text-red-200">
                    • {risk}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-800 dark:text-green-200">
                <TrendingUp className="w-5 h-5" />
                Opportunities
              </h4>
              <ul className="space-y-2">
                {analysis.opportunities.map((opp: string, idx: number) => (
                  <li key={idx} className="text-sm text-green-800 dark:text-green-200">
                    • {opp}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Timing */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <DollarSign className="w-5 h-5" />
              Timing Guidance
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-semibold mb-1 text-blue-800 dark:text-blue-200">Best Entry</div>
                <div className="text-blue-700 dark:text-blue-300">{analysis.timing.bestEntry}</div>
              </div>
              <div>
                <div className="font-semibold mb-1 text-blue-800 dark:text-blue-200">Best Exit</div>
                <div className="text-blue-700 dark:text-blue-300">{analysis.timing.bestExit}</div>
              </div>
              {analysis.timing.avoidPeriod && (
                <div>
                  <div className="font-semibold mb-1 text-blue-800 dark:text-blue-200">Avoid Period</div>
                  <div className="text-blue-700 dark:text-blue-300">{analysis.timing.avoidPeriod}</div>
                </div>
              )}
            </div>
          </div>

          {/* Historical Context */}
          {analysis.historicalContext && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-6">
              <h4 className="font-semibold mb-3 text-purple-800 dark:text-purple-200">Historical Context</h4>
              <p className="text-sm text-purple-800 dark:text-purple-200">{analysis.historicalContext}</p>
            </div>
          )}

          {/* Final Recommendation */}
          {analysis.recommendation && (
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-2 border-cyan-300 dark:border-cyan-700 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3 text-cyan-800 dark:text-cyan-200">Strategic Recommendation</h3>
              <p className="text-cyan-800 dark:text-cyan-200">{analysis.recommendation}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
