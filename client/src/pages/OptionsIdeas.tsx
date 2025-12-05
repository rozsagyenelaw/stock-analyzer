import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  DollarSign,
  TrendingUp,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Target,
  Calendar,
  Zap,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Strategy {
  id: string;
  name: string;
  description: string;
  category: 'sell_premium' | 'buy_options';
  difficulty: string;
  capitalRequired: string;
}

interface OptionSuggestion {
  id: string;
  symbol: string;
  stockPrice: number;
  strategyName: string;
  strategyType: 'sell_premium' | 'buy_options';
  strike: number;
  expiration: string;
  dte: number;
  optionType: 'call' | 'put';
  premium: number;
  bid: number;
  ask: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  impliedVolatility: number;
  probabilityOfProfit: number;
  maxProfit: number;
  maxLoss: number;
  breakeven: number;
  annualizedReturn: number;
  contracts: number;
  buyingPowerRequired: number;
  aiInsight?: string;
  risks?: string;
  exitStrategy?: string;
  score: number;
}

export default function OptionsIdeas() {
  const [selectedCategory, setSelectedCategory] = useState<'sell_premium' | 'buy_options'>('sell_premium');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('cash-secured-puts');
  const [accountSize, setAccountSize] = useState<string>('10000');
  const [riskLevel, setRiskLevel] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(false);

  // Fetch available strategies
  const { data: strategies = [] } = useQuery({
    queryKey: ['options-strategies'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/options-ideas/strategies`);
      return response.data as Strategy[];
    },
  });

  // Fetch suggestions for selected strategy
  const {
    data: suggestions,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['options-suggestions', selectedStrategy, accountSize, riskLevel, useAI],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/options-ideas/scan/${selectedStrategy}`,
        {
          params: {
            accountSize: parseFloat(accountSize) || undefined,
            riskLevel,
            useAI: useAI.toString(),
          },
        }
      );
      return response.data;
    },
    enabled: false, // Don't auto-fetch, wait for user to click "Scan"
  });

  const filteredStrategies = strategies.filter((s: Strategy) => s.category === selectedCategory);

  const handleScan = () => {
    if (!accountSize || parseFloat(accountSize) <= 0) {
      toast.error('Please enter a valid account size');
      return;
    }
    refetch();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 bg-green-900/30';
    if (score >= 60) return 'text-yellow-400 bg-yellow-900/30';
    return 'text-orange-400 bg-orange-900/30';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-8 h-8 text-blue-400" />
          <h1 className="text-3xl font-bold text-white">Options Ideas</h1>
        </div>
        <p className="text-gray-400">AI-powered options strategy suggestions with real-time analysis</p>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Category Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Strategy Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedCategory('sell_premium');
                  setSelectedStrategy('cash-secured-puts');
                }}
                className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
                  selectedCategory === 'sell_premium'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <DollarSign className="w-4 h-4 inline mr-1" />
                Sell Premium
              </button>
              <button
                onClick={() => {
                  setSelectedCategory('buy_options');
                  setSelectedStrategy('long-calls-breakout');
                }}
                className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
                  selectedCategory === 'buy_options'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-1" />
                Buy Options
              </button>
            </div>
          </div>

          {/* Strategy Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Strategy</label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              {filteredStrategies.map((strategy: Strategy) => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account Size */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Account Size</label>
            <input
              type="number"
              value={accountSize}
              onChange={(e) => setAccountSize(e.target.value)}
              placeholder="10000"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Risk Level */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Risk Level</label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="conservative">Conservative (1%)</option>
              <option value="moderate">Moderate (2%)</option>
              <option value="aggressive">Aggressive (5%)</option>
            </select>
          </div>
        </div>

        {/* Scan Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleScan}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Scanning...' : 'Scan for Ideas'}
          </button>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-300 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              AI Analysis (top 5)
            </span>
          </label>

          {suggestions && (
            <div className="ml-auto text-sm text-gray-400">
              Found {suggestions.count} opportunities from {suggestions.stocksScanned} stocks
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-gray-400">Scanning options chains...</span>
        </div>
      )}

      {!isLoading && suggestions && suggestions.suggestions.length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">No opportunities found</p>
          <p className="text-sm text-gray-500">Try adjusting your filters or selecting a different strategy</p>
        </div>
      )}

      {!isLoading && suggestions && suggestions.suggestions.length > 0 && (
        <div className="space-y-4">
          {suggestions.suggestions.map((suggestion: OptionSuggestion) => (
            <div
              key={suggestion.id}
              className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition"
            >
              {/* Card Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl font-bold text-white">{suggestion.symbol}</span>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(suggestion.score)}`}>
                          Score: {suggestion.score}
                        </span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300">
                          ${suggestion.stockPrice.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{suggestion.strategyName}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedCard(expandedCard === suggestion.id ? null : suggestion.id)}
                    className="px-3 py-2 text-sm text-gray-400 hover:text-white transition"
                  >
                    {expandedCard === suggestion.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Strike / Type</div>
                    <div className="text-sm font-medium text-white">
                      ${suggestion.strike} {suggestion.optionType.toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Expiration / DTE
                    </div>
                    <div className="text-sm font-medium text-white">
                      {new Date(suggestion.expiration).toLocaleDateString()} ({suggestion.dte}d)
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Premium</div>
                    <div className="text-sm font-medium text-green-400">
                      ${suggestion.premium.toFixed(2)} ({formatCurrency(suggestion.premium * 100)})
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Probability</div>
                    <div className="text-sm font-medium text-white">{suggestion.probabilityOfProfit.toFixed(1)}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Max Profit</div>
                    <div className="text-sm font-medium text-green-400">
                      {suggestion.maxProfit === Infinity ? 'Unlimited' : formatCurrency(suggestion.maxProfit)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Max Loss</div>
                    <div className="text-sm font-medium text-red-400">{formatCurrency(suggestion.maxLoss)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Breakeven</div>
                    <div className="text-sm font-medium text-white">${suggestion.breakeven.toFixed(2)}</div>
                  </div>
                  {suggestion.annualizedReturn > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Annualized Return</div>
                      <div className="text-sm font-medium text-blue-400">{suggestion.annualizedReturn.toFixed(1)}%</div>
                    </div>
                  )}
                </div>

                {/* AI Insights Preview */}
                {suggestion.aiInsight && !expandedCard && (
                  <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-300 line-clamp-2">{suggestion.aiInsight}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Expanded Details */}
              {expandedCard === suggestion.id && (
                <div className="border-t border-gray-700 p-6 bg-gray-900/50">
                  {/* Greeks */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-white mb-3">Greeks</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Delta</div>
                        <div className="text-sm font-medium text-white">{suggestion.delta.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Gamma</div>
                        <div className="text-sm font-medium text-white">{suggestion.gamma.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Theta</div>
                        <div className="text-sm font-medium text-white">{suggestion.theta.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Vega</div>
                        <div className="text-sm font-medium text-white">{suggestion.vega.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">IV</div>
                        <div className="text-sm font-medium text-white">
                          {(suggestion.impliedVolatility * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Analysis */}
                  {suggestion.aiInsight && (
                    <div className="space-y-4">
                      <div className="bg-blue-900/20 border border-blue-700 rounded p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-semibold text-blue-400">AI Analysis</span>
                        </div>
                        <p className="text-sm text-gray-300">{suggestion.aiInsight}</p>
                      </div>

                      {suggestion.risks && (
                        <div className="bg-red-900/20 border border-red-700 rounded p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-sm font-semibold text-red-400">Key Risks</span>
                          </div>
                          <p className="text-sm text-gray-300 whitespace-pre-line">{suggestion.risks}</p>
                        </div>
                      )}

                      {suggestion.exitStrategy && (
                        <div className="bg-green-900/20 border border-green-700 rounded p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-green-400" />
                            <span className="text-sm font-semibold text-green-400">Exit Strategy</span>
                          </div>
                          <p className="text-sm text-gray-300">{suggestion.exitStrategy}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Position Sizing */}
                  <div className="mt-6 p-4 bg-gray-800 rounded border border-gray-700">
                    <h4 className="text-sm font-semibold text-white mb-3">Position Sizing</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Recommended Contracts:</span>
                        <span className="ml-2 font-medium text-white">{suggestion.contracts}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Buying Power Required:</span>
                        <span className="ml-2 font-medium text-white">
                          {formatCurrency(suggestion.buyingPowerRequired)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-3">How It Works</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li>
            • <strong className="text-white">Sell Premium:</strong> Generate income by selling covered calls or cash-secured puts
          </li>
          <li>
            • <strong className="text-white">Buy Options:</strong> Directional bets with defined risk using calls or puts
          </li>
          <li>
            • <strong className="text-white">AI Analysis:</strong> Get OpenAI-powered insights on trade setup, risks, and exit strategy
          </li>
          <li>
            • <strong className="text-white">Score:</strong> 0-100 rating based on probability, returns, and technical factors
          </li>
          <li>
            • <strong className="text-white">Position Sizing:</strong> Recommendations based on your account size and risk level
          </li>
        </ul>
      </div>
    </div>
  );
}
