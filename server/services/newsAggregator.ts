import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import db from './database';
import { analyzeSentiment } from './sentimentAnalysis';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_URL = 'https://newsapi.org/v2';

interface NewsAPIArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

/**
 * Fetch news articles for a symbol from NewsAPI
 */
export async function fetchNewsForSymbol(symbol: string, limit: number = 20): Promise<any[]> {
  if (!NEWS_API_KEY) {
    console.warn('NEWS_API_KEY not configured, using mock data');
    return getMockNews(symbol, limit);
  }

  try {
    const query = `${symbol} stock OR ${symbol} shares`;
    const response = await axios.get(`${NEWS_API_URL}/everything`, {
      params: {
        q: query,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: limit,
        apiKey: NEWS_API_KEY,
      },
      timeout: 10000,
    });

    if (response.data && response.data.articles) {
      return response.data.articles.map((article: NewsAPIArticle) => ({
        source: article.source.name,
        author: article.author,
        title: article.title,
        description: article.description,
        url: article.url,
        image_url: article.urlToImage,
        published_at: article.publishedAt,
        content: article.content,
      }));
    }

    return [];
  } catch (error: any) {
    console.error('Error fetching news:', error.message);
    return getMockNews(symbol, limit);
  }
}

/**
 * Fetch top business headlines
 */
export async function fetchTopHeadlines(category: string = 'business', limit: number = 20): Promise<any[]> {
  if (!NEWS_API_KEY) {
    console.warn('NEWS_API_KEY not configured, using mock data');
    return getMockNews('MARKET', limit);
  }

  try {
    const response = await axios.get(`${NEWS_API_URL}/top-headlines`, {
      params: {
        category,
        language: 'en',
        pageSize: limit,
        apiKey: NEWS_API_KEY,
      },
      timeout: 10000,
    });

    if (response.data && response.data.articles) {
      return response.data.articles.map((article: NewsAPIArticle) => ({
        source: article.source.name,
        author: article.author,
        title: article.title,
        description: article.description,
        url: article.url,
        image_url: article.urlToImage,
        published_at: article.publishedAt,
        content: article.content,
      }));
    }

    return [];
  } catch (error: any) {
    console.error('Error fetching headlines:', error.message);
    return getMockNews('MARKET', limit);
  }
}

/**
 * Store news article in database with sentiment analysis
 */
