import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  MinusCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface TradeIdea {
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  positionSize?: number;
  timeframe: string;
  reasoning?: string;
}

interface ValidationResult {
  symbol: string;
  validationScore: number;
  verdict: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' | 'avoid';
  riskReward: any;
  technicalSetup: any;
  marketContext: any;
  aiAnalysis: any;
  checklist: any[];
  timestamp: string;
}

export default function TradeValidator() {
  const [formData, setFormData] = useState<TradeIdea>({
    symbol: '',
    direction: 'long',
    entryPrice: 0,
    targetPrice: 0,
    stopLoss: 0,
    positionSize: undefined,
    timeframe: 'swing',
    reasoning: ''
  });

  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const validateMutation = useMutation({
    mutationFn: async (trade: TradeIdea) => {
      const response = await fetch(`${API_BASE_URL}/api/trade-validation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trade)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Validation failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setValidationResult(data);
      toast.success('Trade validated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Validation failed');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateMutation.mutate(formData);
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'strong_buy':
      case 'strong_sell':
        return 'text-green-600 dark:text-green-400';
      case 'buy':
      case 'sell':
        return 'text-blue-600 dark:text-blue-400';
      case 'hold':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'avoid':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getCheckIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <MinusCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary-600" />
          AI Trade Validation Assistant
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Get AI-powered validation before executing your trades
        </p>
      </div>

      {/* Input Form */}
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-6">Enter Trade Details</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Symbol */}
            <div>
              <label className="block text-sm font-medium mb-2">Stock Symbol *</label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                placeholder="e.g., AAPL"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>

            {/* Direction */}
            <div>
              <label className="block text-sm font-medium mb-2">Direction *</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, direction: 'long' })}
                  className={`py-2 px-4 rounded-lg border-2 transition-colors ${
                    formData.direction === 'long'
                      ? 'border-green-600 bg-green-50 dark:bg-green-900 text-green-900 dark:text-green-100'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <TrendingUp className="w-5 h-5 mx-auto mb-1" />
                  Long
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, direction: 'short' })}
                  className={`py-2 px-4 rounded-lg border-2 transition-colors ${
                    formData.direction === 'short'
                      ? 'border-red-600 bg-red-50 dark:bg-red-900 text-red-900 dark:text-red-100'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <TrendingDown className="w-5 h-5 mx-auto mb-1" />
                  Short
                </button>
              </div>
            </div>

            {/* Entry Price */}
            <div>
              <label className="block text-sm font-medium mb-2">Entry Price *</label>
              <input
                type="number"
                step="0.01"
                value={formData.entryPrice || ''}
                onChange={(e) => setFormData({ ...formData, entryPrice: parseFloat(e.target.value) })}
                placeholder="0.00"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>

            {/* Target Price */}
            <div>
              <label className="block text-sm font-medium mb-2">Target Price *</label>
              <input
                type="number"
                step="0.01"
                value={formData.targetPrice || ''}
                onChange={(e) => setFormData({ ...formData, targetPrice: parseFloat(e.target.value) })}
                placeholder="0.00"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>

            {/* Stop Loss */}
            <div>
              <label className="block text-sm font-medium mb-2">Stop Loss *</label>
              <input
                type="number"
                step="0.01"
                value={formData.stopLoss || ''}
                onChange={(e) => setFormData({ ...formData, stopLoss: parseFloat(e.target.value) })}
                placeholder="0.00"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>

            {/* Position Size */}
            <div>
              <label className="block text-sm font-medium mb-2">Position Size (shares)</label>
              <input
                type="number"
                value={formData.positionSize || ''}
                onChange={(e) => setFormData({ ...formData, positionSize: parseInt(e.target.value) || undefined })}
                placeholder="Optional"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>

            {/* Timeframe */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Timeframe *</label>
              <select
                value={formData.timeframe}
                onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="scalp">Scalp (minutes)</option>
                <option value="day">Day Trade (hours)</option>
                <option value="swing">Swing Trade (days to weeks)</option>
                <option value="position">Position Trade (weeks to months)</option>
              </select>
            </div>

            {/* Reasoning */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Your Reasoning (optional)</label>
              <textarea
                value={formData.reasoning}
                onChange={(e) => setFormData({ ...formData, reasoning: e.target.value })}
                placeholder="Why are you considering this trade?"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={validateMutation.isPending}
            className="btn btn-primary w-full py-3 text-lg"
          >
            {validateMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Validating...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Shield className="w-5 h-5" />
                Validate Trade
              </span>
            )}
          </button>
        </form>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <div className="space-y-6">
          {/* Overall Score */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Validation Results</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {validationResult.symbol} • {new Date(validationResult.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold text-primary-600">
                  {validationResult.validationScore}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Validation Score</div>
              </div>
            </div>

            <div className={`text-2xl font-bold ${getVerdictColor(validationResult.verdict)}`}>
              Verdict: {validationResult.verdict.replace('_', ' ').toUpperCase()}
            </div>
          </div>

          {/* AI Analysis */}
          <div className="card p-6">
            <h3 className="text-xl font-bold mb-4">AI Analysis</h3>

            <div className="space-y-4">
              <div>
                <div className="font-medium mb-2">Summary</div>
                <p className="text-gray-700 dark:text-gray-300">{validationResult.aiAnalysis.summary}</p>
              </div>

              <div>
                <div className="font-medium mb-2 text-green-600">Pros</div>
                <ul className="list-disc list-inside space-y-1">
                  {validationResult.aiAnalysis.pros.map((pro: string, i: number) => (
                    <li key={i} className="text-gray-700 dark:text-gray-300">{pro}</li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="font-medium mb-2 text-red-600">Cons</div>
                <ul className="list-disc list-inside space-y-1">
                  {validationResult.aiAnalysis.cons.map((con: string, i: number) => (
                    <li key={i} className="text-gray-700 dark:text-gray-300">{con}</li>
                  ))}
                </ul>
              </div>

              {validationResult.aiAnalysis.warnings.length > 0 && (
                <div>
                  <div className="font-medium mb-2 text-yellow-600 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Warnings
                  </div>
                  <ul className="list-disc list-inside space-y-1">
                    {validationResult.aiAnalysis.warnings.map((warning: string, i: number) => (
                      <li key={i} className="text-gray-700 dark:text-gray-300">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="font-medium mb-2">Recommendation</div>
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  {validationResult.aiAnalysis.recommendation}
                </p>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Risk/Reward */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-6 h-6 text-primary-600" />
                <h3 className="text-lg font-bold">Risk/Reward</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Ratio:</span>
                  <span className="font-bold">{validationResult.riskReward.ratio.toFixed(2)}:1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Potential Gain:</span>
                  <span className="font-bold text-green-600">+{validationResult.riskReward.potentialGain.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Potential Loss:</span>
                  <span className="font-bold text-red-600">{validationResult.riskReward.potentialLoss.toFixed(2)}%</span>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm font-medium mb-1">Score: {validationResult.riskReward.score}/100</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{validationResult.riskReward.assessment}</div>
                </div>
              </div>
            </div>

            {/* Technical Setup */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-6 h-6 text-primary-600" />
                <h3 className="text-lg font-bold">Technical Setup</h3>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium mb-2">{validationResult.technicalSetup.priceAction}</div>
                <div className="text-sm">
                  <div className="font-medium mb-1">Sentiment: {validationResult.technicalSetup.sentiment}</div>
                  {validationResult.technicalSetup.indicators.length > 0 && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      {validationResult.technicalSetup.indicators.slice(0, 2).map((ind: string, i: number) => (
                        <div key={i}>• {ind}</div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm font-medium">Score: {validationResult.technicalSetup.score}/100</div>
                </div>
              </div>
            </div>

            {/* Market Context */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-6 h-6 text-primary-600" />
                <h3 className="text-lg font-bold">Market Context</h3>
              </div>
              <div className="space-y-2">
                <div className="text-sm">
                  <div>Trend: <span className="font-medium">{validationResult.marketContext.trend}</span></div>
                  <div>Volume: <span className="font-medium">{validationResult.marketContext.volume}</span></div>
                  <div>Volatility: <span className="font-medium">{validationResult.marketContext.volatility}</span></div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm font-medium mb-1">Score: {validationResult.marketContext.score}/100</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{validationResult.marketContext.timing}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Checklist */}
          <div className="card p-6">
            <h3 className="text-xl font-bold mb-4">Validation Checklist</h3>

            <div className="space-y-6">
              {validationResult.checklist.map((category: any, catIndex: number) => (
                <div key={catIndex}>
                  <h4 className="font-bold text-lg mb-3">{category.category}</h4>
                  <div className="space-y-2">
                    {category.items.map((item: any, itemIndex: number) => (
                      <div key={itemIndex} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        {getCheckIcon(item.status)}
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.check}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.details}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
