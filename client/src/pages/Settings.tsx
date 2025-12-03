import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/services/api';
import { Save, Mail, Sliders } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function Settings() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');

  const [indicatorWeights, setIndicatorWeights] = useState({
    rsi: 1.0,
    macd: 1.0,
    movingAverages: 1.0,
    bollingerBands: 1.0,
    stochastic: 1.0,
    obv: 1.0,
    volume: 1.0,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  useEffect(() => {
    if (settings) {
      setEmail(settings.email || '');
      if (settings.indicatorWeights) {
        setIndicatorWeights(settings.indicatorWeights);
      }
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved successfully');
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ email });
  };

  const handleSaveIndicators = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ indicatorWeights });
  };

  const handleResetWeights = () => {
    const resetWeights = {
      rsi: 1.0,
      macd: 1.0,
      movingAverages: 1.0,
      bollingerBands: 1.0,
      stochastic: 1.0,
      obv: 1.0,
      volume: 1.0,
    };
    setIndicatorWeights(resetWeights);
    updateMutation.mutate({ indicatorWeights: resetWeights });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure email alerts and customize indicator weights
        </p>
      </div>

      {/* Email Settings */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold">Email Notifications</h2>
        </div>

        <form onSubmit={handleSaveEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Your Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
            <p className="text-xs text-gray-500 mt-1">
              Email address where you'll receive price alerts
            </p>
          </div>

          <button type="submit" className="btn btn-primary flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save Email Settings
          </button>
        </form>
      </div>

      {/* Indicator Weights */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Sliders className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-bold">Indicator Weights</h2>
          </div>
          <button onClick={handleResetWeights} className="btn btn-secondary text-sm">
            Reset to Default
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Adjust the importance of each technical indicator in the composite analysis. Higher
          weights give more influence to the indicator.
        </p>

        <form onSubmit={handleSaveIndicators} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(indicatorWeights).map(([key, value]) => {
              const label = key
                .replace(/_weight$/, '')
                .replace(/_/g, ' ')
                .toUpperCase();

              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">{label}</label>
                    <span className="text-sm font-semibold text-primary-600">{value.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={value}
                    onChange={(e) =>
                      setIndicatorWeights({
                        ...indicatorWeights,
                        [key]: parseFloat(e.target.value),
                      })
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.0</span>
                    <span>1.0</span>
                    <span>2.0</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button type="submit" className="btn btn-primary flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save Indicator Weights
          </button>
        </form>
      </div>

      {/* Info Card */}
      <div className="card p-6 bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-600">
        <h3 className="font-semibold mb-2">About Indicator Weights</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          The composite score is calculated by combining all technical indicators weighted by these
          values. A weight of 0 disables the indicator, 1.0 is normal importance, and 2.0 doubles
          its influence. Adjust these based on your trading strategy and which indicators you trust
          most.
        </p>
      </div>
    </div>
  );
}
