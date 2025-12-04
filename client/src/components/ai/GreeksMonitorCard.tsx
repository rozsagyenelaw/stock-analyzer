/**
 * AI Options Greeks Monitor & Explainer
 *
 * Monitors Greeks in real-time, explains them in plain English,
 * and provides actionable alerts
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertCircle, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { aiApi } from '@/services/api';

interface GreeksMonitorCardProps {
  symbol: string;
}

export default function GreeksMonitorCard({ symbol }: GreeksMonitorCardProps) {
  const [position, setPosition] = useState({
    type: 'call' as 'call' | 'put',
    strike: 0,
    expiration: '',
    quantity: 1,
    entryPrice: 0,
    currentPrice: 0,
  });

  const [greeks, setGreeks] = useState({
    delta: 0,
    gamma: 0,
    theta: 0,
    vega: 0,
    rho: 0,
  });

  const [underlyingPrice, setUnderlyingPrice] = useState(0);
  const [impliedVolatility, setImpliedVolatility] = useState(30);
  const [daysToExpiration, setDaysToExpiration] = useState(30);

  // Fetch Greeks analysis
  const { data: analysis, isLoading, error, refetch } = useQuery({
    queryKey: ['greeks-analysis', symbol, position, greeks, underlyingPrice, impliedVolatility, daysToExpiration],
    queryFn: async () => {
      if (!position.strike || !position.expiration || !underlyingPrice) return null;

      return aiApi.getGreeksAnalysis({
        position: { ...position, symbol },
        greeks,
        underlyingPrice,
        daysToExpiration,
        impliedVolatility,
      });
    },
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });

  const handleAnalyze = () => {
    if (position.strike > 0 && position.expiration && underlyingPrice > 0) {
      refetch();
    }
  };

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-bold">AI Options Greeks Monitor</h2>
      </div>

      {/* Position Input */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-4">Position Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Option Type</label>
            <select
              value={position.type}
              onChange={(e) => setPosition({ ...position, type: e.target.value as 'call' | 'put' })}
              className="input"
            >
              <option value="call">Call</option>
              <option value="put">Put</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Strike Price ($)</label>
            <input
              type="number"
              value={position.strike || ''}
              onChange={(e) => setPosition({ ...position, strike: parseFloat(e.target.value) })}
              className="input"
              placeholder="150.00"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Expiration Date</label>
            <input
              type="date"
              value={position.expiration}
              onChange={(e) => setPosition({ ...position, expiration: e.target.value })}
              className="input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <input
              type="number"
              value={position.quantity}
              onChange={(e) => setPosition({ ...position, quantity: parseInt(e.target.value) })}
              className="input"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Entry Price ($)</label>
            <input
              type="number"
              value={position.entryPrice || ''}
              onChange={(e) => setPosition({ ...position, entryPrice: parseFloat(e.target.value) })}
              className="input"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Current Price ($)</label>
            <input
              type="number"
              value={position.currentPrice || ''}
              onChange={(e) => setPosition({ ...position, currentPrice: parseFloat(e.target.value) })}
              className="input"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Days to Expiration</label>
            <input
              type="number"
              value={daysToExpiration}
              onChange={(e) => setDaysToExpiration(parseInt(e.target.value))}
              className="input"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Greeks Input */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-4">Greeks Values</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Delta</label>
            <input
              type="number"
              value={greeks.delta}
              onChange={(e) => setGreeks({ ...greeks, delta: parseFloat(e.target.value) })}
              className="input"
              step="0.001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Gamma</label>
            <input
              type="number"
              value={greeks.gamma}
              onChange={(e) => setGreeks({ ...greeks, gamma: parseFloat(e.target.value) })}
              className="input"
              step="0.001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Theta</label>
            <input
              type="number"
              value={greeks.theta}
              onChange={(e) => setGreeks({ ...greeks, theta: parseFloat(e.target.value) })}
              className="input"
              step="0.001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Vega</label>
            <input
              type="number"
              value={greeks.vega}
              onChange={(e) => setGreeks({ ...greeks, vega: parseFloat(e.target.value) })}
              className="input"
              step="0.001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Rho</label>
            <input
              type="number"
              value={greeks.rho}
              onChange={(e) => setGreeks({ ...greeks, rho: parseFloat(e.target.value) })}
              className="input"
              step="0.001"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Underlying Price ($)</label>
            <input
              type="number"
              value={underlyingPrice || ''}
              onChange={(e) => setUnderlyingPrice(parseFloat(e.target.value))}
              className="input"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Implied Volatility (%)</label>
            <input
              type="number"
              value={impliedVolatility}
              onChange={(e) => setImpliedVolatility(parseFloat(e.target.value))}
              className="input"
              step="0.1"
            />
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={!position.strike || !position.expiration || !underlyingPrice}
          className="btn btn-primary"
        >
          Analyze Greeks
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">Greeks analysis requires OpenAI API configuration.</p>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !isLoading && (
        <>
          {/* Position Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">Position Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Position</div>
                <div className="text-lg font-bold">{analysis.summary.position}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Value</div>
                <div className="text-lg font-bold">${analysis.summary.currentValue.toFixed(0)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">P/L</div>
                <div className={`text-lg font-bold ${analysis.summary.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analysis.summary.profitLoss >= 0 ? '+' : ''}${analysis.summary.profitLoss.toFixed(0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">P/L %</div>
                <div className={`text-lg font-bold ${analysis.summary.profitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analysis.summary.profitLossPercent >= 0 ? '+' : ''}{analysis.summary.profitLossPercent.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {analysis.alerts && analysis.alerts.length > 0 && (
            <div className="mb-6 space-y-2">
              {analysis.alerts.map((alert: any, idx: number) => {
                const alertColors: Record<string, string> = {
                  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200',
                  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200',
                  critical: 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200',
                };

                return (
                  <div key={idx} className={`border-2 rounded-lg p-4 ${alertColors[alert.level]}`}>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-semibold">{alert.level.toUpperCase()}:</span>
                      <span>{alert.message}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Plain English Summary */}
          {analysis.plainEnglish && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold mb-3 text-purple-800 dark:text-purple-200">Plain English Summary</h3>
              <p className="text-purple-800 dark:text-purple-200">{analysis.plainEnglish}</p>
            </div>
          )}

          {/* Greeks Explanation */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4">Greeks Explained</h3>
            <div className="space-y-4">
              {/* Delta */}
              <div className="border dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-lg">Delta</h4>
                  <span className="text-2xl font-bold text-blue-600">{analysis.greeksExplanation.delta.value.toFixed(3)}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold text-gray-600 dark:text-gray-400">Meaning:</span>{' '}
                    <span>{analysis.greeksExplanation.delta.meaning}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600 dark:text-gray-400">Impact:</span>{' '}
                    <span>{analysis.greeksExplanation.delta.impact}</span>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                    <span className="font-semibold text-blue-800 dark:text-blue-200">Action:</span>{' '}
                    <span className="text-blue-800 dark:text-blue-200">{analysis.greeksExplanation.delta.action}</span>
                  </div>
                </div>
              </div>

              {/* Gamma */}
              <div className="border dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-lg">Gamma</h4>
                  <span className="text-2xl font-bold text-green-600">{analysis.greeksExplanation.gamma.value.toFixed(3)}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold text-gray-600 dark:text-gray-400">Meaning:</span>{' '}
                    <span>{analysis.greeksExplanation.gamma.meaning}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600 dark:text-gray-400">Impact:</span>{' '}
                    <span>{analysis.greeksExplanation.gamma.impact}</span>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
                    <span className="font-semibold text-green-800 dark:text-green-200">Action:</span>{' '}
                    <span className="text-green-800 dark:text-green-200">{analysis.greeksExplanation.gamma.action}</span>
                  </div>
                </div>
              </div>

              {/* Theta */}
              <div className="border dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-lg">Theta (Time Decay)</h4>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">{analysis.greeksExplanation.theta.value.toFixed(3)}</div>
                    <div className="text-sm text-red-600">${Math.abs(analysis.greeksExplanation.theta.dailyDecay).toFixed(2)}/day</div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold text-gray-600 dark:text-gray-400">Meaning:</span>{' '}
                    <span>{analysis.greeksExplanation.theta.meaning}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600 dark:text-gray-400">Impact:</span>{' '}
                    <span>{analysis.greeksExplanation.theta.impact}</span>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded p-2">
                    <span className="font-semibold text-red-800 dark:text-red-200">Action:</span>{' '}
                    <span className="text-red-800 dark:text-red-200">{analysis.greeksExplanation.theta.action}</span>
                  </div>
                </div>
              </div>

              {/* Vega */}
              <div className="border dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-lg">Vega</h4>
                  <span className="text-2xl font-bold text-purple-600">{analysis.greeksExplanation.vega.value.toFixed(3)}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold text-gray-600 dark:text-gray-400">Meaning:</span>{' '}
                    <span>{analysis.greeksExplanation.vega.meaning}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600 dark:text-gray-400">Impact:</span>{' '}
                    <span>{analysis.greeksExplanation.vega.impact}</span>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-2">
                    <span className="font-semibold text-purple-800 dark:text-purple-200">Action:</span>{' '}
                    <span className="text-purple-800 dark:text-purple-200">{analysis.greeksExplanation.vega.action}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Time Decay Impact */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-800 dark:text-red-200">
              <TrendingDown className="w-5 h-5" />
              Time Decay Impact
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Today</div>
                <div className="text-xl font-bold text-red-600">-${Math.abs(analysis.risks.timeDecay.today).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">This Week</div>
                <div className="text-xl font-bold text-red-600">-${Math.abs(analysis.risks.timeDecay.thisWeek).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">To Expiration</div>
                <div className="text-xl font-bold text-red-600">-${Math.abs(analysis.risks.timeDecay.toExpiration).toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Risks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-red-800 dark:text-red-200">Primary Risks</h4>
              <ul className="space-y-2">
                {analysis.risks.primary.map((risk: string, idx: number) => (
                  <li key={idx} className="text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-orange-800 dark:text-orange-200">Secondary Risks</h4>
              <ul className="space-y-2">
                {analysis.risks.secondary.map((risk: string, idx: number) => (
                  <li key={idx} className="text-sm text-orange-800 dark:text-orange-200 flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Opportunities */}
          {analysis.opportunities && analysis.opportunities.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-800 dark:text-green-200">
                <TrendingUp className="w-5 h-5" />
                Opportunities
              </h4>
              <ul className="space-y-2">
                {analysis.opportunities.map((opp: string, idx: number) => (
                  <li key={idx} className="text-sm text-green-800 dark:text-green-200">
                    • {opp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Adjustments */}
          {analysis.adjustments && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold mb-3 text-blue-800 dark:text-blue-200">Recommended Adjustments</h4>
                <ul className="space-y-2">
                  {analysis.adjustments.recommended.map((adj: string, idx: number) => (
                    <li key={idx} className="text-sm text-blue-800 dark:text-blue-200">
                      {idx + 1}. {adj}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <h4 className="font-semibold mb-3 text-purple-800 dark:text-purple-200">Hedging Strategies</h4>
                <ul className="space-y-2">
                  {analysis.adjustments.hedging.map((hedge: string, idx: number) => (
                    <li key={idx} className="text-sm text-purple-800 dark:text-purple-200">
                      {idx + 1}. {hedge}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
