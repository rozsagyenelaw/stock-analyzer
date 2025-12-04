/**
 * Earnings Analyzer Page
 *
 * Displays AI-powered earnings event analyzer
 */

import { useState } from 'react';
import { Search } from 'lucide-react';
import EarningsAnalyzerCard from '@/components/ai/EarningsAnalyzerCard';

export default function EarningsAnalyzer() {
  const [symbol, setSymbol] = useState('AAPL');
  const [currentSymbol, setCurrentSymbol] = useState('AAPL');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentSymbol(symbol.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Earnings Event Analyzer</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Analyze earnings events for options trading opportunities with IV crush and expected move calculations
        </p>
      </div>

      {/* Symbol Search */}
      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Enter stock symbol (e.g., AAPL)"
              className="input w-full"
            />
          </div>
          <button type="submit" className="btn btn-primary flex items-center gap-2">
            <Search className="w-4 h-4" />
            Analyze
          </button>
        </form>
      </div>

      <EarningsAnalyzerCard symbol={currentSymbol} />
    </div>
  );
}
