/**
 * AI Trade Journal with Pattern Recognition
 *
 * Displays trading performance analysis with AI-identified patterns
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, TrendingUp, TrendingDown, AlertCircle, Lightbulb, Target } from 'lucide-react';
import { aiApi } from '@/services/api';

export default function TradeJournalCard() {
  const [proposedTrade, setProposedTrade] = useState({
    symbol: '',
    direction: 'long' as 'long' | 'short',
    entryPrice: 0,
    strategyTag: '',
  });
  const [showRecommendation, setShowRecommendation] = useState(false);

  // Fetch trade journal analysis
  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ['trade-journal-analysis'],
    queryFn: () => aiApi.getTradeJournalAnalysis(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch trade recommendation
  const { data: recommendation, isLoading: isLoadingRec } = useQuery({
    queryKey: ['trade-recommendation', proposedTrade],
    queryFn: () => aiApi.getTradeRecommendation(proposedTrade),
    enabled: showRecommendation && !!proposedTrade.symbol && proposedTrade.entryPrice > 0,
    staleTime: 1 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold">AI Trade Journal</h2>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold">AI Trade Journal</h2>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">Trade journal requires OpenAI API configuration and trade history.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-bold">AI Trade Journal & Pattern Recognition</h2>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Trades</div>
          <div className="text-3xl font-bold">{analysis.summary.totalTrades}</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Win Rate</div>
          <div className="text-3xl font-bold text-green-600">{analysis.summary.winRate.toFixed(1)}%</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Profit Factor</div>
          <div className="text-3xl font-bold text-purple-600">
            {analysis.summary.profitFactor === Infinity ? '∞' : analysis.summary.profitFactor.toFixed(2)}
          </div>
        </div>
        <div className={`bg-gradient-to-br rounded-lg p-4 ${
          analysis.summary.totalProfitLoss >= 0
            ? 'from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30'
            : 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30'
        }`}>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total P/L</div>
          <div className={`text-3xl font-bold ${analysis.summary.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${analysis.summary.totalProfitLoss.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Win/Loss Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-800 dark:text-green-200">Winning Trades</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Count</div>
              <div className="text-2xl font-bold text-green-600">{analysis.summary.winningTrades}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Average Win</div>
              <div className="text-2xl font-bold text-green-600">${analysis.summary.averageWin.toFixed(0)}</div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Largest Win</div>
              <div className="text-xl font-bold text-green-600">${analysis.summary.largestWin.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800 dark:text-red-200">Losing Trades</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Count</div>
              <div className="text-2xl font-bold text-red-600">{analysis.summary.losingTrades}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Average Loss</div>
              <div className="text-2xl font-bold text-red-600">${analysis.summary.averageLoss.toFixed(0)}</div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Largest Loss</div>
              <div className="text-xl font-bold text-red-600">${Math.abs(analysis.summary.largestLoss).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-blue-800 dark:text-blue-200">Winning Patterns</h3>
          <ul className="space-y-2">
            {analysis.patterns.winningPatterns.map((pattern: string, idx: number) => (
              <li key={idx} className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{pattern}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-orange-800 dark:text-orange-200">Losing Patterns</h3>
          <ul className="space-y-2">
            {analysis.patterns.losingPatterns.map((pattern: string, idx: number) => (
              <li key={idx} className="text-sm text-orange-800 dark:text-orange-200 flex items-start gap-2">
                <TrendingDown className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{pattern}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-green-800 dark:text-green-200">Your Strengths</h3>
          <ul className="space-y-2">
            {analysis.strengths.map((strength: string, idx: number) => (
              <li key={idx} className="text-sm text-green-800 dark:text-green-200">
                ✓ {strength}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-yellow-800 dark:text-yellow-200">Areas to Improve</h3>
          <ul className="space-y-2">
            {analysis.weaknesses.map((weakness: string, idx: number) => (
              <li key={idx} className="text-sm text-yellow-800 dark:text-yellow-200">
                → {weakness}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-purple-800 dark:text-purple-200">
          <Target className="w-5 h-5" />
          Recommendations
        </h3>
        <ul className="space-y-2">
          {analysis.recommendations.map((rec: string, idx: number) => (
            <li key={idx} className="text-sm text-purple-800 dark:text-purple-200">
              {idx + 1}. {rec}
            </li>
          ))}
        </ul>
      </div>

      {/* Insights */}
      {analysis.insights && analysis.insights.length > 0 && (
        <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-cyan-800 dark:text-cyan-200">
            <Lightbulb className="w-5 h-5" />
            Insights
          </h3>
          <ul className="space-y-2">
            {analysis.insights.map((insight: string, idx: number) => (
              <li key={idx} className="text-sm text-cyan-800 dark:text-cyan-200">
                💡 {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Steps */}
      {analysis.nextSteps && analysis.nextSteps.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3 text-indigo-800 dark:text-indigo-200">Next Steps</h3>
          <ul className="space-y-2">
            {analysis.nextSteps.map((step: string, idx: number) => (
              <li key={idx} className="text-sm text-indigo-800 dark:text-indigo-200">
                {idx + 1}. {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Trade Recommendation Section */}
      <div className="border-t pt-6">
        <h3 className="text-xl font-bold mb-4">Get AI Recommendation for a Trade</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Symbol</label>
            <input
              type="text"
              value={proposedTrade.symbol}
              onChange={(e) => setProposedTrade({ ...proposedTrade, symbol: e.target.value.toUpperCase() })}
              className="input"
              placeholder="AAPL"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Direction</label>
            <select
              value={proposedTrade.direction}
              onChange={(e) => setProposedTrade({ ...proposedTrade, direction: e.target.value as 'long' | 'short' })}
              className="input"
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Entry Price</label>
            <input
              type="number"
              value={proposedTrade.entryPrice || ''}
              onChange={(e) => setProposedTrade({ ...proposedTrade, entryPrice: parseFloat(e.target.value) })}
              className="input"
              placeholder="150.00"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Strategy Tag</label>
            <input
              type="text"
              value={proposedTrade.strategyTag}
              onChange={(e) => setProposedTrade({ ...proposedTrade, strategyTag: e.target.value })}
              className="input"
              placeholder="Optional"
            />
          </div>
        </div>
        <button
          onClick={() => setShowRecommendation(true)}
          disabled={!proposedTrade.symbol || proposedTrade.entryPrice <= 0}
          className="btn btn-primary"
        >
          Get AI Recommendation
        </button>

        {/* Display Recommendation */}
        {showRecommendation && isLoadingRec && (
          <div className="mt-4 flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}

        {showRecommendation && recommendation && (
          <div className={`mt-4 border-2 rounded-lg p-6 ${
            recommendation.shouldTake
              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
              : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`text-2xl font-bold ${recommendation.shouldTake ? 'text-green-600' : 'text-red-600'}`}>
                {recommendation.shouldTake ? '✓ Take This Trade' : '✗ Skip This Trade'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Confidence: {recommendation.confidence}%
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Reasoning</h4>
              <p className="text-sm">{recommendation.reasoning}</p>
            </div>

            {recommendation.similarTrades && recommendation.similarTrades.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Similar Past Trades</h4>
                <div className="flex gap-2">
                  {recommendation.similarTrades.map((trade: any, idx: number) => (
                    <div
                      key={idx}
                      className={`px-3 py-1 rounded text-sm ${
                        trade.outcome === 'WIN'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                      }`}
                    >
                      {trade.outcome}: ${trade.profitLoss.toFixed(0)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recommendation.warnings && recommendation.warnings.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Warnings
                </h4>
                <ul className="space-y-1">
                  {recommendation.warnings.map((warning: string, idx: number) => (
                    <li key={idx} className="text-sm">⚠ {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {recommendation.advice && recommendation.advice.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Advice</h4>
                <ul className="space-y-1">
                  {recommendation.advice.map((tip: string, idx: number) => (
                    <li key={idx} className="text-sm">→ {tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
