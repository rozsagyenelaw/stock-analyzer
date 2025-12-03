import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { journalApi } from '@/services/api';
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function Journal() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [showModal, setShowModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<any>(null);

  const { data: openTrades } = useQuery({
    queryKey: ['trades', 'open'],
    queryFn: () => journalApi.getAll('OPEN'),
  });

  const { data: closedTrades } = useQuery({
    queryKey: ['trades', 'closed'],
    queryFn: () => journalApi.getAll('CLOSED'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => journalApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      toast.success('Trade deleted');
    },
    onError: () => {
      toast.error('Failed to delete trade');
    },
  });

  const handleEdit = (trade: any) => {
    setEditingTrade(trade);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditingTrade(null);
    setShowModal(true);
  };

  const trades = activeTab === 'open' ? openTrades : closedTrades;

  // Calculate statistics for closed trades
  interface Stats {
    totalPnL: number;
    wins: number;
    losses: number;
    totalProfit: number;
    totalLoss: number;
  }

  const stats = closedTrades?.reduce(
    (acc: Stats, trade: any) => {
      const pnl = trade.exit_price
        ? (trade.exit_price - trade.entry_price) * trade.quantity
        : 0;
      const profit = pnl > 0 ? pnl : 0;
      const loss = pnl < 0 ? Math.abs(pnl) : 0;

      return {
        totalPnL: acc.totalPnL + pnl,
        wins: acc.wins + (pnl > 0 ? 1 : 0),
        losses: acc.losses + (pnl < 0 ? 1 : 0),
        totalProfit: acc.totalProfit + profit,
        totalLoss: acc.totalLoss + loss,
      };
    },
    { totalPnL: 0, wins: 0, losses: 0, totalProfit: 0, totalLoss: 0 }
  );

  const winRate = stats && stats.wins + stats.losses > 0
    ? (stats.wins / (stats.wins + stats.losses)) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Trading Journal</h1>
        <button onClick={handleAddNew} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Trade
        </button>
      </div>

      {/* Statistics Cards */}
      {closedTrades && closedTrades.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total P&L</div>
            <div
              className={`text-2xl font-bold ${
                (stats?.totalPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              ${stats?.totalPnL.toFixed(2)}
            </div>
          </div>

          <div className="card p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Win Rate</div>
            <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats?.wins}W / {stats?.losses}L
            </div>
          </div>

          <div className="card p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Wins</div>
            <div className="text-2xl font-bold text-green-600">
              ${stats?.totalProfit.toFixed(2)}
            </div>
          </div>

          <div className="card p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Losses</div>
            <div className="text-2xl font-bold text-red-600">
              ${stats?.totalLoss.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card p-2 flex gap-2">
        <button
          onClick={() => setActiveTab('open')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'open'
              ? 'bg-primary-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          Open Positions ({openTrades?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('closed')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'closed'
              ? 'bg-primary-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          Closed Positions ({closedTrades?.length || 0})
        </button>
      </div>

      {/* Trades Table */}
      {!trades || trades.length === 0 ? (
        <div className="card p-12 text-center">
          <DollarSign className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No {activeTab} trades</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Add a new trade to start tracking your performance
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Entry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Exit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {trades.map((trade: any) => {
                  const pnl = trade.exit_price
                    ? (trade.exit_price - trade.entry_price) * trade.quantity
                    : 0;
                  const pnlPercent = trade.exit_price
                    ? ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100
                    : 0;

                  return (
                    <tr key={trade.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold">{trade.symbol}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(trade.entry_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">${trade.entry_price.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {trade.exit_price ? (
                          <div>
                            <div className="font-medium">${trade.exit_price.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(trade.exit_date).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{trade.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {trade.exit_price ? (
                          <div>
                            <div
                              className={`flex items-center gap-1 font-semibold ${
                                pnl >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {pnl >= 0 ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                              ${Math.abs(pnl).toFixed(2)}
                            </div>
                            <div
                              className={`text-xs ${
                                pnl >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {pnlPercent >= 0 ? '+' : ''}
                              {pnlPercent.toFixed(2)}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                          {trade.notes || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(trade)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(trade.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trade Modal */}
      {showModal && (
        <TradeModal
          trade={editingTrade}
          onClose={() => {
            setShowModal(false);
            setEditingTrade(null);
          }}
        />
      )}
    </div>
  );
}

function TradeModal({ trade, onClose }: { trade: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    symbol: trade?.symbol || '',
    entry_price: trade?.entry_price || '',
    exit_price: trade?.exit_price || '',
    quantity: trade?.quantity || '',
    entry_date: trade?.entry_date || new Date().toISOString().split('T')[0],
    exit_date: trade?.exit_date || '',
    notes: trade?.notes || '',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => journalApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      toast.success('Trade added');
      onClose();
    },
    onError: () => {
      toast.error('Failed to add trade');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => journalApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      toast.success('Trade updated');
      onClose();
    },
    onError: () => {
      toast.error('Failed to update trade');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      entry_price: parseFloat(formData.entry_price),
      exit_price: formData.exit_price ? parseFloat(formData.exit_price) : null,
      quantity: parseInt(formData.quantity),
    };

    if (trade) {
      updateMutation.mutate({ id: trade.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="card p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">{trade ? 'Edit Trade' : 'New Trade'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Symbol</label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Entry Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.entry_price}
                onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Exit Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.exit_price}
                onChange={(e) => setFormData({ ...formData, exit_price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Entry Date</label>
              <input
                type="date"
                value={formData.entry_date}
                onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Exit Date</label>
              <input
                type="date"
                value={formData.exit_date}
                onChange={(e) => setFormData({ ...formData, exit_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" className="btn btn-primary flex-1">
              {trade ? 'Update' : 'Add'} Trade
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
