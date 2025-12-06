import { useState } from 'react';
import {
  Plus,
  Trash2,
  TrendingUp,
  Target,
  DollarSign,
  BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Trade {
  id: string;
  symbol: string;
  name?: string;
  type: 'stock' | 'option';
  strategy: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  potentialGain: number;
  potentialLoss: number;
  riskReward: number;
  capitalRequired: number;
  timeframe: string;
  urgency?: 'high' | 'medium' | 'low';
}

export default function TradeComparison() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [newTrade, setNewTrade] = useState<Partial<Trade>>({
    symbol: '',
    type: 'stock',
    strategy: '',
    entryPrice: 0,
    targetPrice: 0,
    stopLoss: 0,
    capitalRequired: 0,
    timeframe: 'swing',
    urgency: 'medium'
  });

  const handleAddTrade = () => {
    if (!newTrade.symbol || !newTrade.strategy || !newTrade.entryPrice || !newTrade.targetPrice || !newTrade.stopLoss || !newTrade.capitalRequired) {
      toast.error('Please fill in all required fields');
      return;
    }

    const potentialGain = ((newTrade.targetPrice! - newTrade.entryPrice!) / newTrade.entryPrice!) * 100;
    const potentialLoss = ((newTrade.entryPrice! - newTrade.stopLoss!) / newTrade.entryPrice!) * 100;
    const riskReward = Math.abs(potentialGain / potentialLoss);

    const trade: Trade = {
      id: `${newTrade.symbol}-${Date.now()}`,
      symbol: newTrade.symbol!,
      type: newTrade.type!,
      strategy: newTrade.strategy!,
      entryPrice: newTrade.entryPrice!,
      targetPrice: newTrade.targetPrice!,
      stopLoss: newTrade.stopLoss!,
      capitalRequired: newTrade.capitalRequired!,
      timeframe: newTrade.timeframe!,
      urgency: newTrade.urgency,
      potentialGain,
      potentialLoss,
      riskReward
    };

    setTrades([...trades, trade]);
    setNewTrade({
      symbol: '',
      type: 'stock',
      strategy: '',
      entryPrice: 0,
      targetPrice: 0,
      stopLoss: 0,
      capitalRequired: 0,
      timeframe: 'swing',
      urgency: 'medium'
    });
    toast.success('Trade added');
  };

  const handleRemoveTrade = (id: string) => {
    setTrades(trades.filter(t => t.id !== id));
  };

  const handleCompare = async () => {
    if (trades.length < 2) {
      toast.error('Add at least 2 trades to compare');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trade-comparison`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trades })
      });

      if (!response.ok) throw new Error('Comparison failed');

      const data = await response.json();
      setComparison(data);
      toast.success('Comparison complete');
    } catch (error: any) {
      toast.error(error.message || 'Failed to compare trades');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-primary-600" />
          Side-by-Side Trade Comparison
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Compare multiple trades to find the best opportunity
        </p>
      </div>

      {/* Add Trade Form */}
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Add Trade</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Symbol (e.g., AAPL)"
            value={newTrade.symbol}
            onChange={(e) => setNewTrade({ ...newTrade, symbol: e.target.value.toUpperCase() })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
          <input
            type="text"
            placeholder="Strategy"
            value={newTrade.strategy}
            onChange={(e) => setNewTrade({ ...newTrade, strategy: e.target.value })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
          <select
            value={newTrade.type}
            onChange={(e) => setNewTrade({ ...newTrade, type: e.target.value as 'stock' | 'option' })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          >
            <option value="stock">Stock</option>
            <option value="option">Option</option>
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Entry Price"
            value={newTrade.entryPrice || ''}
            onChange={(e) => setNewTrade({ ...newTrade, entryPrice: parseFloat(e.target.value) })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Target Price"
            value={newTrade.targetPrice || ''}
            onChange={(e) => setNewTrade({ ...newTrade, targetPrice: parseFloat(e.target.value) })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Stop Loss"
            value={newTrade.stopLoss || ''}
            onChange={(e) => setNewTrade({ ...newTrade, stopLoss: parseFloat(e.target.value) })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
          <input
            type="number"
            placeholder="Capital Required"
            value={newTrade.capitalRequired || ''}
            onChange={(e) => setNewTrade({ ...newTrade, capitalRequired: parseFloat(e.target.value) })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
          <input
            type="text"
            placeholder="Timeframe"
            value={newTrade.timeframe}
            onChange={(e) => setNewTrade({ ...newTrade, timeframe: e.target.value })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
          <select
            value={newTrade.urgency}
            onChange={(e) => setNewTrade({ ...newTrade, urgency: e.target.value as 'high' | 'medium' | 'low' })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          >
            <option value="low">Low Urgency</option>
            <option value="medium">Medium Urgency</option>
            <option value="high">High Urgency</option>
          </select>
        </div>
        <button onClick={handleAddTrade} className="btn btn-primary mt-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Trade
        </button>
      </div>

      {/* Current Trades */}
      {trades.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4">Trades to Compare ({trades.length})</h2>
          <div className="space-y-3">
            {trades.map((trade) => (
              <div key={trade.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <div className="font-bold text-lg">{trade.symbol} - {trade.strategy}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Entry: ${trade.entryPrice.toFixed(2)} → Target: ${trade.targetPrice.toFixed(2)} |
                    R/R: {trade.riskReward.toFixed(2)}:1 | Capital: ${trade.capitalRequired.toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveTrade(trade.id)}
                  className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleCompare}
            disabled={loading || trades.length < 2}
            className="btn btn-primary mt-4 w-full"
          >
            {loading ? 'Comparing...' : 'Compare Trades'}
          </button>
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-2xl font-bold mb-4">AI Analysis</h2>
            <div className="space-y-4">
              <div>
                <div className="font-medium text-gray-600 dark:text-gray-400">Summary</div>
                <p className="text-gray-900 dark:text-gray-100">{comparison.aiAnalysis.summary}</p>
              </div>
              <div>
                <div className="font-medium text-green-600">Recommendation</div>
                <p className="text-gray-900 dark:text-gray-100">{comparison.aiAnalysis.recommendation}</p>
              </div>
              <div>
                <div className="font-medium text-gray-600 dark:text-gray-400">Reasoning</div>
                <p className="text-gray-900 dark:text-gray-100">{comparison.aiAnalysis.reasoning}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-2xl font-bold mb-4">Rankings</h2>
            <div className="space-y-4">
              {comparison.ranking.map((rank: any) => (
                <div key={rank.tradeId} className={`p-4 rounded-lg ${rank.rank === 1 ? 'bg-green-50 dark:bg-green-900 border-2 border-green-600' : 'bg-gray-50 dark:bg-gray-800'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-bold">#{rank.rank}</div>
                      <div>
                        <div className="font-bold text-lg">{rank.symbol}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Score: {rank.totalScore}/100</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="font-medium text-green-600 mb-1">Strengths:</div>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {rank.strengths.map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  {rank.weaknesses.length > 0 && (
                    <div className="mt-3">
                      <div className="font-medium text-red-600 mb-1">Weaknesses:</div>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {rank.weaknesses.map((w: string, i: number) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-2xl font-bold mb-4">Score Matrix</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4">Symbol</th>
                    <th className="text-center py-3 px-4">R/R</th>
                    <th className="text-center py-3 px-4">Capital Efficiency</th>
                    <th className="text-center py-3 px-4">Technical</th>
                    <th className="text-center py-3 px-4">Timing</th>
                    <th className="text-center py-3 px-4">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.scoreMatrix.map((item: any) => (
                    <tr key={item.tradeId} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-3 px-4 font-bold">{item.symbol}</td>
                      <td className="text-center py-3 px-4">{item.scores.riskReward}</td>
                      <td className="text-center py-3 px-4">{item.scores.capitalEfficiency}</td>
                      <td className="text-center py-3 px-4">{item.scores.technicalSetup}</td>
                      <td className="text-center py-3 px-4">{item.scores.timing}</td>
                      <td className="text-center py-3 px-4 font-bold">{item.scores.overall}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
