import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { TrendingUp, RefreshCw, Sparkles, Plus, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface DiscoveryScan {
  id: string;
  scan_name: string;
  scan_type: string;
  description: string;
  is_active: boolean;
}

interface ScanResult {
  id: string;
  symbol: string;
  score: number;
  rank: number;
  data: any;
  ai_analysis?: string;
  ai_risks?: string;
  ai_entry_exit?: string;
  scanned_at: string;
}

export default function Discover() {
  const [selectedScan, setSelectedScan] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch all scans
  const { data: scans = [] } = useQuery({
    queryKey: ['discovery-scans'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/discovery/scans`);
      return response.data;
    },
  });

  // Fetch scan results
  const { data: scanResults, isLoading: resultsLoading } = useQuery({
    queryKey: ['scan-results', selectedScan],
    queryFn: async () => {
      if (!selectedScan) return null;
      const response = await axios.get(`${API_BASE_URL}/api/discovery/scan/${selectedScan}/results`);
      return response.data;
    },
    enabled: !!selectedScan,
  });

  // Run scan mutation
  const runScanMutation = useMutation({
    mutationFn: async ({ scanId, useAI }: { scanId: string; useAI: boolean }) => {
      const response = await axios.post(`${API_BASE_URL}/api/discovery/scan/${scanId}/run`, {
        useAI,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scan-results', variables.scanId] });
      if (data.cached) {
        toast.success(`Using cached results (${data.age_minutes} min old)`);
      } else {
        toast.success(`Found ${data.count} opportunities!`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to run scan');
    },
  });

  // Add to watchlist mutation
  const addToWatchlistMutation = useMutation({
    mutationFn: async ({ symbol, name }: { symbol: string; name: string }) => {
      await axios.post(`${API_BASE_URL}/api/watchlist`, { symbol, name });
    },
    onSuccess: (_, { symbol }) => {
      toast.success(`${symbol} added to watchlist!`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add to watchlist');
    },
  });

  const handleRunScan = (scanId: string, useAI: boolean = false) => {
    setSelectedScan(scanId);
    runScanMutation.mutate({ scanId, useAI });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 bg-green-900/30';
    if (score >= 60) return 'text-yellow-400 bg-yellow-900/30';
    return 'text-orange-400 bg-orange-900/30';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-yellow-400" />
          <h1 className="text-3xl font-bold text-white">Stock Discovery</h1>
        </div>
        <p className="text-gray-400">AI-powered opportunity scanner finds buying opportunities automatically</p>
      </div>

      {/* Scan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {scans.map((scan: DiscoveryScan) => (
          <div
            key={scan.id}
            className={`bg-gray-800 rounded-lg p-6 border-2 transition-all cursor-pointer ${
              selectedScan === scan.id
                ? 'border-blue-500 ring-2 ring-blue-500/50'
                : 'border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => setSelectedScan(scan.id)}
          >
            <h3 className="text-lg font-bold text-white mb-2">{scan.scan_name}</h3>
            <p className="text-sm text-gray-400 mb-4 line-clamp-2">{scan.description}</p>

            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRunScan(scan.id, false);
                }}
                disabled={runScanMutation.isPending}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${runScanMutation.isPending ? 'animate-spin' : ''}`} />
                Scan
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRunScan(scan.id, true);
                }}
                disabled={runScanMutation.isPending}
                className="px-3 py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                title="Run with AI analysis (top 5)"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Results Section */}
      {selectedScan && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {scans.find((s: DiscoveryScan) => s.id === selectedScan)?.scan_name} Results
            </h2>
            {scanResults && (
              <div className="text-sm text-gray-400">
                {scanResults.count} opportunities found
              </div>
            )}
          </div>

          {resultsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-4 text-gray-400">Loading results...</span>
            </div>
          )}

          {!resultsLoading && scanResults?.results?.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No opportunities found for this scan</p>
              <button
                onClick={() => handleRunScan(selectedScan, false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Run Scan
              </button>
            </div>
          )}

          {scanResults?.results && scanResults.results.length > 0 && (
            <div className="space-y-4">
              {scanResults.results.map((result: ScanResult) => (
                <div key={result.id} className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-white">{result.symbol}</span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(result.score)}`}>
                            Score: {result.score.toFixed(0)}
                          </span>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300">
                            #{result.rank}
                          </span>
                        </div>
                        {result.data && (
                          <div className="flex gap-4 mt-2 text-sm text-gray-400">
                            <span>Price: ${result.data.price?.toFixed(2)}</span>
                            <span>RSI: {result.data.rsi?.toFixed(1)}</span>
                            {result.data.pe && <span>P/E: {result.data.pe.toFixed(1)}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => addToWatchlistMutation.mutate({ symbol: result.symbol, name: result.symbol })}
                      className="px-3 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Watchlist
                    </button>
                  </div>

                  {/* AI Analysis */}
                  {result.ai_analysis && (
                    <div className="space-y-3">
                      <div className="bg-blue-900/20 border border-blue-700 rounded p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-semibold text-blue-400">AI Analysis</span>
                        </div>
                        <p className="text-sm text-gray-300">{result.ai_analysis}</p>
                      </div>

                      {result.ai_risks && (
                        <div className="bg-red-900/20 border border-red-700 rounded p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-sm font-semibold text-red-400">Risks</span>
                          </div>
                          <p className="text-sm text-gray-300">{result.ai_risks}</p>
                        </div>
                      )}

                      {result.ai_entry_exit && (
                        <div className="bg-green-900/20 border border-green-700 rounded p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-green-400" />
                            <span className="text-sm font-semibold text-green-400">Entry/Exit Strategy</span>
                          </div>
                          <p className="text-sm text-gray-300">{result.ai_entry_exit}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-3">How to Use</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li>• <strong>Click a scan card</strong> to select a strategy</li>
          <li>• <strong>Scan button</strong>: Run the scan on top 50 stocks (fast)</li>
          <li>• <strong>✨ button</strong>: Run with AI analysis for top 5 results (uses OpenAI)</li>
          <li>• Results are <strong>cached for 1 hour</strong> to save API calls</li>
          <li>• <strong>Add to Watchlist</strong> for any opportunity you want to monitor</li>
          <li>• Scans run on S&P 500 stocks with live market data</li>
        </ul>
      </div>
    </div>
  );
}
