import { RiskMetrics } from '@/types';

interface RiskAnalysisProps {
  riskMetrics: RiskMetrics;
}

export default function RiskAnalysis({ riskMetrics }: RiskAnalysisProps) {
  const getRiskLevel = (metric: string, value: number): string => {
    switch (metric) {
      case 'volatility':
        if (value < 0.15) return 'Low';
        if (value < 0.25) return 'Moderate';
        return 'High';
      case 'beta':
        if (value < 0.8) return 'Low';
        if (value < 1.2) return 'Moderate';
        return 'High';
      case 'concentration':
        if (value < 0.15) return 'Low';
        if (value < 0.25) return 'Moderate';
        return 'High';
      default:
        return 'N/A';
    }
  };

  const getRiskColor = (level: string): string => {
    switch (level) {
      case 'Low':
        return 'text-green-400';
      case 'Moderate':
        return 'text-yellow-400';
      case 'High':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Risk Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">Portfolio Beta</div>
          <div className="text-3xl font-bold text-white mb-2">{riskMetrics.portfolioBeta.toFixed(2)}</div>
          <div className={`text-sm ${getRiskColor(getRiskLevel('beta', riskMetrics.portfolioBeta))}`}>
            {getRiskLevel('beta', riskMetrics.portfolioBeta)} Risk
          </div>
          <div className="text-xs text-gray-500 mt-2">Sensitivity to market movements</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">Volatility (Ann.)</div>
          <div className="text-3xl font-bold text-white mb-2">{(riskMetrics.volatility * 100).toFixed(1)}%</div>
          <div className={`text-sm ${getRiskColor(getRiskLevel('volatility', riskMetrics.volatility))}`}>
            {getRiskLevel('volatility', riskMetrics.volatility)} Volatility
          </div>
          <div className="text-xs text-gray-500 mt-2">Annual standard deviation</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">Sharpe Ratio</div>
          <div className="text-3xl font-bold text-white mb-2">{riskMetrics.sharpeRatio.toFixed(2)}</div>
          <div className={`text-sm ${riskMetrics.sharpeRatio > 1 ? 'text-green-400' : riskMetrics.sharpeRatio > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
            {riskMetrics.sharpeRatio > 1 ? 'Good' : riskMetrics.sharpeRatio > 0 ? 'Fair' : 'Poor'}
          </div>
          <div className="text-xs text-gray-500 mt-2">Risk-adjusted return</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">Value at Risk (95%)</div>
          <div className="text-3xl font-bold text-red-400 mb-2">{(riskMetrics.valueAtRisk * 100).toFixed(2)}%</div>
          <div className="text-xs text-gray-500 mt-2">Maximum expected loss on a bad day</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">Max Drawdown</div>
          <div className="text-3xl font-bold text-red-400 mb-2">{(riskMetrics.maxDrawdown * 100).toFixed(2)}%</div>
          <div className="text-xs text-gray-500 mt-2">Peak to trough decline</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">Herfindahl Index</div>
          <div className="text-3xl font-bold text-white mb-2">{riskMetrics.concentrationRisk.herfindahlIndex.toFixed(3)}</div>
          <div className={`text-sm ${getRiskColor(getRiskLevel('concentration', riskMetrics.concentrationRisk.herfindahlIndex))}`}>
            {getRiskLevel('concentration', riskMetrics.concentrationRisk.herfindahlIndex)} Concentration
          </div>
          <div className="text-xs text-gray-500 mt-2">Portfolio concentration measure</div>
        </div>
      </div>

      {/* Concentration Risk */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Concentration Risk</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Top Holding</span>
              <span className="text-white font-medium">{riskMetrics.concentrationRisk.topHolding.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${riskMetrics.concentrationRisk.topHolding}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Top 5 Holdings</span>
              <span className="text-white font-medium">{riskMetrics.concentrationRisk.top5Holdings.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${riskMetrics.concentrationRisk.top5Holdings}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Risk Interpretation */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-400 mb-3">Risk Interpretation</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <p>
            <strong className="text-white">Beta:</strong> {riskMetrics.portfolioBeta.toFixed(2)} means your portfolio is{' '}
            {riskMetrics.portfolioBeta > 1 ? 'more volatile' : 'less volatile'} than the market.
          </p>
          <p>
            <strong className="text-white">Sharpe Ratio:</strong> {riskMetrics.sharpeRatio.toFixed(2)}{' '}
            {riskMetrics.sharpeRatio > 1
              ? 'indicates good risk-adjusted returns.'
              : 'suggests room for improvement in risk-adjusted returns.'}
          </p>
          <p>
            <strong className="text-white">Diversification:</strong> {riskMetrics.concentrationRisk.herfindahlIndex < 0.15
              ? 'Your portfolio shows good diversification.'
              : riskMetrics.concentrationRisk.herfindahlIndex < 0.25
              ? 'Consider adding more diversification.'
              : 'Your portfolio is highly concentrated. Consider diversifying.'}
          </p>
        </div>
      </div>
    </div>
  );
}
