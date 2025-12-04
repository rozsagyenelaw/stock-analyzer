import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { NewsArticle, SocialPost, TrendingSymbol, SentimentLabel } from '@/types';
import { Newspaper, TrendingUp, TrendingDown, Minus, ExternalLink, MessageSquare } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function News() {
  const [selectedTab, setSelectedTab] = useState<'news' | 'social' | 'trending'>('news');

  const { data: news = [] } = useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/news`, { params: { limit: 50 } });
      return response.data;
    },
  });

  const { data: socialPosts = [] } = useQuery({
    queryKey: ['social-posts'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/news/social`, { params: { limit: 50 } });
      return response.data;
    },
  });

  const { data: trending = [] } = useQuery({
    queryKey: ['trending'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/news/trending`);
      return response.data;
    },
  });

  const getSentimentColor = (sentiment?: SentimentLabel) => {
    switch (sentiment) {
      case 'BULLISH':
        return 'text-green-400';
      case 'BEARISH':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getSentimentIcon = (sentiment?: SentimentLabel) => {
    switch (sentiment) {
      case 'BULLISH':
        return <TrendingUp className="w-4 h-4" />;
      case 'BEARISH':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">News & Social Sentiment</h1>
        <p className="text-gray-400">Real-time financial news and social media tracking</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700 mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => setSelectedTab('news')}
            className={`py-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
              selectedTab === 'news'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Newspaper className="w-5 h-5" />
            News ({news.length})
          </button>
          <button
            onClick={() => setSelectedTab('social')}
            className={`py-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
              selectedTab === 'social'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            Social ({socialPosts.length})
          </button>
          <button
            onClick={() => setSelectedTab('trending')}
            className={`py-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
              selectedTab === 'trending'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            Trending ({trending.length})
          </button>
        </div>
      </div>

      {/* News Tab */}
      {selectedTab === 'news' && (
        <div className="space-y-4">
          {news.map((article: NewsArticle) => (
            <div key={article.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <div className="flex items-start gap-4">
                {article.image_url && (
                  <img
                    src={article.image_url}
                    alt=""
                    className="w-32 h-20 object-cover rounded"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold text-white hover:text-blue-400 flex items-center gap-2"
                    >
                      {article.title}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    {article.sentiment_label && (
                      <div className={`flex items-center gap-1 ${getSentimentColor(article.sentiment_label)}`}>
                        {getSentimentIcon(article.sentiment_label)}
                        <span className="text-sm font-medium">{article.sentiment_label}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mb-2">{article.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{article.source}</span>
                    <span>•</span>
                    <span>{new Date(article.published_at).toLocaleString()}</span>
                    {article.symbol && (
                      <>
                        <span>•</span>
                        <span className="text-blue-400">${article.symbol}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {news.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No news articles yet. They will appear here as they're aggregated.
            </div>
          )}
        </div>
      )}

      {/* Social Tab */}
      {selectedTab === 'social' && (
        <div className="space-y-4">
          {socialPosts.map((post: SocialPost) => (
            <div key={post.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold text-white hover:text-blue-400 flex items-center gap-2"
                >
                  {post.title}
                  <ExternalLink className="w-4 h-4" />
                </a>
                {post.sentiment_label && (
                  <div className={`flex items-center gap-1 ${getSentimentColor(post.sentiment_label)}`}>
                    {getSentimentIcon(post.sentiment_label)}
                    <span className="text-sm font-medium">{post.sentiment_label}</span>
                  </div>
                )}
              </div>
              {post.content && <p className="text-gray-400 text-sm mb-2 line-clamp-2">{post.content}</p>}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="text-blue-400">{post.platform}</span>
                <span>•</span>
                <span>u/{post.author}</span>
                <span>•</span>
                <span>↑ {post.score}</span>
                <span>•</span>
                <span>💬 {post.comments_count}</span>
                <span>•</span>
                <span>{new Date(post.posted_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
          {socialPosts.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No social posts yet. They will appear here as they're tracked.
            </div>
          )}
        </div>
      )}

      {/* Trending Tab */}
      {selectedTab === 'trending' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trending.map((item: TrendingSymbol, index: number) => (
            <div key={item.symbol} className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-gray-600">#{index + 1}</div>
                  <div>
                    <div className="text-xl font-bold text-white">${item.symbol}</div>
                    <div className="text-xs text-gray-400">{item.source}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-blue-400">{item.mentions_count}</div>
                  <div className="text-xs text-gray-400">mentions</div>
                </div>
              </div>
              {item.change_24h !== 0 && (
                <div className={`text-sm ${item.change_24h > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.change_24h > 0 ? '+' : ''}{item.change_24h} vs 24h ago
                </div>
              )}
            </div>
          ))}
          {trending.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              No trending stocks yet. Check back soon!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
