/**
 * AI Recommendation Card Component
 *
 * Displays AI-powered buy/sell/hold recommendations with:
 * - Recommendation badge (strong_buy, buy, hold, sell, strong_sell)
 * - Confidence score
 * - Risk level
 * - Detailed reasoning
 * - Key factors
 * - Suggested action
 */

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, AlertCircle, Sparkles, Target, Shield } from 'lucide-react';
import { aiApi, stocksApi } from '@/services/api';

interface AIRecommendationCardProps {
  symbol: string;
}

export default function AIRecommendationCard({ symbol }: AIRecommendationCardProps) {
  // Fetch quote for current price
  const { data: quote } = useQuery({
    queryKey: ['quote', symbol],
    queryFn: () => stocksApi.getQuote(symbol),
    enabled: !!symbol,
  });

  // Fetch technical analysis
  const { data: analysis } = useQuery({
    queryKey: ['analysis', symbol],
    queryFn: () => stocksApi.getAnalysis(symbol),
    enabled: !!symbol,
  });

  // Fetch AI recommendation
  const { data: recommendation, isLoading, error } = useQuery({
    queryKey: ['ai-recommendation', symbol],
    queryFn: async () => {
      if (!quote || !analysis) return null;

      return aiApi.getRecommendation(symbol, {
        price: parseFloat(quote.close),
        technicalAnalysis: analysis,
        fundamentals: quote,
      });
    },
    enabled: !!symbol && !!quote && !!analysis,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  if (isLoading || !quote || !analysis) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold">AI Trading Recommendation</h2>
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
          <Sparkles className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold">AI Trading Recommendation</h2>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">
              AI recommendations require OpenAI API configuration. Local ML analysis is still available in the AI Analysis tab.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const rec = recommendation.recommendation;
  const confidence = recommendation.confidence;
  const riskLevel = recommendation.riskLevel;

  // Recommendation styling
  const recConfig: Record<string, any> = {
    strong_buy: {
      label: 'STRONG BUY',
      icon: TrendingUp,
      bgColor: 'bg-green-600',
      textColor: 'text-white',
      borderColor: 'border-green-600',
      lightBg: 'bg-green-50 dark:bg-green-900/20',
      lightText: 'text-green-800 dark:text-green-200',
    },
    buy: {
      label: 'BUY',
      icon: TrendingUp,
      bgColor: 'bg-green-500',
      textColor: 'text-white',
      borderColor: 'border-green-500',
      lightBg: 'bg-green-50 dark:bg-green-900/20',
      lightText: 'text-green-700 dark:text-green-300',
    },
    hold: {
      label: 'HOLD',
      icon: Minus,
      bgColor: 'bg-gray-500',
      textColor: 'text-white',
      borderColor: 'border-gray-500',
      lightBg: 'bg-gray-50 dark:bg-gray-800',
      lightText: 'text-gray-700 dark:text-gray-300',
    },
    sell: {
      label: 'SELL',
      icon: TrendingDown,
      bgColor: 'bg-red-500',
      textColor: 'text-white',
      borderColor: 'border-red-500',
      lightBg: 'bg-red-50 dark:bg-red-900/20',
      lightText: 'text-red-700 dark:text-red-300',
    },
    strong_sell: {
      label: 'STRONG SELL',
      icon: TrendingDown,
      bgColor: 'bg-red-600',
      textColor: 'text-white',
      borderColor: 'border-red-600',
      lightBg: 'bg-red-50 dark:bg-red-900/20',
      lightText: 'text-red-800 dark:text-red-200',
    },
  };

  const config = recConfig[rec];
  const Icon = config.icon;

  // Risk level styling
  const riskConfig: Record<string, { color: string; label: string }> = {
    low: { color: 'text-green-600 dark:text-green-400', label: 'Low Risk' },
    medium: { color: 'text-yellow-600 dark:text-yellow-400', label: 'Medium Risk' },
    high: { color: 'text-red-600 dark:text-red-400', label: 'High Risk' },
  };

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-bold">AI Trading Recommendation</h2>
      </div>

      {/* Main Recommendation Badge */}
      <div className={`${config.lightBg} border-2 ${config.borderColor} rounded-xl p-6 mb-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`${config.bgColor} ${config.textColor} rounded-lg p-3`}>
              <Icon className="w-8 h-8" />
            </div>
            <div>
              <div className={`text-3xl font-bold ${config.lightText}`}>{config.label}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{symbol}</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Confidence</div>
            <div className="text-3xl font-bold text-primary-600">{confidence}%</div>
          </div>
        </div>

        {/* Confidence Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
          <div
            className={`${config.bgColor} h-3 rounded-full transition-all duration-500`}
            style={{ width: `${confidence}%` }}
          />
        </div>

        {/* Risk Level */}
        <div className="flex items-center gap-2">
          <Shield className={`w-5 h-5 ${riskConfig[riskLevel].color}`} />
          <span className={`font-semibold ${riskConfig[riskLevel].color}`}>
            {riskConfig[riskLevel].label}
          </span>
        </div>
      </div>

      {/* Reasoning */}
      <div className="mb-6">
        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary-600" />
          AI Reasoning
        </h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          {recommendation.reasoning}
        </p>
      </div>

      {/* Key Factors */}
      <div className="mb-6">
        <h3 className="font-semibold text-lg mb-3">Key Factors</h3>
        <div className="space-y-2">
          {recommendation.keyFactors.map((factor: string, index: number) => (
            <div key={index} className="flex items-start gap-2">
              <span className="text-primary-600 mt-1">•</span>
              <span className="text-gray-700 dark:text-gray-300">{factor}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Action */}
      <div className={`${config.lightBg} rounded-lg p-4 border ${config.borderColor}`}>
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Target className={`w-5 h-5 ${config.lightText}`} />
          Suggested Action
        </h3>
        <p className={`${config.lightText} text-sm leading-relaxed`}>
          {recommendation.suggestedAction}
        </p>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
        AI recommendations are for informational purposes only. Always do your own research and consult with a financial advisor before making investment decisions.
      </div>
    </div>
  );
}