export async function storeNewsArticle(article: any, symbol?: string): Promise<string> {
  const id = uuidv4();

  // Analyze sentiment
  const text = `${article.title} ${article.description || ''}`;
  const sentiment = analyzeSentiment(text);

  // Extract keywords
  const keywords = extractKeywords(text);

  // Categorize article
  const category = categorizeArticle(article.title, article.description || '');

  try {
    db.prepare(`
      INSERT OR IGNORE INTO news_articles (
        id, symbol, title, description, content, url, source, author,
        image_url, published_at, sentiment_score, sentiment_label,
        sentiment_magnitude, category, keywords
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      symbol || null,
      article.title,
      article.description || null,
      article.content || null,
      article.url,
      article.source,
      article.author || null,
      article.image_url || null,
      article.published_at,
      sentiment.score,
      sentiment.label,
      sentiment.magnitude,
      category,
      JSON.stringify(keywords)
    );

    return id;
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      // Article already exists, return existing ID
      const existing = db.prepare('SELECT id FROM news_articles WHERE url = ?').get(article.url) as any;
      return existing?.id || id;
    }
    throw error;
  }
}

/**
 * Get news articles from database
 */
export function getNewsArticles(symbol?: string, limit: number = 50, offset: number = 0): any[] {
  let query = 'SELECT * FROM news_articles';
  const params: any[] = [];

  if (symbol) {
    query += ' WHERE symbol = ?';
    params.push(symbol);
  }

  query += ' ORDER BY published_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const articles = db.prepare(query).all(...params);

  return articles.map((article: any) => ({
    ...article,
    keywords: article.keywords ? JSON.parse(article.keywords) : [],
  }));
}

/**
 * Fetch and store news for a symbol
 */
export async function aggregateNewsForSymbol(symbol: string): Promise<number> {
  const articles = await fetchNewsForSymbol(symbol, 50);
  let stored = 0;

  for (const article of articles) {
    try {
      await storeNewsArticle(article, symbol);
      stored++;
    } catch (error) {
      console.error('Error storing article:', error);
    }
  }

  return stored;
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had']);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Count frequency
  const frequency: { [key: string]: number } = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Return top 10 keywords
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Categorize article based on content
 */
function categorizeArticle(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();

  const categories = {
    EARNINGS: ['earnings', 'revenue', 'profit', 'eps', 'quarterly', 'results'],
    MERGER: ['merger', 'acquisition', 'buyout', 'takeover', 'deal'],
    REGULATION: ['regulation', 'sec', 'ftc', 'lawsuit', 'legal', 'compliance'],
    PRODUCT: ['product', 'launch', 'release', 'unveil', 'announce'],
    EXECUTIVE: ['ceo', 'cfo', 'executive', 'leadership', 'resign', 'hire'],
    MARKET: ['market', 'trading', 'stock', 'shares', 'price'],
    ANALYST: ['analyst', 'rating', 'upgrade', 'downgrade', 'target'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category;
    }
  }

  return 'GENERAL';
}

/**
 * Get mock news data for development/testing
 */
function getMockNews(symbol: string, limit: number): any[] {
  const mockArticles = [
    {
      source: 'Bloomberg',
      author: 'Financial Analyst',
      title: `${symbol} Stock Surges on Strong Earnings Beat`,
      description: `${symbol} reported quarterly earnings that exceeded analyst expectations, sending shares higher in after-hours trading.`,
      url: `https://example.com/news/${symbol.toLowerCase()}-earnings-beat`,
      image_url: 'https://via.placeholder.com/400x200',
      published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      content: 'Full article content...',
    },
    {
      source: 'Reuters',
      author: 'Market Reporter',
      title: `Analysts Upgrade ${symbol} Price Target`,
      description: `Several Wall Street analysts raised their price targets for ${symbol} following positive industry trends.`,
      url: `https://example.com/news/${symbol.toLowerCase()}-analyst-upgrade`,
      image_url: 'https://via.placeholder.com/400x200',
      published_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      content: 'Full article content...',
    },
    {
      source: 'CNBC',
      author: 'Business Correspondent',
      title: `${symbol} Announces New Product Line`,
      description: `${symbol} unveiled its latest product innovations at a press conference today.`,
      url: `https://example.com/news/${symbol.toLowerCase()}-new-product`,
      image_url: 'https://via.placeholder.com/400x200',
      published_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      content: 'Full article content...',
    },
  ];

  return mockArticles.slice(0, limit);
}

/**
 * Calculate sentiment metrics for a symbol
 */
export function calculateSentimentMetrics(symbol: string, timeframe: 'hourly' | 'daily' | 'weekly' = 'daily'): any {
  const now = new Date();
  let startDate: Date;

  switch (timeframe) {
    case 'hourly':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
      break;
    case 'daily':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
      break;
    case 'weekly':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      break;
  }

  const articles = db.prepare(`
    SELECT sentiment_score, sentiment_label
    FROM news_articles
    WHERE symbol = ? AND published_at >= ?
  `).all(symbol, startDate.toISOString());

  if (articles.length === 0) {
    return null;
  }

  const scores = articles.map((a: any) => a.sentiment_score || 0);
  const avgSentiment = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  const bullishCount = articles.filter((a: any) => a.sentiment_label === 'BULLISH').length;
  const neutralCount = articles.filter((a: any) => a.sentiment_label === 'NEUTRAL').length;
  const bearishCount = articles.filter((a: any) => a.sentiment_label === 'BEARISH').length;

  let sentimentLabel: 'BULLISH' | 'NEUTRAL' | 'BEARISH' = 'NEUTRAL';
  if (avgSentiment > 0.2) sentimentLabel = 'BULLISH';
  else if (avgSentiment < -0.2) sentimentLabel = 'BEARISH';

  return {
    id: uuidv4(),
    symbol,
    date: now.toISOString().split('T')[0],
    timeframe,
    source: 'NEWS',
    avg_sentiment: avgSentiment,
    sentiment_label: sentimentLabel,
    volume: articles.length,
    bullish_count: bullishCount,
    neutral_count: neutralCount,
    bearish_count: bearishCount,
  };
}
