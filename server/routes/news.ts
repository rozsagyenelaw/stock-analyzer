import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../services/database';
import {
  fetchNewsForSymbol,
  fetchTopHeadlines,
  getNewsArticles,
  aggregateNewsForSymbol,
  calculateSentimentMetrics,
} from '../services/newsAggregator';
import {
  searchRedditForSymbol,
  getTrendingStocksFromReddit,
  getRedditPosts,
  aggregateRedditForSymbol,
  calculateRedditSentiment,
} from '../services/redditTracker';
import { aggregateSentiment } from '../services/sentimentAnalysis';

const router = Router();

/**
 * GET /api/news - Get latest news articles
 */
router.get('/', async (req, res) => {
  try {
    const { symbol, limit = 50, offset = 0 } = req.query;

    const articles = getNewsArticles(
      symbol as string | undefined,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json(articles);
  } catch (error: any) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/news/headlines - Get top headlines
 */
router.get('/headlines', async (req, res) => {
  try {
    const { category = 'business', limit = 20 } = req.query;

    const headlines = await fetchTopHeadlines(category as string, parseInt(limit as string));

    res.json(headlines);
  } catch (error: any) {
    console.error('Error fetching headlines:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/news/aggregate/:symbol - Fetch and store news for a symbol
 */
router.post('/aggregate/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    const count = await aggregateNewsForSymbol(symbol.toUpperCase());

    res.json({ symbol, articles_stored: count });
  } catch (error: any) {
    console.error('Error aggregating news:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/news/social - Get social media posts
 */
router.get('/social', async (req, res) => {
  try {
    const { symbol, platform = 'REDDIT', limit = 50 } = req.query;

    let posts: any[] = [];

    if (platform === 'REDDIT') {
      posts = getRedditPosts(symbol as string | undefined, parseInt(limit as string));
    }

    res.json(posts);
  } catch (error: any) {
    console.error('Error fetching social posts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/news/social/aggregate/:symbol - Fetch and store social posts for a symbol
 */
router.post('/social/aggregate/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { platform = 'REDDIT' } = req.query;

    let count = 0;

    if (platform === 'REDDIT') {
      count = await aggregateRedditForSymbol(symbol.toUpperCase());
    }

    res.json({ symbol, platform, posts_stored: count });
  } catch (error: any) {
    console.error('Error aggregating social posts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/news/trending - Get trending stocks from social media
 */
router.get('/trending', async (req, res) => {
  try {
    const { source = 'REDDIT' } = req.query;

    let trending: any[] = [];

    if (source === 'REDDIT') {
      trending = await getTrendingStocksFromReddit();

      // Store in database
      const date = new Date().toISOString().split('T')[0];
      trending.forEach((item, index) => {
        try {
          db.prepare(`
            INSERT OR REPLACE INTO trending_symbols (
              id, symbol, rank, source, mentions_count, sentiment_score,
              change_24h, timeframe, date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            uuidv4(),
            item.symbol,
            index + 1,
            'REDDIT',
            item.mentions_count,
            null,
            0,
            'daily',
            date
          );
        } catch (error) {
          console.error('Error storing trending symbol:', error);
        }
      });
    }

    res.json(trending);
  } catch (error: any) {
    console.error('Error fetching trending stocks:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/news/sentiment/:symbol - Get comprehensive sentiment analysis for a symbol
 */
router.get('/sentiment/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const upperSymbol = symbol.toUpperCase();

    // Get news sentiment
    const newsSentiment = calculateSentimentMetrics(upperSymbol, 'daily');

    // Get Reddit sentiment
    const redditSentiment = calculateRedditSentiment(upperSymbol, 7);

    // Get recent news and social posts
    const recentNews = getNewsArticles(upperSymbol, 10);
    const recentReddit = getRedditPosts(upperSymbol, 10);

    // Aggregate overall sentiment
    const sentiments: any[] = [];
    if (newsSentiment) sentiments.push({ score: newsSentiment.avg_sentiment, magnitude: 0.7 });
    if (redditSentiment) sentiments.push({ score: redditSentiment.avg_sentiment, magnitude: 0.5 });

    const overall = sentiments.length > 0
      ? aggregateSentiment(sentiments)
      : { score: 0, label: 'NEUTRAL', magnitude: 0 };

    // Get sentiment history
    const history = db.prepare(`
      SELECT * FROM sentiment_metrics
      WHERE symbol = ?
      ORDER BY date DESC
      LIMIT 30
    `).all(upperSymbol);

    res.json({
      symbol: upperSymbol,
      overall_sentiment: overall.label,
      sentiment_score: overall.score,
      news: {
        sentiment: newsSentiment?.sentiment_label || 'NEUTRAL',
        score: newsSentiment?.avg_sentiment || 0,
        volume: newsSentiment?.volume || 0,
        recent_articles: recentNews,
      },
      reddit: {
        sentiment: redditSentiment?.sentiment_label || 'NEUTRAL',
        score: redditSentiment?.avg_sentiment || 0,
        volume: redditSentiment?.volume || 0,
        trending_posts: recentReddit,
      },
      twitter: {
        sentiment: 'NEUTRAL',
        score: 0,
        volume: 0,
        trending_posts: [],
      },
      history,
    });
  } catch (error: any) {
    console.error('Error fetching sentiment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/news/metrics/:symbol - Get sentiment metrics over time
 */
router.get('/metrics/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = 'daily', source = 'COMBINED', days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    let query = `
      SELECT * FROM sentiment_metrics
      WHERE symbol = ? AND timeframe = ?
    `;
    const params: any[] = [symbol.toUpperCase(), timeframe];

    if (source !== 'COMBINED') {
      query += ' AND source = ?';
      params.push(source);
    }

    query += ' AND date >= ? ORDER BY date DESC';
    params.push(startDate.toISOString().split('T')[0]);

    const metrics = db.prepare(query).all(...params);

    res.json(metrics);
  } catch (error: any) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/news/search - Search news articles
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    const articles = db.prepare(`
      SELECT * FROM news_articles
      WHERE title LIKE ? OR description LIKE ?
      ORDER BY published_at DESC
      LIMIT ?
    `).all(`%${q}%`, `%${q}%`, parseInt(limit as string));

    res.json(articles.map((article: any) => ({
      ...article,
      keywords: article.keywords ? JSON.parse(article.keywords) : [],
    })));
  } catch (error: any) {
    console.error('Error searching news:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
