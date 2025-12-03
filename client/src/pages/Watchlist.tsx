import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { watchlistApi, stocksApi } from '@/services/api';
import { Trash2, TrendingUp, TrendingDown, Plus, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function Watchlist() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: watchlist, isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => watchlistApi.getAll(),
  });

  const removeMutation = useMutation({
    mutationFn: (symbol: string) => watchlistApi.remove(symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      toast.success('Removed from watchlist');
    },
    onError: () => {
      toast.error('Failed to remove from watchlist');
    },
  });

  const addMutation = useMutation({
    mutationFn: ({ symbol, name }: { symbol: string; name: string }) =>
      watchlistApi.add(symbol, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      toast.success('Added to watchlist');
      setSearchQuery('');
      setSearchResults([]);
    },
    onError: () => {
      toast.error('Failed to add to watchlist');
    },
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await stocksApi.search(searchQuery);
      setSearchResults(results);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddStock = (symbol: string, name: string) => {
    addMutation.mutate({ symbol, name });
  };

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
        <h1 className="text-3xl font-bold">Watchlist</h1>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {watchlist?.length || 0} stocks
        </div>
      </div>

      {/* Add Stock Section */}
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Add Stock</h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by symbol or name (e.g., AAPL, Apple)"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="btn btn-primary"
          >
            Search
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.slice(0, 10).map((result) => (
              <div
                key={result.symbol}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div>
                  <div className="font-semibold">{result.symbol}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {result.instrument_name}
                  </div>
                </div>
                <button
                  onClick={() => handleAddStock(result.symbol, result.instrument_name)}
                  disabled={watchlist?.some((item) => item.symbol === result.symbol)}
                  className="btn btn-secondary btn-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {watchlist?.some((item) => item.symbol === result.symbol)
                    ? 'Already Added'
                    : 'Add'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Watchlist Grid */}
      {!watchlist || watchlist.length === 0 ? (
        <div className="card p-12 text-center">
          <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No stocks in watchlist</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Add stocks to your watchlist to track them here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {watchlist.map((item) => (
            <WatchlistCard
              key={item.symbol}
              item={item}
              onRemove={() => removeMutation.mutate(item.symbol)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WatchlistCard({ item, onRemove }: { item: any; onRemove: () => void }) {
  const { data: quote } = useQuery({
    queryKey: ['quote', item.symbol],
    queryFn: () => stocksApi.getQuote(item.symbol),
    refetchInterval: 60000, // Refresh every minute
  });

  const change = quote?.change || 0;
  const changePercent = quote?.percent_change || 0;
  const isPositive = change >= 0;

  return (
    <Link to={`/stock/${item.symbol}`} className="card p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold">{item.symbol}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{item.name}</p>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            onRemove();
          }}
          className="text-gray-400 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {quote ? (
        <>
          <div className="text-3xl font-bold mb-2">${quote.close?.toFixed(2) || 'N/A'}</div>
          <div className={`flex items-center gap-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            <span className="font-semibold">
              {change.toFixed(2)} ({changePercent.toFixed(2)}%)
            </span>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Added {new Date(item.added_at).toLocaleDateString()}
        </div>
      </div>
    </Link>
  );
}
