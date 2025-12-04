/**
 * Options Strategy Recommendation Card
 *
 * Displays AI-powered options strategy recommendations based on
 * market conditions, IV, and technical analysis
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Target,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { aiApi, stocksApi } from '@/services/api';

interface OptionsStrategyCardProps {
  symbol: string;
}

export default function OptionsStrategyCard({ symbol }: OptionsStrategyCardProps) {
  const [outlook, setOutlook] = useState<'bullish' | 'bearish' | 'neutral'>('bullish');
  const [timeHorizon, setTimeHorizon] = useState<'1week' | '1month' | '3months' | '6months'>('1month');
  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');

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

  // Fetch options strategy recommendation
  const { data: recommendation, isLoading, error } = useQuery({
    queryKey: ['options-strategy', symbol, outlook, timeHorizon, riskTolerance],
    queryFn: async () => {
      if (!quote || !analysis) return null;

      return aiApi.getOptionsStrategy(symbol, {
        currentPrice: parseFloat(quote.close),
        outlook,
        technicalAnalysis: analysis,
        timeHorizon,
        riskTolerance,
      });
    },
    enabled: !!symbol && !!quote && !!analysis,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  if (isLoading || !quote || !analysis) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold">AI Options Strategy</h2>
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
          <Target className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold">AI Options Strategy</h2>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">
              AI options strategy requires OpenAI API configuration.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const strategy = recommendation.recommendedStrategy;
  const typeColors: Record<string, string> = {
    bullish: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700',
    bearish: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
    neutral: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700',
    volatility: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700',
  };

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Target className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-bold">AI Options Strategy</h2>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Market Outlook</label>
          <select
            value={outlook}
            onChange={(e) => setOutlook(e.target.value as any)}
            className="input"
          >
            <option value="bullish">Bullish</option>
            <option value="neutral">Neutral</option>
            <option value="bearish">Bearish</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Time Horizon</label>
          <select
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(e.target.value as any)}
            className="input"
          >
            <option value="1week">1 Week</option>
            <option value="1month">1 Month</option>
            <option value="3months">3 Months</option>
            <option value="6months">6 Months</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Risk Tolerance</label>
          <select
            value={riskTolerance}
            onChange={(e) => setRiskTolerance(e.target.value as any)}
            className="input"
          >
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>
      </div>

      {/* Recommended Strategy */}
      <div className={`border-2 rounded-xl p-6 mb-6 ${typeColors[strategy.type]}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold mb-2">{strategy.name}</h3>
            <p className="text-sm opacity-90">{strategy.description}</p>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-75 mb-1">Probability</div>
            <div className="text-3xl font-bold">{strategy.probabilityOfProfit}%</div>
          </div>
        </div>

        {/* Strategy Legs */}
        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 mb-4">
          <h4 className="font-semibold mb-3">Strategy Setup:</h4>
          <div className="space-y-2">
            {strategy.legs.map((leg: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 text-sm">
                <span className={`font-bold ${leg.action === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                  {leg.action.toUpperCase()}
                </span>
                <span>{leg.quantity}x</span>
                <span className="font-medium">{leg.type.toUpperCase()}</span>
                {leg.strike && <span>@ ${leg.strike}</span>}
                {leg.expiration && <span className="text-xs opacity-75">{leg.expiration}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Risk/Reward */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-xs opacity-75 mb-1">Max Profit</div>
            <div className="font-bold flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {strategy.maxProfit}
            </div>
          </div>
          <div>
            <div className="text-xs opacity-75 mb-1">Max Loss</div>
            <div className="font-bold flex items-center gap-1">
              <TrendingDown className="w-4 h-4" />
              {strategy.maxLoss}
            </div>
          </div>
          <div>
            <div className="text-xs opacity-75 mb-1">Capital Required</div>
            <div className="font-bold flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {strategy.capitalRequired}
            </div>
          </div>
          <div>
            <div className="text-xs opacity-75 mb-1">Breakeven</div>
            <div className="font-bold text-xs">
              {strategy.breakeven.join(', ')}
            </div>
          </div>
        </div>

        {/* Entry & Exit Conditions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-semibold text-sm mb-2">Entry Conditions:</h5>
            <ul className="space-y-1">
              {strategy.entryConditions.map((condition: string, idx: number) => (
                <li key={idx} className="text-xs flex items-start gap-2">
                  <span className="opacity-75">•</span>
                  <span>{condition}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-sm mb-2">Exit Conditions:</h5>
            <ul className="space-y-1">
              {strategy.exitConditions.map((condition: string, idx: number) => (
                <li key={idx} className="text-xs flex items-start gap-2">
                  <span className="opacity-75">•</span>
                  <span>{condition}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Market Context */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Market Context
        </h4>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Volatility</div>
            <div className="font-semibold capitalize">{recommendation.marketContext.volatilityEnvironment}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Trend</div>
            <div className="font-semibold capitalize">{recommendation.marketContext.trendStrength}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Regime</div>
            <div className="font-semibold capitalize">{recommendation.marketContext.marketRegime}</div>
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {recommendation.marketContext.ivAnalysis}
        </p>
      </div>

      {/* AI Reasoning */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Why This Strategy?</h4>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {recommendation.reasoning}
        </p>
      </div>

      {/* Warnings */}
      {recommendation.warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
          <h4 className="font-semibold mb-2 flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="w-5 h-5" />
            Warnings
          </h4>
          <ul className="space-y-1">
            {recommendation.warnings.map((warning: string, idx: number) => (
              <li key={idx} className="text-sm text-yellow-800 dark:text-yellow-200">
                • {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Educational Notes */}
      {recommendation.educationalNotes.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">
            Educational Tips
          </h4>
          <ul className="space-y-1">
            {recommendation.educationalNotes.map((note: string, idx: number) => (
              <li key={idx} className="text-sm text-blue-800 dark:text-blue-200">
                • {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alternative Strategies */}
      {recommendation.alternativeStrategies.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold mb-3">Alternative Strategies:</h4>
          <div className="space-y-3">
            {recommendation.alternativeStrategies.map((alt: any, idx: number) => (
              <div key={idx} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{alt.name}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {alt.probabilityOfProfit}% probability
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {alt.description}
                </p>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Best for: {alt.bestFor.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
        Options trading involves significant risk. This is educational content only. Always do your own research and consider consulting a financial advisor.
      </div>
    </div>
  );
}
