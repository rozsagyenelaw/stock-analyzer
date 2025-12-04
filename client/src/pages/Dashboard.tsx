import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { stocksApi, watchlistApi } from '@/services/api';
import toast from 'react-hot-toast';
import AITopPicks from '@/components/dashboard/AITopPicks';

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const navigate = useNavigate();

  // Fetch watchlist with prices
  const { data: watchlist, isLoading, refetch } = useQuery({
    queryKey: ['watchlist-prices'],
    queryFn: () => watchlistApi.getAllWithPrices(),
  });

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const results = await stocksApi.search(searchQuery);
      // Remove duplicates by symbol
      const uniqueResults = (results.data || []).reduce((acc: any[], curr: any) => {
        if (!acc.find(item => item.symbol === curr.symbol)) {
          acc.push(curr);
        }
        return acc;
      }, []);
      setSearchResults(uniqueResults);
    } catch (error) {
      toast.error('Failed to search stocks');
    }
  };

  const handleStockClick = (symbol: string) => {
    navigate(`/stock/${symbol}`);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveFromWatchlist = async (symbol: string) => {
    try {
      await watchlistApi.remove(symbol);
      toast.success(`Removed ${symbol} from watchlist`);
      refetch();
    } catch (error) {
      toast.error('Failed to remove from watchlist');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Track your watchlist and analyze stocks in real-time
        </p>
      </div>

      {/* Search */}
      <div className="card p-6">
        <form onSubmit={handleSearch} className="relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stocks by symbol or name..."
                className="input pl-10"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-2 card max-h-96 overflow-y-auto">
              {searchResults.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => handleStockClick(stock.symbol)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-0"
                >
                  <div className="font-semibold">{stock.symbol}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {stock.instrument_name}
                  </div>
                  <div className="text-xs text-gray-500">{stock.exchange}</div>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* AI Top Picks */}
      <AITopPicks />

      {/* Watchlist */}
      <div className="card">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold">Watchlist</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading watchlist...</p>
          </div>
        ) : !watchlist || watchlist.length === 0 ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            <p>Your watchlist is empty. Search for stocks to add them.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {watchlist.map((item: any) => (
              <div
                key={item.symbol}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleStockClick(item.symbol)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-bold text-lg">{item.symbol}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {item.name}
                        </div>
                      </div>

                      {item.price !== null && (
                        <div className="ml-auto text-right">
                          <div className="font-semibold text-lg">
                            ${item.price?.toFixed(2)}
                          </div>
                          <div
                            className={`flex items-center gap-1 text-sm ${
                              item.changePercent >= 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {item.changePercent >= 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            <span>
                              {item.change?.toFixed(2)} ({item.changePercent?.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => handleRemoveFromWatchlist(item.symbol)}
                    className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
