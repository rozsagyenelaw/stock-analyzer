/**
 * Greeks Monitor Page
 *
 * Displays AI-powered options Greeks monitor and explainer
 */

import { useState } from 'react';
import { Search } from 'lucide-react';
import GreeksMonitorCard from '@/components/ai/GreeksMonitorCard';

export default function GreeksMonitor() {
  const [symbol, setSymbol] = useState('AAPL');
  const [currentSymbol, setCurrentSymbol] = useState('AAPL');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentSymbol(symbol.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Options Greeks Monitor</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor and understand options Greeks with AI-powered plain English explanations and actionable alerts
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
            Monitor
          </button>
        </form>
      </div>

      <GreeksMonitorCard symbol={currentSymbol} />
    </div>
  );
}
