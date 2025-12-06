import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Lightbulb,
  Sparkles,
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Shield,
  BarChart3,
  Copy,
  Plus,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface AlertSuggestion {
  symbol: string;
  type: 'support' | 'resistance' | 'breakout' | 'breakdown' | 'reversal';
  price: number;
  confidence: number;
  timeframe: string;
  reasoning: string;
  conditions: AlertCondition[];
}

interface AlertCondition {
  type: string;
  operator?: 'AND' | 'OR';
  threshold?: number;
  description: string;
}

interface AlertTemplate {
  id: string;
  name: string;
  description: string;
  conditions: AlertCondition[];
  category: 'momentum' | 'reversal' | 'breakout' | 'value' | 'risk';
}

export default function SmartAlerts() {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'templates'>('suggestions');
  const [searchSymbol, setSearchSymbol] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  // Fetch alert templates
  const { data: templatesData } = useQuery({
    queryKey: ['alert-templates'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/smart-alerts/templates`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    }
  });

  // Fetch suggestions for a symbol
  const { data: suggestionsData, isLoading: loadingSuggestions, refetch: fetchSuggestions } = useQuery({
    queryKey: ['alert-suggestions', selectedSymbol],
    queryFn: async () => {
      if (!selectedSymbol) return null;
      const response = await fetch(`${API_BASE_URL}/api/smart-alerts/suggestions/${selectedSymbol}`);
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      return response.json();
    },
    enabled: !!selectedSymbol
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchSymbol.trim()) {
      setSelectedSymbol(searchSymbol.toUpperCase().trim());
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'support': return <Shield className="w-5 h-5 text-green-600" />;
      case 'resistance': return <Target className="w-5 h-5 text-red-600" />;
      case 'breakout': return <TrendingUp className="w-5 h-5 text-blue-600" />;
      case 'breakdown': return <TrendingDown className="w-5 h-5 text-orange-600" />;
      case 'reversal': return <Activity className="w-5 h-5 text-purple-600" />;
      default: return <Zap className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'support': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'resistance': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'breakout': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'breakdown': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'reversal': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'momentum': return <TrendingUp className="w-5 h-5" />;
      case 'reversal': return <Activity className="w-5 h-5" />;
      case 'breakout': return <Zap className="w-5 h-5" />;
      case 'value': return <BarChart3 className="w-5 h-5" />;
      case 'risk': return <Shield className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary-600" />
          Smart Trade Alerts
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          AI-powered alert suggestions and pre-configured trading templates
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'suggestions'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            AI Suggestions
          </div>
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'templates'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Alert Templates
          </div>
        </button>
      </div>

      {/* AI Suggestions Tab */}
      {activeTab === 'suggestions' && (
        <div className="space-y-6">
          {/* Search */}
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4">Get AI Alert Suggestions</h2>
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchSymbol}
                  onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                  placeholder="Enter stock symbol (e.g., AAPL)"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-lg"
                />
              </div>
              <button type="submit" className="btn btn-primary px-8 flex items-center gap-2">
                <Search className="w-5 h-5" />
                Analyze
              </button>
            </form>
          </div>

          {/* Loading State */}
          {loadingSuggestions && (
            <div className="card p-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Analyzing {selectedSymbol} with AI...</p>
            </div>
          )}

          {/* Suggestions Results */}
          {!loadingSuggestions && suggestionsData?.suggestions && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  Alert Suggestions for {suggestionsData.symbol}
                </h2>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {suggestionsData.suggestions.length} suggestions found
                </span>
              </div>

              {suggestionsData.suggestions.map((suggestion: AlertSuggestion, index: number) => (
                <div key={index} className="card p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(suggestion.type)}
                      <div>
                        <h3 className="text-xl font-bold">${suggestion.price.toFixed(2)}</h3>
                        <span className={`text-sm px-3 py-1 rounded-full ${getTypeColor(suggestion.type)} inline-block mt-1`}>
                          {suggestion.type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Confidence</div>
                      <div className="text-2xl font-bold text-primary-600">{suggestion.confidence}%</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-700 dark:text-gray-300">{suggestion.reasoning}</p>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Suggested Conditions:
                    </div>
                    <div className="space-y-2">
                      {suggestion.conditions.map((condition, condIndex) => (
                        <div key={condIndex} className="flex items-center gap-2 text-sm">
                          {condition.operator && (
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                              {condition.operator}
                            </span>
                          )}
                          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                            {condition.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => {
                        toast.success('Alert created (implementation pending)');
                      }}
                      className="btn btn-primary flex-1"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Alert
                    </button>
                    <button className="btn btn-secondary">
                      View Chart
                    </button>
                  </div>
                </div>
              ))}

              {suggestionsData.suggestions.length === 0 && (
                <div className="card p-12 text-center">
                  <Lightbulb className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No suggestions available</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Unable to generate alert suggestions for {suggestionsData.symbol} at this time.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!selectedSymbol && !loadingSuggestions && (
            <div className="card p-12 text-center">
              <Lightbulb className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Get AI-Powered Alert Suggestions</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Enter a stock symbol to get intelligent alert recommendations based on:
              </p>
              <div className="max-w-md mx-auto text-left space-y-2">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span>Support and resistance levels</span>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-red-600" />
                  <span>Chart pattern targets</span>
                </div>
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <span>Sentiment-based reversals</span>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <span>Moving average crossovers</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-2">Pre-Configured Alert Templates</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Start with proven alert strategies used by professional traders
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templatesData?.templates.map((template: AlertTemplate) => (
              <div key={template.id} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-lg">
                    {getCategoryIcon(template.category)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {template.description}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Conditions:
                  </div>
                  <div className="space-y-2">
                    {template.conditions.map((condition, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {condition.operator && (
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            {condition.operator}
                          </span>
                        )}
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                          {condition.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      toast.success(`Applied "${template.name}" template`);
                    }}
                    className="btn btn-primary flex-1"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
