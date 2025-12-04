import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { screenerApi } from '@/services/api';
import { ScreenerScan, ScreenerResult, ScreenerFilter } from '@/types';
import { Search, Play, Save, Trash2, Plus, X, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function Screener() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedScan, setSelectedScan] = useState<ScreenerScan | null>(null);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [customFilters, setCustomFilters] = useState<ScreenerFilter[]>([]);
  const [scanName, setScanName] = useState('');
  const [scanDescription, setScanDescription] = useState('');
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [sortField, setSortField] = useState<keyof ScreenerResult>('changePercent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { data: prebuiltScans = [] } = useQuery({
    queryKey: ['prebuilt-scans'],
    queryFn: screenerApi.getPrebuiltScans,
  });

  const { data: customScans = [], refetch: refetchCustomScans } = useQuery({
    queryKey: ['custom-scans'],
    queryFn: screenerApi.getCustomScans,
  });

  const saveCustomScanMutation = useMutation({
    mutationFn: screenerApi.saveCustomScan,
    onSuccess: () => {
      toast.success('Scan saved successfully');
      refetchCustomScans();
      setScanName('');
      setScanDescription('');
      setShowCustomBuilder(false);
    },
    onError: () => {
      toast.error('Failed to save scan');
    },
  });

  const deleteCustomScanMutation = useMutation({
    mutationFn: screenerApi.deleteCustomScan,
    onSuccess: () => {
      toast.success('Scan deleted');
      refetchCustomScans();
    },
    onError: () => {
      toast.error('Failed to delete scan');
    },
  });

  const handleRunScan = async (scan: ScreenerScan) => {
    setIsRunning(true);
    setSelectedScan(scan);

    try {
      const scanResults = await screenerApi.runScan(scan.filters);
      setResults(scanResults);
      toast.success(`Found ${scanResults.length} stocks`);
    } catch (error) {
      toast.error('Failed to run scan');
    } finally {
      setIsRunning(false);
    }
  };

  const handleAddFilter = () => {
    setCustomFilters([
      ...customFilters,
      { field: 'price', operator: 'gt', value: 0 }
    ]);
  };

  const handleRemoveFilter = (index: number) => {
    setCustomFilters(customFilters.filter((_, i) => i !== index));
  };

  const handleUpdateFilter = (index: number, updates: Partial<ScreenerFilter>) => {
    const updated = [...customFilters];
    updated[index] = { ...updated[index], ...updates };
    setCustomFilters(updated);
  };

  const handleSaveCustomScan = () => {
    if (!scanName.trim()) {
      toast.error('Please enter a scan name');
      return;
    }

    if (customFilters.length === 0) {
      toast.error('Please add at least one filter');
      return;
    }

    saveCustomScanMutation.mutate({
      name: scanName,
      description: scanDescription,
      filters: customFilters,
    });
  };

  const handleSort = (field: keyof ScreenerResult) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    const aVal = a[sortField] ?? 0;
    const bVal = b[sortField] ?? 0;

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const filterFields = [
    { value: 'price', label: 'Price' },
    { value: 'changePercent', label: 'Change %' },
    { value: 'volume', label: 'Volume' },
    { value: 'rsi', label: 'RSI' },
    { value: 'macd', label: 'MACD' },
    { value: 'sma20', label: 'SMA(20)' },
    { value: 'sma50', label: 'SMA(50)' },
    { value: 'sma200', label: 'SMA(200)' },
    { value: 'volumeRatio', label: 'Volume Ratio' },
    { value: 'peRatio', label: 'P/E Ratio' },
  ];

  const operators = [
    { value: 'gt', label: '>' },
    { value: 'gte', label: '≥' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '≤' },
    { value: 'eq', label: '=' },
    { value: 'between', label: 'Between' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock Screener</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Find trading opportunities with pre-built or custom scans
          </p>
        </div>

        <button
          onClick={() => setShowCustomBuilder(!showCustomBuilder)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Custom Scan
        </button>
      </div>

      {/* Custom Scan Builder */}
      {showCustomBuilder && (
        <div className="card p-6 border-2 border-primary-500">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Build Custom Scan</h2>
            <button
              onClick={() => {
                setShowCustomBuilder(false);
                setCustomFilters([]);
                setScanName('');
                setScanDescription('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Scan Name *</label>
              <input
                type="text"
                value={scanName}
                onChange={(e) => setScanName(e.target.value)}
                placeholder="My Custom Scan"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <input
                type="text"
                value={scanDescription}
                onChange={(e) => setScanDescription(e.target.value)}
                placeholder="Describe what this scan looks for..."
                className="input"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Filters</label>
                <button
                  onClick={handleAddFilter}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Filter
                </button>
              </div>

              <div className="space-y-2">
                {customFilters.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Filter className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No filters added yet. Click "Add Filter" to get started.</p>
                  </div>
                )}

                {customFilters.map((filter, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <select
                      value={filter.field}
                      onChange={(e) => handleUpdateFilter(index, { field: e.target.value })}
                      className="input flex-1"
                    >
                      {filterFields.map(field => (
                        <option key={field.value} value={field.value}>{field.label}</option>
                      ))}
                    </select>

                    <select
                      value={filter.operator}
                      onChange={(e) => handleUpdateFilter(index, { operator: e.target.value as any })}
                      className="input w-24"
                    >
                      {operators.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>

                    {filter.operator === 'between' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={Array.isArray(filter.value) ? filter.value[0] : 0}
                          onChange={(e) => handleUpdateFilter(index, {
                            value: [parseFloat(e.target.value), Array.isArray(filter.value) ? filter.value[1] : 0]
                          })}
                          className="input w-24"
                          step="0.01"
                        />
                        <span>and</span>
                        <input
                          type="number"
                          value={Array.isArray(filter.value) ? filter.value[1] : 0}
                          onChange={(e) => handleUpdateFilter(index, {
                            value: [Array.isArray(filter.value) ? filter.value[0] : 0, parseFloat(e.target.value)]
                          })}
                          className="input w-24"
                          step="0.01"
                        />
                      </div>
                    ) : (
                      <input
                        type="number"
                        value={Array.isArray(filter.value) ? filter.value[0] : filter.value}
                        onChange={(e) => handleUpdateFilter(index, { value: parseFloat(e.target.value) })}
                        className="input w-32"
                        step="0.01"
                      />
                    )}

                    <button
                      onClick={() => handleRemoveFilter(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveCustomScan}
                className="btn btn-primary flex items-center gap-2"
                disabled={saveCustomScanMutation.isPending}
              >
                <Save className="w-5 h-5" />
                {saveCustomScanMutation.isPending ? 'Saving...' : 'Save Scan'}
              </button>

              {customFilters.length > 0 && (
                <button
                  onClick={() => handleRunScan({ name: 'Custom Scan', filters: customFilters })}
                  className="btn btn-secondary flex items-center gap-2"
                  disabled={isRunning}
                >
                  <Play className="w-5 h-5" />
                  {isRunning ? 'Running...' : 'Run Scan'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pre-built Scans */}
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Pre-built Scans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prebuiltScans.map((scan: ScreenerScan) => (
            <div
              key={scan.id}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                selectedScan?.id === scan.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
              }`}
              onClick={() => setSelectedScan(scan)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">{scan.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRunScan(scan);
                  }}
                  className="p-1 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded"
                  disabled={isRunning}
                >
                  <Play className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{scan.description}</p>
              <div className="mt-2 text-xs text-gray-500">
                {scan.filters.length} filter{scan.filters.length !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Scans */}
      {customScans.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4">My Custom Scans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customScans.map((scan: ScreenerScan) => (
              <div
                key={scan.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedScan?.id === scan.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                }`}
                onClick={() => setSelectedScan(scan)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{scan.name}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunScan(scan);
                      }}
                      className="p-1 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded"
                      disabled={isRunning}
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this scan?')) {
                          deleteCustomScanMutation.mutate(scan.id!);
                        }
                      }}
                      className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {scan.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{scan.description}</p>
                )}
                <div className="text-xs text-gray-500">
                  {scan.filters.length} filter{scan.filters.length !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4">
            Results ({results.length} stocks)
            {selectedScan && ` - ${selectedScan.name}`}
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('symbol')}>
                    Symbol {sortField === 'symbol' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('name')}>
                    Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('price')}>
                    Price {sortField === 'price' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('changePercent')}>
                    Change % {sortField === 'changePercent' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('volume')}>
                    Volume {sortField === 'volume' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('rsi')}>
                    RSI {sortField === 'rsi' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedResults.map((result) => (
                  <tr key={result.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 font-semibold">{result.symbol}</td>
                    <td className="px-4 py-3">{result.name}</td>
                    <td className="px-4 py-3 text-right">${result.price.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${result.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <div className="flex items-center justify-end gap-1">
                        {result.changePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {result.changePercent.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{result.volume.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{result.rsi?.toFixed(1) || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => navigate(`/stocks/${result.symbol}`)}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isRunning && (
        <div className="card p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Scanning stocks...</p>
        </div>
      )}

      {!isRunning && results.length === 0 && selectedScan && (
        <div className="card p-8 text-center">
          <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">
            No stocks found matching the criteria. Try a different scan or add stocks to your watchlist.
          </p>
        </div>
      )}
    </div>
  );
}
