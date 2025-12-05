import { useState } from 'react';
import { DollarSign, TrendingUp, AlertTriangle, Calculator } from 'lucide-react';
import type { OptionContract } from '@/types';

interface PositionSizingCalculatorProps {
  contract: OptionContract;
  underlyingPrice: number;
}

export default function PositionSizingCalculator({ contract, underlyingPrice }: PositionSizingCalculatorProps) {
  const [accountSize, setAccountSize] = useState<string>('10000');
  const [riskPercentage, setRiskPercentage] = useState<string>('2');
  const [stopLossPercentage, setStopLossPercentage] = useState<string>('20');

  const account = parseFloat(accountSize) || 0;
  const riskPct = parseFloat(riskPercentage) || 0;
  const stopLossPct = parseFloat(stopLossPercentage) || 0;

  // Calculate position sizing
  const dollarRisk = account * (riskPct / 100);
  const contractPrice = contract.last * 100; // Options contracts control 100 shares
  const stopLossAmount = contractPrice * (stopLossPct / 100);
  const maxContracts = stopLossAmount > 0 ? Math.floor(dollarRisk / stopLossAmount) : 0;
  const positionValue = maxContracts * contractPrice;
  const capitalRequired = positionValue;
  const potentialLoss = maxContracts * stopLossAmount;

  // Calculate potential profit scenarios
  const scenarios = [
    { label: '25% Gain', multiplier: 1.25 },
    { label: '50% Gain', multiplier: 1.5 },
    { label: '100% Gain', multiplier: 2.0 },
  ];

  const profitScenarios = scenarios.map(scenario => ({
    label: scenario.label,
    profit: maxContracts * contractPrice * (scenario.multiplier - 1),
    return: ((scenario.multiplier - 1) * 100).toFixed(1),
    accountGrowth: ((maxContracts * contractPrice * (scenario.multiplier - 1)) / account * 100).toFixed(2),
  }));

  // Risk metrics
  const portfolioAllocation = account > 0 ? (positionValue / account * 100).toFixed(2) : '0';
  const riskRewardRatio = potentialLoss > 0 ? (profitScenarios[0].profit / potentialLoss).toFixed(2) : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
          <Calculator className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Position Sizing Calculator</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Calculate optimal position size based on your risk tolerance
          </p>
        </div>
      </div>

      {/* Contract Details */}
      <div className="card p-4 bg-blue-50 dark:bg-blue-900/20">
        <div className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
          Selected Contract: {contract.symbol}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-blue-700 dark:text-blue-300">Strike</div>
            <div className="font-bold text-blue-900 dark:text-blue-100">${contract.strike}</div>
          </div>
          <div>
            <div className="text-xs text-blue-700 dark:text-blue-300">Last Price</div>
            <div className="font-bold text-blue-900 dark:text-blue-100">${contract.last.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-blue-700 dark:text-blue-300">Delta</div>
            <div className="font-bold text-blue-900 dark:text-blue-100">{contract.greeks.delta.toFixed(3)}</div>
          </div>
          <div>
            <div className="text-xs text-blue-700 dark:text-blue-300">IV</div>
            <div className="font-bold text-blue-900 dark:text-blue-100">{(contract.impliedVolatility * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Input Parameters */}
      <div className="card p-6">
        <h4 className="font-semibold mb-4">Risk Parameters</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Account Size */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Account Size
              </div>
            </label>
            <input
              type="number"
              value={accountSize}
              onChange={(e) => setAccountSize(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              placeholder="10000"
            />
          </div>

          {/* Risk Percentage */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Risk Per Trade (%)
              </div>
            </label>
            <input
              type="number"
              value={riskPercentage}
              onChange={(e) => setRiskPercentage(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              placeholder="2"
              step="0.5"
              min="0"
              max="10"
            />
          </div>

          {/* Stop Loss Percentage */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Stop Loss (%)
              </div>
            </label>
            <input
              type="number"
              value={stopLossPercentage}
              onChange={(e) => setStopLossPercentage(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              placeholder="20"
              step="5"
              min="5"
              max="100"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Position Size */}
        <div className="card p-6">
          <h4 className="font-semibold mb-4">Recommended Position</h4>
          <div className="space-y-4">
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <div className="text-sm text-primary-700 dark:text-primary-300">Number of Contracts</div>
              <div className="text-3xl font-bold text-primary-900 dark:text-primary-100">{maxContracts}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400">Position Value</div>
                <div className="font-bold">${positionValue.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400">Capital Required</div>
                <div className="font-bold">${capitalRequired.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-xs text-red-700 dark:text-red-300">Max Loss</div>
                <div className="font-bold text-red-900 dark:text-red-100">${potentialLoss.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400">% of Portfolio</div>
                <div className="font-bold">{portfolioAllocation}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Profit Scenarios */}
        <div className="card p-6">
          <h4 className="font-semibold mb-4">Profit Scenarios</h4>
          <div className="space-y-3">
            {profitScenarios.map((scenario, index) => (
              <div key={index} className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-semibold text-green-900 dark:text-green-100">{scenario.label}</div>
                  <div className="text-sm text-green-700 dark:text-green-300">+{scenario.return}%</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-green-700 dark:text-green-300">Profit</div>
                    <div className="font-bold text-green-900 dark:text-green-100">
                      ${scenario.profit.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-green-700 dark:text-green-300">Account Growth</div>
                    <div className="font-bold text-green-900 dark:text-green-100">+{scenario.accountGrowth}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Metrics */}
      <div className="card p-6 bg-yellow-50 dark:bg-yellow-900/20">
        <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-4">Risk Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 mb-1">Dollar Risk</div>
            <div className="text-xl font-bold text-yellow-900 dark:text-yellow-100">
              ${dollarRisk.toLocaleString()}
            </div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
              {riskPct}% of ${account.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 mb-1">Risk/Reward (1:X)</div>
            <div className="text-xl font-bold text-yellow-900 dark:text-yellow-100">1:{riskRewardRatio}</div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Based on 25% gain scenario</div>
          </div>
          <div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 mb-1">Portfolio Impact</div>
            <div className="text-xl font-bold text-yellow-900 dark:text-yellow-100">{portfolioAllocation}%</div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Of total account value</div>
          </div>
        </div>

        {parseFloat(portfolioAllocation) > 25 && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-700">
            <div className="flex gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div className="text-sm text-red-800 dark:text-red-200">
                <div className="font-semibold">High Concentration Warning</div>
                <div>
                  This position represents more than 25% of your account. Consider reducing position size to
                  maintain diversification.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delta-Adjusted Position */}
      <div className="card p-6 bg-purple-50 dark:bg-purple-900/20">
        <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-4">
          Delta-Adjusted Exposure
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-purple-700 dark:text-purple-300 mb-1">Shares Equivalent</div>
            <div className="text-xl font-bold text-purple-900 dark:text-purple-100">
              {Math.round(maxContracts * 100 * Math.abs(contract.greeks.delta))} shares
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Based on delta of {contract.greeks.delta.toFixed(3)}
            </div>
          </div>
          <div>
            <div className="text-sm text-purple-700 dark:text-purple-300 mb-1">Notional Value</div>
            <div className="text-xl font-bold text-purple-900 dark:text-purple-100">
              ${(Math.round(maxContracts * 100 * Math.abs(contract.greeks.delta)) * underlyingPrice).toLocaleString()}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              At current stock price ${underlyingPrice.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-purple-700 dark:text-purple-300 mb-1">Leverage Ratio</div>
            <div className="text-xl font-bold text-purple-900 dark:text-purple-100">
              {capitalRequired > 0 ? ((Math.round(maxContracts * 100 * Math.abs(contract.greeks.delta)) * underlyingPrice) / capitalRequired).toFixed(2) : '0'}x
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Options leverage vs stock
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="card p-6">
        <h4 className="font-semibold mb-3">Position Sizing Tips</h4>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex gap-2">
            <span className="text-primary-600 dark:text-primary-400">•</span>
            <span>Most professional traders risk 1-2% of their account per trade</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary-600 dark:text-primary-400">•</span>
            <span>Higher IV options require tighter stop losses due to increased volatility</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary-600 dark:text-primary-400">•</span>
            <span>Consider the delta-adjusted exposure to understand true market exposure</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary-600 dark:text-primary-400">•</span>
            <span>Never allocate more than 20-25% of your portfolio to a single position</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary-600 dark:text-primary-400">•</span>
            <span>Options with high gamma can move quickly - adjust position size accordingly</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
