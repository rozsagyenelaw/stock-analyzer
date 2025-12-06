import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  TrendingUp,
  ArrowDownCircle,
  Activity,
  BarChart3,
  RefreshCw,
  DollarSign,
  Target,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface TradeIdea {
  id: string;
  symbol: string;
  companyName: string;
  price: number;
  strategy: string;
  tradeType: 'day_trade' | 'swing_trade';
  timeframe: string;
  entry: number;
  target: number;
  stopLoss: number;
  potentialGain: number;
  potentialLoss: number;
  riskReward: number;
  volume: number;
  avgVolume: number;
  relativeVolume: number;
  rsi: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
  setup: string;
  reasoning: string;
  score: number;
  timestamp: string;
}

interface Strategy {
  id: string;
  name: string;
  description: string;
  tradeType: 'day_trade' | 'swing_trade';
  timeframe: string;
  difficulty: string;
  targetGain: string;
}

export default function TradeIdeas() {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('5');
  const [maxPrice, setMaxPrice] = useState<string>('50');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Fetch available strategies
  const { data: strategies = [], isLoading: strategiesLoading } = useQuery({
    queryKey: ['trade-strategies'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/trade-ideas/strategies`);
      console.log('Strategies loaded:', response.data);
      return response.data as Strategy[];
    },
  });

  // Fetch trade ideas for selected strategy
  const {
    data: scanResults,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['trade-ideas', selectedStrategy, minPrice, maxPrice],
    queryFn: async () => {
      console.log('Scanning with strategy:', selectedStrategy);
      const response = await axios.get(`${API_BASE_URL}/api/trade-ideas/scan/${selectedStrategy}`, {
        params: {
          minPrice: parseFloat(minPrice) || 5,
          maxPrice: parseFloat(maxPrice) || 50,
          minVolume: 500000,
        },
      });
      console.log('Scan results:', response.data);
      return response.data;
    },
    enabled: false, // Don't auto-fetch, wait for user to click "Scan"
  });

  const ideas = scanResults?.ideas || [];

  const handleScan = () => {
    if (!selectedStrategy) {
      toast.error('Please select a strategy first');
      return;
    }
    if (!minPrice || !maxPrice || parseFloat(minPrice) >= parseFloat(maxPrice)) {
      toast.error('Please enter valid price range');
      return;
    }
    refetch();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 bg-green-900/30';
    if (score >= 60) return 'text-yellow-400 bg-yellow-900/30';
    return 'text-orange-400 bg-orange-900/30';
  };

  const getTradeTypeIcon = (type: string) => {
    return type === 'day_trade' ? <Clock className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />;
  };

  const getStrategyIcon = (strategyId: string) => {
    switch (strategyId) {
      case 'momentum-breakout':
        return <TrendingUp className="w-5 h-5" />;
      case 'oversold-bounce':
        return <ArrowDownCircle className="w-5 h-5" />;
      case 'macd-crossover':
        return <Activity className="w-5 h-5" />;
      case 'pullback-play':
        return <BarChart3 className="w-5 h-5" />;
      default:
        return <Target className="w-5 h-5" />;
    }
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
          <Target className="w-8 h-8 text-green-400" />
          <h1 className="text-3xl font-bold text-white">Short-Term Trade Ideas</h1>
        </div>
        <p className="text-gray-400">Affordable day trades and swing trades for smaller accounts ($5-$50 stocks)</p>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Strategy Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Strategy</label>
            <select
              value={selectedStrategy}
              onChange={e => setSelectedStrategy(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select strategy...</option>
              {strategies.map((strategy: Strategy) => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </option>
              ))}
            </select>
          </div>

          {/* Min Price */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Min Price</label>
            <input
              type="number"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              placeholder="5"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Max Price */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Max Price</label>
            <input
              type="number"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              placeholder="50"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Scan Button */}
          <div className="flex items-end">
            <button
              onClick={handleScan}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Scanning...' : 'Scan'}
            </button>
          </div>
        </div>

        {/* Selected Strategy Info */}
        {selectedStrategy && (
          <div className="mt-4 p-3 bg-gray-700/50 rounded border border-gray-600">
            {strategies
              .filter((s: Strategy) => s.id === selectedStrategy)
              .map((strategy: Strategy) => (
                <div key={strategy.id} className="flex items-start gap-3">
                  <div className="text-blue-400 mt-0.5">{getStrategyIcon(strategy.id)}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{strategy.name}</span>
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-600 text-gray-300">
                        {strategy.timeframe}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-green-900 text-green-300">
                        Target: {strategy.targetGain}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{strategy.description}</p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <span className="ml-4 text-gray-400">Scanning market for opportunities...</span>
        </div>
      )}

      {!isLoading && ideas.length === 0 && scanResults && (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <AlertTriangle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">No trade ideas found</p>
          <p className="text-sm text-gray-500">
            Try adjusting your price range or selecting a different strategy
          </p>
        </div>
      )}

      {!isLoading && ideas.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400">
              Found {ideas.length} opportunities • Price range: ${minPrice}-${maxPrice}
            </p>
          </div>

          {ideas.map((idea: TradeIdea) => (
            <div
              key={idea.id}
              className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition"
            >
              {/* Card Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl font-bold text-white">{idea.symbol}</span>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(idea.score)}`}>
                          {idea.score}/100
                        </span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300">
                          {formatCurrency(idea.price)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">{idea.companyName}</span>
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-900/50 text-blue-300 flex items-center gap-1">
                          {getTradeTypeIcon(idea.tradeType)}
                          {idea.timeframe}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedCard(expandedCard === idea.id ? null : idea.id)}
                    className="px-3 py-2 text-sm text-gray-400 hover:text-white transition"
                  >
                    {expandedCard === idea.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>

                {/* Strategy Info */}
                <div className="mb-4 p-3 bg-blue-900/20 border border-blue-800 rounded">
                  <div className="text-sm font-medium text-blue-300 mb-1">{idea.strategy}</div>
                  <p className="text-sm text-gray-300">{idea.setup}</p>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      <Target className="w-3 h-3 inline mr-1" />
                      Entry
                    </div>
                    <div className="text-sm font-medium text-white">{formatCurrency(idea.entry)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Target</div>
                    <div className="text-sm font-medium text-green-400">
                      {formatCurrency(idea.target)}
                      <span className="text-xs ml-1">(+{idea.potentialGain.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Stop Loss</div>
                    <div className="text-sm font-medium text-red-400">
                      {formatCurrency(idea.stopLoss)}
                      <span className="text-xs ml-1">(-{idea.potentialLoss.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Risk/Reward</div>
                    <div className="text-sm font-medium text-blue-400">{idea.riskReward.toFixed(2)}:1</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Volume</div>
                    <div className="text-sm font-medium text-white">
                      {(idea.volume / 1000000).toFixed(1)}M
                      <span className="text-xs text-green-400 ml-1">({idea.relativeVolume.toFixed(1)}x avg)</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">RSI</div>
                    <div className="text-sm font-medium text-white">{idea.rsi.toFixed(0)}</div>
                  </div>
                  {idea.macd && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">MACD</div>
                      <div className="text-sm font-medium text-white">
                        {idea.macd.histogram > 0 ? '+' : ''}
                        {idea.macd.histogram.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedCard === idea.id && (
                <div className="border-t border-gray-700 p-6 bg-gray-900/50">
                  {/* Trade Reasoning */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-400" />
                      Trade Analysis
                    </h4>
                    <p className="text-sm text-gray-300">{idea.reasoning}</p>
                  </div>

                  {/* Position Sizing Example */}
                  <div className="p-4 bg-gray-800 rounded border border-gray-700">
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      Position Sizing Example ($1,000 account, 2% risk)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Max Risk:</span>
                        <span className="ml-2 font-medium text-white">$20</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Risk Per Share:</span>
                        <span className="ml-2 font-medium text-white">${(idea.entry - idea.stopLoss).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Max Shares:</span>
                        <span className="ml-2 font-medium text-white">
                          {Math.floor(20 / (idea.entry - idea.stopLoss))}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Position Size:</span>
                        <span className="ml-2 font-medium text-white">
                          {formatCurrency(Math.floor(20 / (idea.entry - idea.stopLoss)) * idea.entry)}
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
        <h3 className="text-lg font-bold text-white mb-3">Trading Guidelines</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li>
            • <strong className="text-white">Price Range:</strong> Focus on $5-$50 stocks for affordability and
            liquidity
          </li>
          <li>
            • <strong className="text-white">Risk Management:</strong> Never risk more than 1-2% of your account per
            trade
          </li>
          <li>
            • <strong className="text-white">Position Sizing:</strong> Calculate shares based on entry vs stop loss
            distance
          </li>
          <li>
            • <strong className="text-white">Stop Losses:</strong> Always use stop losses - no exceptions!
          </li>
          <li>
            • <strong className="text-white">Day Trades:</strong> Exit before market close, don't hold overnight
          </li>
          <li>
            • <strong className="text-white">Swing Trades:</strong> Give trades room to work, stick to your plan
          </li>
        </ul>
      </div>
    </div>
  );
}
