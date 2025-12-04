/**
 * Entry/Exit Timing Assistant Card
 *
 * Displays AI-powered entry and exit timing recommendations
 * with multi-timeframe analysis
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, TrendingUp, TrendingDown, AlertCircle, Calendar } from 'lucide-react';
import { aiApi, stocksApi } from '@/services/api';

interface EntryExitTimingCardProps {
  symbol: string;
}

export default function EntryExitTimingCard({ symbol }: EntryExitTimingCardProps) {
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M'>('1W');
  const [position, setPosition] = useState<'none' | 'long' | 'short'>('none');

  // Fetch quote and analysis
  const { data: quote } = useQuery({
    queryKey: ['quote', symbol],
    queryFn: () => stocksApi.getQuote(symbol),
    enabled: !!symbol,
  });

  const { data: analysis } = useQuery({
    queryKey: ['analysis', symbol],
    queryFn: () => stocksApi.getAnalysis(symbol),
    enabled: !!symbol,
  });

  // Fetch timing recommendation
  const { data: recommendation, isLoading, error } = useQuery({
    queryKey: ['entry-exit-timing', symbol, timeframe, position],
    queryFn: async () => {
      if (!quote || !analysis) return null;

      return aiApi.getEntryExitTiming(symbol, {
        currentPrice: parseFloat(quote.close),
        technicalAnalysis: analysis,
        position,
        timeframe,
      });
    },
    enabled: !!symbol && !!quote && !!analysis,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading || !quote || !analysis) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold">AI Entry/Exit Timing</h2>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error || !recommendation) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold">AI Entry/Exit Timing</h2>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">AI timing assistant requires OpenAI API configuration.</p>
          </div>
        </div>
      </div>
    );
  }

  const signalColors: Record<string, string> = {
    strong_buy: 'bg-green-600 text-white',
    buy: 'bg-green-500 text-white',
    wait: 'bg-yellow-500 text-white',
    hold: 'bg-gray-500 text-white',
    sell: 'bg-red-500 text-white',
    strong_sell: 'bg-red-600 text-white',
  };

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Clock className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-bold">AI Entry/Exit Timing</h2>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Primary Timeframe</label>
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value as any)} className="input">
            <option value="1D">1 Day (Short-term)</option>
            <option value="1W">1 Week (Medium-term)</option>
            <option value="1M">1 Month (Long-term)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Current Position</label>
          <select value={position} onChange={(e) => setPosition(e.target.value as any)} className="input">
            <option value="none">No Position</option>
            <option value="long">Long Position</option>
            <option value="short">Short Position</option>
          </select>
        </div>
      </div>

      {/* Entry Timing */}
      {position === 'none' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Entry Recommendation
          </h3>

          <div className="flex items-center justify-between mb-4">
            <div>
              <span className={`inline-block px-4 py-2 rounded-lg font-bold ${signalColors[recommendation.entry.signal.action]}`}>
                {recommendation.entry.signal.action.toUpperCase().replace('_', ' ')}
              </span>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Confidence: {recommendation.entry.signal.confidence}% | Urgency: {recommendation.entry.signal.urgency}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400">Optimal Entry</div>
              <div className="text-2xl font-bold text-primary-600">${recommendation.entry.optimalEntryZone.ideal.toFixed(2)}</div>
              <div className="text-xs text-gray-500">
                (${recommendation.entry.optimalEntryZone.lower.toFixed(2)} - ${recommendation.entry.optimalEntryZone.upper.toFixed(2)})
              </div>
            </div>
          </div>

          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">{recommendation.entry.signal.reasoning}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm font-medium mb-2">Stop Loss</div>
              <div className="text-xl font-bold text-red-600">${recommendation.entry.stopLoss.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Target Prices</div>
              <div className="text-sm font-semibold text-green-600">
                {recommendation.entry.targetPrices.map((t: number) => `$${t.toFixed(2)}`).join(' → ')}
              </div>
            </div>
          </div>

          {recommendation.entry.conditions.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Wait for These Conditions:</h4>
              <ul className="space-y-1">
                {recommendation.entry.conditions.map((condition: string, idx: number) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span>•</span>
                    <span>{condition}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Exit Timing */}
      {position !== 'none' && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingDown className="w-6 h-6" />
            Exit Recommendation
          </h3>

          <div className="flex items-center justify-between mb-4">
            <div>
              <span className={`inline-block px-4 py-2 rounded-lg font-bold ${signalColors[recommendation.exit.signal.action]}`}>
                {recommendation.exit.exitRecommendation.toUpperCase()}
              </span>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Confidence: {recommendation.exit.signal.confidence}%
              </div>
            </div>
          </div>

          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">{recommendation.exit.signal.reasoning}</p>
          </div>

          {recommendation.exit.targetsPriority && recommendation.exit.targetsPriority.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-sm mb-2">Target Priority:</h4>
              <div className="space-y-2">
                {recommendation.exit.targetsPriority.map((target: any, idx: number) => (
                  <div key={idx} className="bg-white/50 dark:bg-black/20 rounded p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">${target.target.toFixed(2)}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{target.probability}% prob</span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{target.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recommendation.exit.profitProtection.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Profit Protection Strategies:</h4>
              <ul className="space-y-1">
                {recommendation.exit.profitProtection.map((strategy: string, idx: number) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span>•</span>
                    <span>{strategy}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Multi-Timeframe Analysis */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Multi-Timeframe Alignment
        </h4>
        <div className="flex items-center gap-4 mb-3">
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
            recommendation.multiTimeframeAlignment.aligned
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
          }`}>
            {recommendation.multiTimeframeAlignment.aligned ? 'ALIGNED' : 'MIXED SIGNALS'}
          </div>
          <div className="text-sm">
            Alignment Score: <span className="font-bold">{recommendation.multiTimeframeAlignment.score}/100</span>
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {recommendation.multiTimeframeAlignment.analysis}
        </p>
      </div>

      {/* Overall Advice */}
      <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4 mb-4">
        <h4 className="font-semibold mb-2">Overall Advice</h4>
        <p className="text-sm text-gray-700 dark:text-gray-300">{recommendation.overallAdvice}</p>
      </div>

      {/* Next Check-In */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        Next assessment: {recommendation.nextCheckIn}
      </div>
    </div>
  );
}
