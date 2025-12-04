/**
 * Risk Assessment & Position Sizing Card
 *
 * Displays AI-powered risk assessment and position sizing recommendations
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, AlertCircle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { aiApi, stocksApi } from '@/services/api';

interface RiskAssessmentCardProps {
  symbol: string;
}

export default function RiskAssessmentCard({ symbol }: RiskAssessmentCardProps) {
  const [portfolioValue, setPortfolioValue] = useState(10000);
  const [riskPerTrade, setRiskPerTrade] = useState(2);
  const [cashAvailable, setCashAvailable] = useState(5000);

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

  // Calculate stop loss from analysis
  const stopLoss = analysis?.priceTargets?.stopLoss || (quote ? parseFloat(quote.close) * 0.95 : 0);

  // Fetch risk assessment
  const { data: assessment, isLoading, error } = useQuery({
    queryKey: ['risk-assessment', symbol, portfolioValue, riskPerTrade, cashAvailable, stopLoss],
    queryFn: async () => {
      if (!quote || !analysis || !stopLoss) return null;

      return aiApi.getRiskAssessment(symbol, {
        currentPrice: parseFloat(quote.close),
        stopLoss,
        portfolioValue,
        riskPerTrade,
        technicalAnalysis: analysis,
        cashAvailable,
      });
    },
    enabled: !!symbol && !!quote && !!analysis && !!stopLoss,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading || !quote || !analysis) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold">AI Risk Assessment</h2>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold">AI Risk Assessment</h2>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">AI risk assessment requires OpenAI API configuration.</p>
          </div>
        </div>
      </div>
    );
  }

  const riskColors: Record<string, string> = {
    very_low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    low: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
    moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
    very_high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  };

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-bold">AI Risk Assessment & Position Sizing</h2>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Portfolio Value ($)</label>
          <input
            type="number"
            value={portfolioValue}
            onChange={(e) => setPortfolioValue(parseFloat(e.target.value))}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Risk Per Trade (%)</label>
          <input
            type="number"
            value={riskPerTrade}
            onChange={(e) => setRiskPerTrade(parseFloat(e.target.value))}
            className="input"
            step="0.5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Cash Available ($)</label>
          <input
            type="number"
            value={cashAvailable}
            onChange={(e) => setCashAvailable(parseFloat(e.target.value))}
            className="input"
          />
        </div>
      </div>

      {/* Risk Level */}
      <div className="flex items-center gap-4 mb-6">
        <span className={`px-4 py-2 rounded-lg font-bold ${riskColors[assessment.riskLevel]}`}>
          {assessment.riskLevel.toUpperCase().replace('_', ' ')} RISK
        </span>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Risk/Reward: <span className="font-bold">{assessment.riskMetrics.riskRewardRatio.toFixed(2)}:1</span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Win Probability: <span className="font-bold">{assessment.riskMetrics.probabilityOfProfit}%</span>
        </div>
      </div>

      {/* Position Sizing */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-6 mb-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <DollarSign className="w-6 h-6" />
          Recommended Position Size
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Shares</div>
            <div className="text-2xl font-bold">{assessment.positionSizing.recommendedShares}</div>
          </div>
          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Dollar Amount</div>
            <div className="text-2xl font-bold">${assessment.positionSizing.recommendedDollarAmount.toFixed(0)}</div>
          </div>
          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Risk Amount</div>
            <div className="text-2xl font-bold text-red-600">${assessment.positionSizing.riskAmount.toFixed(0)}</div>
          </div>
          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Position %</div>
            <div className="text-2xl font-bold">{assessment.positionSizing.positionPercentage.toFixed(1)}%</div>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
          <p className="mb-2">
            <strong>Stop Loss Distance:</strong> ${assessment.positionSizing.stopLossDistance.dollars.toFixed(2)}
            ({assessment.positionSizing.stopLossDistance.percentage.toFixed(2)}%)
          </p>
          <p>
            <strong>Risk Percentage:</strong> {assessment.positionSizing.riskPercentage.toFixed(2)}% of portfolio
          </p>
        </div>
      </div>

      {/* Scenario Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold text-green-800 dark:text-green-200">Best Case</h4>
          </div>
          <div className="text-2xl font-bold text-green-600 mb-1">
            +${assessment.scenarioAnalysis.bestCase.profit.toFixed(0)}
          </div>
          <div className="text-sm text-green-700 dark:text-green-300 mb-2">
            ({assessment.scenarioAnalysis.bestCase.percentage.toFixed(1)}%)
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-300">{assessment.scenarioAnalysis.bestCase.description}</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Expected Case</h4>
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {assessment.scenarioAnalysis.expectedCase.profit >= 0 ? '+' : ''}${assessment.scenarioAnalysis.expectedCase.profit.toFixed(0)}
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300 mb-2">
            ({assessment.scenarioAnalysis.expectedCase.percentage.toFixed(1)}%)
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-300">{assessment.scenarioAnalysis.expectedCase.description}</p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <h4 className="font-semibold text-red-800 dark:text-red-200">Worst Case</h4>
          </div>
          <div className="text-2xl font-bold text-red-600 mb-1">
            -${Math.abs(assessment.scenarioAnalysis.worstCase.loss).toFixed(0)}
          </div>
          <div className="text-sm text-red-700 dark:text-red-300 mb-2">
            ({assessment.scenarioAnalysis.worstCase.percentage.toFixed(1)}%)
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-300">{assessment.scenarioAnalysis.worstCase.description}</p>
        </div>
      </div>

      {/* Warnings */}
      {assessment.warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
          <h4 className="font-semibold mb-2 flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="w-5 h-5" />
            Risk Warnings
          </h4>
          <ul className="space-y-1">
            {assessment.warnings.map((warning: string, idx: number) => (
              <li key={idx} className="text-sm text-yellow-800 dark:text-yellow-200">
                • {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Advice */}
      {assessment.advice.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <h4 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">Risk Management Advice</h4>
          <ul className="space-y-1">
            {assessment.advice.map((tip: string, idx: number) => (
              <li key={idx} className="text-sm text-blue-800 dark:text-blue-200">
                • {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Capital Preservation */}
      {assessment.capitalPreservation.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h4 className="font-semibold mb-2 text-green-800 dark:text-green-200">Capital Preservation Strategies</h4>
          <ul className="space-y-1">
            {assessment.capitalPreservation.map((strategy: string, idx: number) => (
              <li key={idx} className="text-sm text-green-800 dark:text-green-200">
                • {strategy}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
