import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertCircle,
  DollarSign,
  BarChart3,
  Zap,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type MarketOutlook = 'bullish' | 'bearish' | 'neutral' | 'volatile';

interface StrategyRecommendation {
  strategy: string;
  suitability: number;
  marketOutlook: MarketOutlook;
  reasoning: string[];
  pros: string[];
  cons: string[];
  idealConditions: string[];
  riskLevel: 'low' | 'medium' | 'high';
  capitalRequired: number;
  maxProfit: number;
  maxLoss: number;
  breakeven: number[];
  bestFor: string[];
}

interface StrategyResponse {
  symbol: string;
  currentPrice: number;
  marketOutlook: MarketOutlook;
  indicators: any;
  recommendations: StrategyRecommendation[];
  bestRecommendation: StrategyRecommendation;
}

interface StrategyRecommenderCardProps {
  symbol: string;
}

export default function StrategyRecommenderCard({ symbol }: StrategyRecommenderCardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['strategy-recommendations', symbol],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/trading/strategies/${symbol}`);
      return response.data as StrategyResponse;
    },
    enabled: !!symbol,
  });

  const getOutlookColor = (outlook: MarketOutlook) => {
    switch (outlook) {
      case 'bullish':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'bearish':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'volatile':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (value: number) => {
    if (value === Infinity || value === -Infinity) return 'Unlimited';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 text-red-600 mb-4">
          <AlertCircle className="w-5 h-5" />
          <h2 className="text-xl font-bold">Failed to Load Strategy Recommendations</h2>
        </div>
        <p className="text-gray-600">
          Unable to generate strategy recommendations. Please try again later.
        </p>
      </div>
    );
  }

  const { bestRecommendation, recommendations, marketOutlook, currentPrice } = data;

  return (
    <div className="space-y-6">
      {/* Market Outlook Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold">Market Outlook & Strategy Recommendations</h2>
          </div>
          <div className={`px-4 py-2 rounded-lg border font-semibold ${getOutlookColor(marketOutlook)}`}>
            {marketOutlook.toUpperCase()}
          </div>
        </div>

        <div className="text-gray-700 mb-4">
          Current Price: <span className="font-bold text-2xl">${currentPrice.toFixed(2)}</span>
        </div>

        {/* Best Recommendation */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-blue-600" />
                <h3 className="text-xl font-bold text-blue-900">Best Strategy</h3>
              </div>
              <div className="text-2xl font-bold text-blue-900 mb-2">
                {bestRecommendation.strategy}
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded text-sm font-medium ${getRiskColor(bestRecommendation.riskLevel)}`}>
                  {bestRecommendation.riskLevel.toUpperCase()} RISK
                </span>
                <span className="text-blue-700 font-semibold">
                  {bestRecommendation.suitability}% Suitable
                </span>
              </div>
            </div>
          </div>

          {/* Profit/Loss Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <DollarSign className="w-4 h-4" />
                Capital Required
              </div>
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(bestRecommendation.capitalRequired)}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-green-600 mb-1">
                <TrendingUp className="w-4 h-4" />
                Max Profit
              </div>
              <div className="text-lg font-bold text-green-700">
                {formatCurrency(bestRecommendation.maxProfit)}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-red-600 mb-1">
                <TrendingDown className="w-4 h-4" />
                Max Loss
              </div>
              <div className="text-lg font-bold text-red-700">
                {formatCurrency(Math.abs(bestRecommendation.maxLoss))}
              </div>
            </div>
          </div>

          {/* Breakeven */}
          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Target className="w-4 h-4" />
              Breakeven Price{bestRecommendation.breakeven.length > 1 ? 's' : ''}
            </div>
            <div className="flex gap-3">
              {bestRecommendation.breakeven.map((price, idx) => (
                <div key={idx} className="text-lg font-bold text-gray-900">
                  ${price.toFixed(2)}
                </div>
              ))}
            </div>
          </div>

          {/* Reasoning */}
          <div className="mb-4">
            <h4 className="font-semibold text-blue-900 mb-2">Why This Strategy?</h4>
            <ul className="space-y-1">
              {bestRecommendation.reasoning.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-blue-800">
                  <span className="text-blue-600 mt-1">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          {/* Pros & Cons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Pros
              </h4>
              <ul className="space-y-1">
                {bestRecommendation.pros.map((pro, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-green-800">
                    <span className="text-green-600 mt-1">+</span>
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Cons
              </h4>
              <ul className="space-y-1">
                {bestRecommendation.cons.map((con, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-red-800">
                    <span className="text-red-600 mt-1">-</span>
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Alternative Strategies */}
        {recommendations.length > 1 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Alternative Strategies</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.slice(1, 5).map((rec, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-gray-900">{rec.strategy}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(rec.riskLevel)}`}>
                          {rec.riskLevel.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-600">{rec.suitability}% Match</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                    <div>
                      <span className="text-gray-600">Max Profit:</span>
                      <div className="font-semibold text-green-700">{formatCurrency(rec.maxProfit)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Max Loss:</span>
                      <div className="font-semibold text-red-700">{formatCurrency(Math.abs(rec.maxLoss))}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    {rec.reasoning[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
