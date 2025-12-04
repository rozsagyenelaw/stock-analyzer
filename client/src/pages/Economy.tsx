import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { EconomicEvent, SectorPerformance, MarketRegimeData, RotationSignal } from '@/types';
import { Calendar, TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Economy() {
  const [selectedTab, setSelectedTab] = useState<'calendar' | 'sectors' | 'rotation'>('calendar');

  const { data: calendarEvents = [] } = useQuery({
    queryKey: ['economic-calendar'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/economy/calendar`);
      return response.data;
    },
  });

  const { data: sectors = [] } = useQuery({
    queryKey: ['sectors'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/economy/sectors`);
      return response.data;
    },
  });

  const { data: rotation } = useQuery({
    queryKey: ['sector-rotation'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/economy/rotation`);
      return response.data;
    },
  });

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'HIGH':
        return 'bg-red-900 text-red-300';
      case 'MEDIUM':
        return 'bg-yellow-900 text-yellow-300';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'BULL':
        return 'text-green-400';
      case 'BEAR':
        return 'text-red-400';
      case 'VOLATILE':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };

  const getRotationColor = (signal?: RotationSignal) => {
    switch (signal) {
      case 'ROTATE_IN':
        return 'text-green-400';
      case 'ROTATE_OUT':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Economic Calendar & Macro Analysis</h1>
        <p className="text-gray-400">Track economic events and sector rotation opportunities</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700 mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => setSelectedTab('calendar')}
            className={`py-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
              selectedTab === 'calendar'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="w-5 h-5" />
            Economic Calendar ({calendarEvents.length})
          </button>
          <button
            onClick={() => setSelectedTab('sectors')}
            className={`py-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
              selectedTab === 'sectors'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Activity className="w-5 h-5" />
            Sector Performance
          </button>
          <button
            onClick={() => setSelectedTab('rotation')}
            className={`py-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
              selectedTab === 'rotation'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            Sector Rotation
          </button>
        </div>
      </div>

      {/* Calendar Tab */}
      {selectedTab === 'calendar' && (
        <div className="space-y-4">
          {calendarEvents.map((event: EconomicEvent) => (
            <div key={event.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{event.event_name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getImpactColor(event.impact)}`}>
                      {event.impact}
                    </span>
                  </div>
                  {event.description && (
                    <p className="text-gray-400 text-sm mb-2">{event.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{new Date(event.event_date).toLocaleDateString()}</span>
                    {event.event_time && (
                      <>
                        <span>•</span>
                        <span>{event.event_time}</span>
                      </>
                    )}
                    <span>•</span>
                    <span className="text-blue-400">{event.country}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {calendarEvents.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No economic events scheduled. Check back later!
            </div>
          )}
        </div>
      )}

      {/* Sectors Tab */}
      {selectedTab === 'sectors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectors.slice(0, 20).map((sector: SectorPerformance) => (
            <div key={sector.id} className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">{sector.sector}</h3>
                <div className={`flex items-center gap-1 ${sector.price_change_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {sector.price_change_percent >= 0 ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <TrendingDown className="w-5 h-5" />
                  )}
                  <span className="font-bold">
                    {sector.price_change_percent >= 0 ? '+' : ''}
                    {sector.price_change_percent.toFixed(2)}%
                  </span>
                </div>
              </div>

              {sector.momentum_score !== undefined && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-400">Momentum</span>
                    <span className="text-white font-medium">{sector.momentum_score.toFixed(0)}/100</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${sector.momentum_score > 70 ? 'bg-green-500' : sector.momentum_score < 30 ? 'bg-red-500' : 'bg-yellow-500'}`}
                      style={{ width: `${sector.momentum_score}%` }}
                    />
                  </div>
                </div>
              )}

              {sector.rotation_signal && (
                <div className={`text-sm font-medium ${getRotationColor(sector.rotation_signal)}`}>
                  {sector.rotation_signal === 'ROTATE_IN' && '↗ Rotate In'}
                  {sector.rotation_signal === 'ROTATE_OUT' && '↘ Rotate Out'}
                  {sector.rotation_signal === 'HOLD' && '→ Hold'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rotation Tab */}
      {selectedTab === 'rotation' && rotation && (
        <div className="space-y-6">
          {/* Market Regime */}
          {rotation.market_regime && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Current Market Regime</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-gray-400 text-sm mb-1">Regime</div>
                  <div className={`text-2xl font-bold ${getRegimeColor(rotation.market_regime.regime)}`}>
                    {rotation.market_regime.regime}
                  </div>
                </div>
                {rotation.market_regime.volatility_index && (
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Volatility</div>
                    <div className="text-2xl font-bold text-white">
                      {rotation.market_regime.volatility_index.toFixed(1)}
                    </div>
                  </div>
                )}
                {rotation.market_regime.risk_on_score && (
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Risk-On Score</div>
                    <div className="text-2xl font-bold text-white">
                      {rotation.market_regime.risk_on_score.toFixed(0)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rotation Opportunities */}
          {rotation.rotation_opportunities && rotation.rotation_opportunities.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
                <h3 className="text-xl font-bold text-white">Rotation Opportunities</h3>
              </div>
              <div className="space-y-3">
                {rotation.rotation_opportunities.map((opp: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                    <div>
                      <div className="font-semibold text-white">{opp.sector}</div>
                      <div className="text-sm text-gray-400">{opp.reason}</div>
                    </div>
                    <div className={`font-bold ${getRotationColor(opp.signal)}`}>
                      {opp.signal === 'ROTATE_IN' && '↗ Rotate In'}
                      {opp.signal === 'ROTATE_OUT' && '↘ Rotate Out'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
