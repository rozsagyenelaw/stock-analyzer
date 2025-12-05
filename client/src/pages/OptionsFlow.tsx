import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface OptionsFlowData {
  symbol: string;
  timestamp: string;
  type: 'call' | 'put';
  strike: number;
  expiration: string;
  premium: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  underlyingPrice: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  size: 'small' | 'medium' | 'large' | 'block';
  unusual: boolean;
  spotGammaLevel?: number;
}

interface FlowAnalysis {
  symbol: string;
  totalCallVolume: number;
  totalPutVolume: number;
  totalCallPremium: number;
  totalPutPremium: number;
  putCallRatio: number;
  netSentiment: 'bullish' | 'bearish' | 'neutral';
  unusualActivity: OptionsFlowData[];
  largestTrades: OptionsFlowData[];
  spotGammaExposure?: {
    level: number;
    strikes: { strike: number; gamma: number }[];
  };
}

export default function OptionsFlow() {
  const [symbol, setSymbol] = useState<string>('AAPL');
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null);

  // Fetch options flow analysis
  const {
    data: flowData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['options-flow', symbol],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/options-flow/${symbol}`);
      return response.data as FlowAnalysis;
    },
    enabled: false, // Wait for user to click "Analyze"
  });

  const handleAnalyze = () => {
    if (!symbol.trim()) {
      toast.error('Please enter a stock symbol');
      return;
    }
    refetch();
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return 'text-green-600';
      case 'bearish':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSizeBadge = (size: string) => {
    const colors = {
      small: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      large: 'bg-orange-100 text-orange-800',
      block: 'bg-red-100 text-red-800',
    };
    return colors[size as keyof typeof colors] || colors.small;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Options Flow Analysis</h1>
        </div>
        <p className="text-gray-600">
          Track unusual options activity and identify smart money moves in real-time
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock Symbol
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
              placeholder="Enter symbol (e.g., AAPL)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  Analyze
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {flowData && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Put/Call Ratio</span>
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {flowData.putCallRatio.toFixed(2)}
              </div>
              <div className={`text-sm mt-1 ${getSentimentColor(flowData.netSentiment)}`}>
                {flowData.netSentiment.toUpperCase()}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Call Volume</span>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(flowData.totalCallVolume)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Premium: {formatCurrency(flowData.totalCallPremium)}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Put Volume</span>
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(flowData.totalPutVolume)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Premium: {formatCurrency(flowData.totalPutPremium)}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Unusual Activity</span>
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {flowData.unusualActivity.length}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Block Trades: {flowData.largestTrades.filter(t => t.size === 'block').length}
              </div>
            </div>
          </div>

          {/* Unusual Activity Table */}
          {flowData.unusualActivity.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Unusual Options Activity
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Strike</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Exp</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Premium</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Volume</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Size</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Sentiment</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">IV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flowData.unusualActivity.map((trade, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() =>
                          setExpandedTrade(expandedTrade === `unusual-${index}` ? null : `unusual-${index}`)
                        }
                      >
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                              trade.type === 'call' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {trade.type === 'call' ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {trade.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium">${trade.strike}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{trade.expiration}</td>
                        <td className="py-3 px-4 font-medium text-green-600">
                          {formatCurrency(trade.premium)}
                        </td>
                        <td className="py-3 px-4">{formatNumber(trade.volume)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getSizeBadge(trade.size)}`}>
                            {trade.size.toUpperCase()}
                          </span>
                        </td>
                        <td className={`py-3 px-4 font-medium ${getSentimentColor(trade.sentiment)}`}>
                          {trade.sentiment.toUpperCase()}
                        </td>
                        <td className="py-3 px-4">{(trade.impliedVolatility * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Largest Trades Table */}
          {flowData.largestTrades.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Largest Premium Trades
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Strike</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Exp</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Premium</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Volume</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">OI</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Sentiment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flowData.largestTrades.map((trade, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                              trade.type === 'call' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {trade.type === 'call' ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {trade.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium">${trade.strike}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{trade.expiration}</td>
                        <td className="py-3 px-4 font-bold text-green-600">
                          {formatCurrency(trade.premium)}
                        </td>
                        <td className="py-3 px-4">{formatNumber(trade.volume)}</td>
                        <td className="py-3 px-4">{formatNumber(trade.openInterest)}</td>
                        <td className={`py-3 px-4 font-medium ${getSentimentColor(trade.sentiment)}`}>
                          {trade.sentiment.toUpperCase()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {flowData.unusualActivity.length === 0 && flowData.largestTrades.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Unusual Activity Detected</h3>
              <p className="text-gray-500">
                No significant options flow detected for {flowData.symbol}. Try another symbol or check back later.
              </p>
            </div>
          )}
        </>
      )}

      {/* Initial Empty State */}
      {!flowData && !isLoading && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Enter a Symbol to Start</h3>
          <p className="text-gray-500">
            Enter a stock symbol above and click "Analyze" to view real-time options flow data
          </p>
        </div>
      )}
    </div>
  );
}
