import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, AlertCircle, DollarSign, Clock, Award, Sparkles } from 'lucide-react';

interface UnifiedRecommendation {
  id: string;
  rank: number;
  symbol: string;
  companyName: string;
  category: 'stock_trade' | 'options_trade';
  strategyType: string;
  strategyName: string;
  currentPrice: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  potentialGain: number;
  potentialLoss: number;
  riskReward: number;
  probabilityOfProfit?: number;
  timeframe: string;
  capitalRequired: number;
  positionSize?: string;
  aiScore: number;
  aiReasoning: string;
  keyFactors: string[];
  risks: string[];
  technicalScore: number;
  rsi?: number;
  volume?: number;
  relativeVolume?: number;
  strike?: number;
  expiration?: string;
  dte?: number;
  optionType?: 'call' | 'put';
  premium?: number;
  delta?: number;
  timestamp: string;
}

interface DailyRecommendations {
  date: string;
  topPicks: UnifiedRecommendation[];
  allRecommendations: UnifiedRecommendation[];
  summary: {
    totalScanned: number;
    totalOpportunities: number;
    avgScore: number;
    categories: {
      stockTrades: number;
      optionsTrades: number;
    };
  };
  aiInsights: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DailyPicks: React.FC = () => {
  const [recommendations, setRecommendations] = useState<DailyRecommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'stock_trade' | 'options_trade'>('all');
  const [accountSize, setAccountSize] = useState(10000);
  const [riskLevel, setRiskLevel] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [priceRange, setPriceRange] = useState<'all' | 'under25' | '25to100' | '100to250'>('all');
  const [setupType, setSetupType] = useState<'all' | 'oversold' | 'breakout' | 'macd' | 'pullback'>('all');
  const [minScore, setMinScore] = useState(60);

  useEffect(() => {
    fetchRecommendations();
  }, [accountSize, riskLevel]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        accountSize: accountSize.toString(),
        riskLevel,
        minScore: '60',
      });

      const url = `${API_BASE_URL}/api/daily-picks?${params}`;
      console.log('[DailyPicks] Fetching from:', url);

