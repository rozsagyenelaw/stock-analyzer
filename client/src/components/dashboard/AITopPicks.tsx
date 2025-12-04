/**
 * AI Top Picks Widget for Dashboard
 *
 * Scans watchlist stocks and displays top AI-recommended buying opportunities
 * Shows:
 * - Top 3-5 stocks with strong_buy or buy recommendations
 * - Confidence scores
 * - Brief reasoning
 * - Quick action buttons
 */

import { useQuery } from '@tanstack/react-query';
import { Sparkles, TrendingUp, TrendingDown, ExternalLink, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { aiApi, stocksApi, watchlistApi } from '@/services/api';
import { useState } from 'react';

export default function AITopPicks() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch watchlist
  const { data: watchlist } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => watchlistApi.getAll(),
  });

  // Fetch AI recommendations for all watchlist stocks
  const { data: topPicks, isLoading, refetch } = useQuery({
    queryKey: ['ai-top-picks'],
    queryFn: async () => {
      if (!watchlist || watchlist.length === 0) return [];

      // Fetch recommendations for all watchlist stocks
      const promises = watchlist.slice(0, 10).map(async (stock) => {
        try {
          // Get quote and analysis
          const [quote, analysis] = await Promise.all([
            stocksApi.getQuote(stock.symbol),
            stocksApi.getAnalysis(stock.symbol),
          ]);

          // Get AI recommendation
          const recommendation = await aiApi.getRecommendation(stock.symbol, {
            price: parseFloat(quote.close),
            technicalAnalysis: analysis,
            fundamentals: quote,
          });

          return {
            symbol: stock.symbol,
            name: stock.name,
            price: parseFloat(quote.close),
            change: parseFloat(quote.percent_change),
            recommendation: recommendation.recommendation,
            confidence: recommendation.confidence,
            reasoning: recommendation.reasoning,
            keyFactors: recommendation.keyFactors.slice(0, 2), // Top 2 factors
          };
        } catch (error) {
          console.error(`Error fetching recommendation for ${stock.symbol}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);

      // Filter out errors and only show buy/strong_buy recommendations
      const validPicks = results
        .filter((pick) => pick !== null && (pick.recommendation === 'strong_buy' || pick.recommendation === 'buy'))
        .sort((a, b) => {
          // Sort by recommendation strength first, then confidence
          const recOrder: Record<string, number> = { strong_buy: 2, buy: 1 };
          if (recOrder[a!.recommendation] !== recOrder[b!.recommendation]) {
            return recOrder[b!.recommendation] - recOrder[a!.recommendation];
          }
          return b!.confidence - a!.confidence;
        })
        .slice(0, 5); // Top 5

      return validPicks;
    },
    enabled: !!watchlist && watchlist.length > 0,
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: false,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-bold">AI Top Picks</h2>
          </div>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!watchlist || watchlist.length === 0) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-bold">AI Top Picks</h2>
          </div>
        </div>
        <div className="text-center text-gray-600 dark:text-gray-400 py-8">
          <p>Add stocks to your watchlist to see AI recommendations</p>
        </div>
      </div>
    );
  }

  if (!topPicks || topPicks.length === 0) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-bold">AI Top Picks</h2>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="text-center text-gray-600 dark:text-gray-400 py-8">
          <p>No strong buy opportunities found in your watchlist right now</p>
          <p className="text-sm mt-2">Check back later or add more stocks to your watchlist</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-bold">AI Top Picks</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">from your watchlist</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Refresh recommendations"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-4">
        {topPicks.map((pick) => {
          if (!pick) return null;

          const isStrongBuy = pick.recommendation === 'strong_buy';

          return (
            <Link
              key={pick.symbol}
              to={`/stock/${pick.symbol}`}
              className="block bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {pick.symbol}
                    </span>
                    {isStrongBuy && (
                      <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded">
                        STRONG BUY
                      </span>
                    )}
                    {!isStrongBuy && (
                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded">
                        BUY
                      </span>
                    )}
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {pick.confidence}% confidence
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{pick.name}</div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-semibold">${pick.price.toFixed(2)}</div>
                  <div className={`flex items-center justify-end gap-1 text-sm ${
                    pick.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {pick.change >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{Math.abs(pick.change).toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              {/* Key Factors */}
              <div className="space-y-1 mb-3">
                {pick.keyFactors.map((factor: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <span className="text-green-600">•</span>
                    <span>{factor}</span>
                  </div>
                ))}
              </div>

              {/* View Details Link */}
              <div className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-semibold">
                <span>View full analysis</span>
                <ExternalLink className="w-3 h-3" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Updated every 15 minutes • AI-powered recommendations
      </div>
    </div>
  );
}
