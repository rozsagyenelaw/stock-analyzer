import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '@/services/api';
import { Plus, Trash2, Bell, BellOff, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function Alerts() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsApi.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => alertsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert deleted');
    },
    onError: () => {
      toast.error('Failed to delete alert');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      alertsApi.toggle(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert updated');
    },
    onError: () => {
      toast.error('Failed to update alert');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Price Alerts</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Get notified when stocks hit your target prices
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Alert
        </button>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Alerts</div>
          <div className="text-2xl font-bold">{alerts?.length || 0}</div>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active</div>
          <div className="text-2xl font-bold text-green-600">
            {alerts?.filter((a) => a.enabled).length || 0}
          </div>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Inactive</div>
          <div className="text-2xl font-bold text-gray-500">
            {alerts?.filter((a) => !a.enabled).length || 0}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      {!alerts || alerts.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No alerts set</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create price alerts to get notified when stocks reach your target prices
          </p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            Create Your First Alert
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`card p-6 ${
                alert.enabled ? 'border-l-4 border-primary-600' : 'opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">{alert.symbol}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        alert.condition === 'PRICE_ABOVE'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {alert.condition === 'PRICE_ABOVE' ? (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          Above
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <TrendingDown className="w-4 h-4" />
                          Below
                        </span>
                      )}
                    </span>
                    {alert.triggered && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        Triggered
                      </span>
                    )}
                  </div>

                  <div className="text-2xl font-bold mb-2">
                    ${alert.threshold?.toFixed(2) || 'N/A'}
                  </div>

                  <div className="text-xs text-gray-500">
                    Created {new Date(alert.created_at).toLocaleDateString()}
                    {alert.triggered_at && (
                      <span> • Triggered {new Date(alert.triggered_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      toggleMutation.mutate({ id: alert.id, enabled: !alert.enabled })
                    }
                    className={`p-2 rounded-lg transition-colors ${
                      alert.enabled
                        ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900'
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    title={alert.enabled ? 'Disable alert' : 'Enable alert'}
                  >
                    {alert.enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(alert.id)}
                    className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                    title="Delete alert"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Alert Modal */}
      {showModal && <AlertModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

function AlertModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    symbol: '',
    condition: 'PRICE_ABOVE' as 'PRICE_ABOVE' | 'PRICE_BELOW',
    threshold: '',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => alertsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert created');
      onClose();
    },
    onError: () => {
      toast.error('Failed to create alert');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      symbol: formData.symbol,
      condition: formData.condition,
      threshold: parseFloat(formData.threshold),
      enabled: true,
    };

    createMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="card p-6 max-w-lg w-full mx-4">
        <h2 className="text-2xl font-bold mb-6">Create Price Alert</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Stock Symbol</label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) =>
                setFormData({ ...formData, symbol: e.target.value.toUpperCase() })
              }
              required
              placeholder="e.g., AAPL"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Condition</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, condition: 'PRICE_ABOVE' })}
                className={`py-3 px-4 rounded-lg border-2 transition-colors ${
                  formData.condition === 'PRICE_ABOVE'
                    ? 'border-green-600 bg-green-50 dark:bg-green-900 text-green-900 dark:text-green-100'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-medium">Above</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, condition: 'PRICE_BELOW' })}
                className={`py-3 px-4 rounded-lg border-2 transition-colors ${
                  formData.condition === 'PRICE_BELOW'
                    ? 'border-red-600 bg-red-50 dark:bg-red-900 text-red-900 dark:text-red-100'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  <span className="font-medium">Below</span>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Target Price</label>
            <input
              type="number"
              step="0.01"
              value={formData.threshold}
              onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
              required
              placeholder="e.g., 150.00"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" className="btn btn-primary flex-1">
              Create Alert
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
