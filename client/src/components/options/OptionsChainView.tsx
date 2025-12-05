import { useState } from 'react';
import { Calculator } from 'lucide-react';
import type { OptionsChain, OptionContract } from '@/types';
import PositionSizingCalculator from './PositionSizingCalculator';

interface OptionsChainViewProps {
  chain: OptionsChain;
  chains: OptionsChain[];
  onExpirationChange: (expiration: string) => void;
}

export default function OptionsChainView({ chain, chains, onExpirationChange }: OptionsChainViewProps) {
  const [selectedContract, setSelectedContract] = useState<OptionContract | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  // Find ATM strike
  const atmStrike = chain.calls.reduce((prev, curr) =>
    Math.abs(curr.strike - chain.underlyingPrice) < Math.abs(prev.strike - chain.underlyingPrice)
      ? curr
      : prev
  ).strike;

  const handleCalculatePosition = (contract: OptionContract) => {
    setSelectedContract(contract);
    setShowCalculator(true);
  };

  const renderContract = (contract: OptionContract, type: 'call' | 'put') => {
    const isATM = contract.strike === atmStrike;
    const isITM = contract.inTheMoney;

    return (
      <div
        key={contract.symbol}
        className={`grid grid-cols-9 gap-2 p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
          isATM ? 'bg-yellow-50 dark:bg-yellow-900/20 font-semibold' : ''
        } ${isITM ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}
      >
        {/* Bid */}
        <div className="text-right">{contract.bid.toFixed(2)}</div>

        {/* Ask */}
        <div className="text-right">{contract.ask.toFixed(2)}</div>

        {/* Last */}
        <div className="text-right font-semibold">{contract.last.toFixed(2)}</div>

        {/* Volume */}
        <div className="text-right text-gray-600 dark:text-gray-400">
          {contract.volume.toLocaleString()}
        </div>

        {/* OI */}
        <div className="text-right text-gray-600 dark:text-gray-400">
          {contract.openInterest.toLocaleString()}
        </div>

        {/* IV */}
        <div className="text-right">
          {(contract.impliedVolatility * 100).toFixed(1)}%
        </div>

        {/* Delta */}
        <div className={`text-right ${type === 'call' ? 'text-green-600' : 'text-red-600'}`}>
          {contract.greeks.delta.toFixed(3)}
        </div>

        {/* Gamma */}
        <div className="text-right text-gray-600 dark:text-gray-400">
          {contract.greeks.gamma.toFixed(4)}
        </div>

        {/* Calculate Button */}
        <div className="flex justify-center">
          <button
            onClick={() => handleCalculatePosition(contract)}
            className="p-1 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded transition-colors"
            title="Calculate Position Size"
          >
            <Calculator className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Expiration Selector */}
      <div className="card p-6">
        <label className="block text-sm font-semibold mb-2">Select Expiration:</label>
        <div className="flex flex-wrap gap-2">
          {chains.map((c) => (
            <button
              key={c.expiration}
              onClick={() => onExpirationChange(c.expiration)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                c.expiration === chain.expiration
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {new Date(c.expiration).toLocaleDateString()} ({c.daysToExpiration}d)
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400">Underlying Price</div>
            <div className="text-lg font-bold">${chain.underlyingPrice.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400">ATM Strike</div>
            <div className="text-lg font-bold">${atmStrike.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400">Avg IV</div>
            <div className="text-lg font-bold">{(chain.impliedVolatility * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Options Chain */}
      <div className="card p-6">
        <h3 className="text-xl font-bold mb-4">Options Chain</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calls */}
          <div>
            <div className="bg-green-100 dark:bg-green-900/20 px-4 py-2 rounded-t-lg">
              <h4 className="font-bold text-green-900 dark:text-green-200">CALLS</h4>
            </div>
            <div className="border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-lg p-4">
              {/* Header */}
              <div className="grid grid-cols-9 gap-2 p-2 text-xs font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-300 dark:border-gray-600 mb-2">
                <div className="text-right">Bid</div>
                <div className="text-right">Ask</div>
                <div className="text-right">Last</div>
                <div className="text-right">Vol</div>
                <div className="text-right">OI</div>
                <div className="text-right">IV</div>
                <div className="text-right">Delta</div>
                <div className="text-right">Gamma</div>
                <div className="text-center">Calc</div>
              </div>

              {/* Contracts */}
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {chain.calls.map((call) => renderContract(call, 'call'))}
              </div>
            </div>
          </div>

          {/* Puts */}
          <div>
            <div className="bg-red-100 dark:bg-red-900/20 px-4 py-2 rounded-t-lg">
              <h4 className="font-bold text-red-900 dark:text-red-200">PUTS</h4>
            </div>
            <div className="border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-lg p-4">
              {/* Header */}
              <div className="grid grid-cols-9 gap-2 p-2 text-xs font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-300 dark:border-gray-600 mb-2">
                <div className="text-right">Bid</div>
                <div className="text-right">Ask</div>
                <div className="text-right">Last</div>
                <div className="text-right">Vol</div>
                <div className="text-right">OI</div>
                <div className="text-right">IV</div>
                <div className="text-right">Delta</div>
                <div className="text-right">Gamma</div>
                <div className="text-center">Calc</div>
              </div>

              {/* Contracts */}
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {chain.puts.map((put) => renderContract(put, 'put'))}
              </div>
            </div>
          </div>
        </div>

        {/* Greeks Legend */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
            Understanding Greeks:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-800 dark:text-blue-300">
            <div>
              <span className="font-semibold">Delta:</span> Price change per $1 move in underlying
            </div>
            <div>
              <span className="font-semibold">Gamma:</span> Rate of delta change
            </div>
            <div>
              <span className="font-semibold">Theta:</span> Time decay per day (see detailed view)
            </div>
            <div>
              <span className="font-semibold">Vega:</span> Sensitivity to volatility changes
            </div>
          </div>
        </div>
      </div>

      {/* Position Sizing Calculator Modal */}
      {showCalculator && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Position Sizing Calculator</h2>
              <button
                onClick={() => setShowCalculator(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6">
              <PositionSizingCalculator
                contract={selectedContract}
                underlyingPrice={chain.underlyingPrice}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
