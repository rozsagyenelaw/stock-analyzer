import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  DollarSign,
  Activity,
  BarChart3,
  AlertCircle,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface TradeSignal {
  signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskRewardRatio: number;
  positionSize: number;
  reasoning: string[];
  technicalScore: number;
  trendDirection: 'uptrend' | 'downtrend' | 'sideways';
  supportLevels: number[];
  resistanceLevels: number[];
}

interface SignalResponse {
  symbol: string;
  currentPrice: number;
  quote: any;
  signal: TradeSignal;
}

interface TradeSignalsCardProps {
  symbol: string;
  accountSize?: number;
  riskPercentage?: number;
}

export default function TradeSignalsCard({
  symbol,
  accountSize = 10000,
  riskPercentage = 1
}: TradeSignalsCardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['trade-signals', symbol, accountSize, riskPercentage],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/trading/signals/${symbol}`,
        {
          params: { accountSize, riskPercentage },
        }
      );
      return response.data as SignalResponse;
    },
    enabled: !!symbol,
  });

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'STRONG_BUY':
        return 'bg-green-600 text-white';
      case 'BUY':
        return 'bg-green-500 text-white';
      case 'HOLD':
        return 'bg-yellow-500 text-white';
      case 'SELL':
        return 'bg-red-500 text-white';
      case 'STRONG_SELL':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'uptrend':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'downtrend':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
          <h2 className="text-xl font-bold">Failed to Load Trade Signals</h2>
        </div>
        <p className="text-gray-600">
          Unable to generate trade signals. Please try again later.
        </p>
      </div>
    );
  }

  const { signal } = data;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Trade Entry/Exit Signals</h2>
        </div>
        <div className="flex items-center gap-2">
          {getTrendIcon(signal.trendDirection)}
          <span className="text-sm font-medium capitalize">{signal.trendDirection}</span>
        </div>
      </div>

      {/* Signal and Confidence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="col-span-2">
          <div className="text-sm text-gray-600 mb-2">Signal</div>
          <div
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-2xl font-bold ${getSignalColor(
              signal.signal
            )}`}
          >
            {signal.signal === 'STRONG_BUY' || signal.signal === 'BUY' ? (
              <TrendingUp className="w-6 h-6" />
            ) : signal.signal === 'STRONG_SELL' || signal.signal === 'SELL' ? (
              <TrendingDown className="w-6 h-6" />
            ) : (
              <Activity className="w-6 h-6" />
            )}
            {signal.signal.replace('_', ' ')}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-2">Confidence</div>
          <div className="text-4xl font-bold text-blue-600">{signal.confidence.toFixed(0)}%</div>
          <div className="text-sm text-gray-500 mt-1">
            Technical Score: {signal.technicalScore > 0 ? '+' : ''}
            {signal.technicalScore.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Price Levels */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-600 mb-1">
            <Target className="w-4 h-4" />
            Entry
          </div>
          <div className="text-xl font-bold text-blue-900">{formatCurrency(signal.entryPrice)}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-red-600 mb-1">
            <ShieldAlert className="w-4 h-4" />
            Stop Loss
          </div>
          <div className="text-xl font-bold text-red-900">{formatCurrency(signal.stopLoss)}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-green-600 mb-1">
            <Target className="w-4 h-4" />
            Target 1
          </div>
          <div className="text-xl font-bold text-green-900">{formatCurrency(signal.target1)}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-green-600 mb-1">
            <Target className="w-4 h-4" />
            Target 2
          </div>
          <div className="text-xl font-bold text-green-900">{formatCurrency(signal.target2)}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-green-600 mb-1">
            <Target className="w-4 h-4" />
            Target 3
          </div>
          <div className="text-xl font-bold text-green-900">{formatCurrency(signal.target3)}</div>
        </div>
      </div>

      {/* Position Sizing & Risk/Reward */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <DollarSign className="w-4 h-4" />
            Position Size
          </div>
          <div className="text-2xl font-bold text-gray-900">{signal.positionSize} shares</div>
          <div className="text-sm text-gray-600 mt-1">
            Based on {riskPercentage}% risk of {formatCurrency(accountSize)} account
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <BarChart3 className="w-4 h-4" />
            Risk/Reward Ratio
          </div>
          <div className="text-2xl font-bold text-gray-900">1:{signal.riskRewardRatio.toFixed(2)}</div>
          <div className="text-sm text-gray-600 mt-1">
            {signal.riskRewardRatio >= 2 ? 'Favorable' : signal.riskRewardRatio >= 1 ? 'Acceptable' : 'Unfavorable'}
          </div>
        </div>
      </div>

      {/* Support & Resistance Levels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="border border-gray-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-green-700 mb-3">
            <TrendingUp className="w-4 h-4" />
            Support Levels
          </div>
          <div className="space-y-2">
            {signal.supportLevels.slice(0, 3).map((level, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">S{idx + 1}</span>
                <span className="font-semibold text-green-700">{formatCurrency(level)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-gray-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700 mb-3">
            <TrendingDown className="w-4 h-4" />
            Resistance Levels
          </div>
          <div className="space-y-2">
            {signal.resistanceLevels.slice(0, 3).map((level, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">R{idx + 1}</span>
                <span className="font-semibold text-red-700">{formatCurrency(level)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold mb-3">Signal Reasoning</h3>
        <ul className="space-y-2">
          {signal.reasoning.map((reason, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span className="text-gray-700">{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