      const response = await fetch(url);
      console.log('[DailyPicks] Response status:', response.status);
      console.log('[DailyPicks] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DailyPicks] Error response:', errorText);
        throw new Error(`Failed to fetch recommendations: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('[DailyPicks] Success! Got data:', data);
      setRecommendations(data);
    } catch (err: any) {
      console.error('[DailyPicks] Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPicks = recommendations?.topPicks.filter(pick => {
    // Category filter
    if (categoryFilter !== 'all' && pick.category !== categoryFilter) return false;

    // Price range filter
    if (priceRange !== 'all') {
      const price = pick.currentPrice;
      if (priceRange === 'under25' && price >= 25) return false;
      if (priceRange === '25to100' && (price < 25 || price >= 100)) return false;
      if (priceRange === '100to250' && (price < 100 || price > 250)) return false;
    }

    // Setup type filter
    if (setupType !== 'all') {
      const strategyLower = pick.strategyType.toLowerCase();
      if (setupType === 'oversold' && !strategyLower.includes('oversold') && !strategyLower.includes('bounce')) return false;
      if (setupType === 'breakout' && !strategyLower.includes('breakout')) return false;
      if (setupType === 'macd' && !strategyLower.includes('macd')) return false;
      if (setupType === 'pullback' && !strategyLower.includes('pullback')) return false;
    }

    // Min score filter
    if (pick.aiScore < minScore) return false;

    return true;
  }) || [];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 65) return 'text-blue-600 bg-blue-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const getCategoryBadge = (category: string) => {
    return category === 'stock_trade'
      ? 'bg-purple-100 text-purple-800'
      : 'bg-indigo-100 text-indigo-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-gray-600">Scanning markets and generating AI recommendations...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <h3 className="text-red-800 font-semibold">Error Loading Recommendations</h3>
                <p className="text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Sparkles className="h-8 w-8 text-yellow-500 mr-3" />
                Today's Top Trades
              </h1>
              <p className="text-gray-600 mt-2 flex items-center gap-4">
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Last scanned: {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' })} ET
                </span>
                <span>•</span>
                <span>Universe: {recommendations?.summary.totalScanned || 0} stocks scanned</span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Generated</div>
              <div className="text-lg font-semibold text-gray-900">{recommendations?.date}</div>
            </div>
          </div>
        </div>

        {/* AI Market Insights */}
        {recommendations?.aiInsights && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-start">
              <Sparkles className="h-6 w-6 text-blue-600 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Market Insights</h3>
                <p className="text-gray-700 leading-relaxed">{recommendations.aiInsights}</p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {recommendations?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Markets Scanned</div>
              <div className="text-2xl font-bold text-gray-900">{recommendations.summary.totalScanned}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Opportunities Found</div>
              <div className="text-2xl font-bold text-blue-600">{recommendations.summary.totalOpportunities}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Average Quality Score</div>
              <div className="text-2xl font-bold text-green-600">{recommendations.summary.avgScore.toFixed(0)}/100</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Stock / Options</div>
              <div className="text-2xl font-bold text-purple-600">
                {recommendations.summary.categories.stockTrades} / {recommendations.summary.categories.optionsTrades}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Trades</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Range
              </label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Prices</option>
                <option value="under25">Under $25</option>
                <option value="25to100">$25 - $100</option>
                <option value="100to250">$100 - $250</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Setup Type
              </label>
              <select
                value={setupType}
                onChange={(e) => setSetupType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Setups</option>
                <option value="oversold">Oversold</option>
                <option value="breakout">Breakout</option>
                <option value="macd">MACD</option>
                <option value="pullback">Pullback</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Score
              </label>
              <select
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value={60}>60+</option>
                <option value={70}>70+</option>
                <option value={80}>80+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Size
              </label>
              <select
                value={accountSize}
                onChange={(e) => setAccountSize(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value={500}>$500</option>
                <option value={1000}>$1,000</option>
                <option value={2500}>$2,500</option>
                <option value={5000}>$5,000</option>
                <option value={10000}>$10,000</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Risk Level
              </label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="conservative">Conservative</option>
                <option value="moderate">Moderate</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All</option>
                <option value="stock_trade">Stocks</option>
                <option value="options_trade">Options</option>
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredPicks.length} of {recommendations?.topPicks.length || 0} trades
          </div>
        </div>

        {/* Top Picks */}
        <div className="space-y-4">
          {filteredPicks.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Opportunities Found</h3>
              <p className="text-gray-600">
                No high-quality trade opportunities match your current filters.
              </p>
            </div>
          ) : (
            filteredPicks.map((pick) => (
              <div key={pick.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(pick.aiScore)}`}>
                        #{pick.rank}
                      </div>
                      <div>
                        <div className="flex items-center space-x-3">
                          <h3 className="text-xl font-bold text-gray-900">{pick.symbol}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getCategoryBadge(pick.category)}`}>
                            {pick.category === 'stock_trade' ? 'Stock Trade' : 'Options Trade'}
                          </span>
                          <span className="text-sm text-gray-500">{pick.strategyName}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{pick.companyName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <Award className="h-5 w-5 text-yellow-500" />
                        <span className="text-2xl font-bold text-gray-900">{pick.aiScore}</span>
                        <span className="text-sm text-gray-500">/100</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">AI Quality Score</div>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Entry Price</div>
                      <div className="text-lg font-semibold text-gray-900">${pick.entryPrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Target</div>
                      <div className="text-lg font-semibold text-green-600">${pick.targetPrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Stop Loss</div>
                      <div className="text-lg font-semibold text-red-600">${pick.stopLoss.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Risk/Reward</div>
                      <div className="text-lg font-semibold text-blue-600">{pick.riskReward.toFixed(2)}:1</div>
                    </div>
                  </div>

                  {/* Profit/Loss Potential */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-green-600 font-medium">Potential Gain</div>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-xl font-bold text-green-700 mt-1">+{pick.potentialGain.toFixed(1)}%</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-red-600 font-medium">Potential Loss</div>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="text-xl font-bold text-red-700 mt-1">-{pick.potentialLoss.toFixed(1)}%</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-blue-600 font-medium">Capital Required</div>
                        <DollarSign className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-xl font-bold text-blue-700 mt-1">${pick.capitalRequired.toFixed(0)}</div>
                    </div>
                  </div>

                  {/* Options Details */}
                  {pick.category === 'options_trade' && pick.strike && (
                    <div className="bg-indigo-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <div className="text-xs text-indigo-600 font-medium">Strike</div>
                          <div className="text-sm font-semibold text-gray-900">${pick.strike}</div>
                        </div>
                        <div>
                          <div className="text-xs text-indigo-600 font-medium">Expiration</div>
                          <div className="text-sm font-semibold text-gray-900">{pick.expiration}</div>
                        </div>
                        <div>
                          <div className="text-xs text-indigo-600 font-medium">Premium</div>
                          <div className="text-sm font-semibold text-gray-900">${pick.premium?.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-indigo-600 font-medium">Position</div>
                          <div className="text-sm font-semibold text-gray-900">{pick.positionSize}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Reasoning */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <Sparkles className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-gray-900 mb-1">AI Analysis</div>
                        <p className="text-sm text-gray-700">{pick.aiReasoning}</p>
                      </div>
                    </div>
                  </div>

                  {/* Key Factors & Risks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center mb-2">
                        <Target className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-sm font-semibold text-gray-900">Key Factors</span>
                      </div>
                      <ul className="space-y-1">
                        {pick.keyFactors.map((factor, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start">
                            <span className="text-green-600 mr-2">•</span>
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {pick.risks.length > 0 && (
                      <div>
                        <div className="flex items-center mb-2">
                          <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                          <span className="text-sm font-semibold text-gray-900">Risks</span>
                        </div>
                        <ul className="space-y-1">
                          {pick.risks.map((risk, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start">
                              <span className="text-red-600 mr-2">•</span>
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {pick.timeframe}
                      </div>
                      {pick.rsi && (
                        <div>RSI: {pick.rsi.toFixed(1)}</div>
                      )}
                      {pick.relativeVolume && (
                        <div>Vol: {pick.relativeVolume.toFixed(1)}x</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      Updated: {new Date(pick.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyPicks;
