import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import db from './database';
import { analyzeSentiment } from './sentimentAnalysis';

const REDDIT_USER_AGENT = 'StockAnalyzer/1.0';

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    author: string;
    url: string;
    permalink: string;
    score: number;
    num_comments: number;
    created_utc: number;
    subreddit: string;
  };
}

/**
 * Fetch posts from a subreddit
 */
export async function fetchSubredditPosts(
  subreddit: string,
  limit: number = 25,
  timeFilter: 'hour' | 'day' | 'week' | 'month' | 'year' = 'day'
): Promise<any[]> {
  try {
    const response = await axios.get(`https://www.reddit.com/r/${subreddit}/top.json`, {
      params: {
        limit,
        t: timeFilter,
      },
      headers: {
        'User-Agent': REDDIT_USER_AGENT,
      },
      timeout: 10000,
    });

    if (response.data && response.data.data && response.data.data.children) {
      return response.data.data.children.map((post: RedditPost) => ({
        post_id: post.data.id,
        title: post.data.title,
        content: post.data.selftext,
        author: post.data.author,
        url: `https://reddit.com${post.data.permalink}`,
        score: post.data.score,
        comments_count: post.data.num_comments,
        posted_at: new Date(post.data.created_utc * 1000).toISOString(),
        subreddit: post.data.subreddit,
      }));
    }

    return [];
  } catch (error: any) {
    console.error(`Error fetching from r/${subreddit}:`, error.message);
    throw new Error(`Failed to fetch from Reddit: ${error.message}`);
  }
}

/**
 * Search Reddit for mentions of a symbol
 */
export async function searchRedditForSymbol(
  symbol: string,
  subreddits: string[] = ['wallstreetbets', 'stocks', 'investing'],
  limit: number = 50
): Promise<any[]> {
  const allPosts: any[] = [];

  for (const subreddit of subreddits) {
    try {
      const response = await axios.get(`https://www.reddit.com/r/${subreddit}/search.json`, {
        params: {
          q: `${symbol} OR $${symbol}`,
          restrict_sr: true,
          sort: 'new',
          limit: Math.ceil(limit / subreddits.length),
          t: 'week',
        },
        headers: {
          'User-Agent': REDDIT_USER_AGENT,
        },
        timeout: 10000,
      });

      if (response.data && response.data.data && response.data.data.children) {
        const posts = response.data.data.children.map((post: RedditPost) => ({
          post_id: post.data.id,
          title: post.data.title,
          content: post.data.selftext,
          author: post.data.author,
          url: `https://reddit.com${post.data.permalink}`,
          score: post.data.score,
          comments_count: post.data.num_comments,
          posted_at: new Date(post.data.created_utc * 1000).toISOString(),
          subreddit: post.data.subreddit,
        }));

        allPosts.push(...posts);
      }
    } catch (error: any) {
      console.error(`Error searching r/${subreddit}:`, error.message);
    }
  }

  return allPosts.slice(0, limit);
}

/**
 * Store Reddit post in database with sentiment analysis
 */
export async function storeSocialPost(post: any, symbol?: string): Promise<string> {
  const id = uuidv4();

  // Analyze sentiment
  const text = `${post.title} ${post.content || ''}`;
  const sentiment = analyzeSentiment(text);

  try {
    db.prepare(`
      INSERT OR IGNORE INTO social_posts (
        id, platform, symbol, post_id, author, title, content, url,
        score, comments_count, shares_count, sentiment_score,
        sentiment_label, sentiment_magnitude, posted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      'REDDIT',
      symbol || null,
      post.post_id,
      post.author || null,
      post.title || null,
      post.content || null,
      post.url,
      post.score || 0,
      post.comments_count || 0,
      0, // Reddit doesn't have direct shares
      sentiment.score,
      sentiment.label,
      sentiment.magnitude,
      post.posted_at
    );

    return id;
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      const existing = db.prepare(
        'SELECT id FROM social_posts WHERE platform = ? AND post_id = ?'
      ).get('REDDIT', post.post_id) as any;
      return existing?.id || id;
    }
    throw error;
  }
}

/**
 * Aggregate Reddit data for a symbol
 */
export async function aggregateRedditForSymbol(symbol: string): Promise<number> {
  const posts = await searchRedditForSymbol(symbol, ['wallstreetbets', 'stocks', 'investing', 'StockMarket'], 100);
  let stored = 0;

  for (const post of posts) {
    try {
      await storeSocialPost(post, symbol);
      stored++;
    } catch (error) {
      console.error('Error storing Reddit post:', error);
    }
  }

  return stored;
}

/**
 * Get trending stocks from Reddit
 */
export async function getTrendingStocksFromReddit(subreddit: string = 'wallstreetbets'): Promise<any[]> {
  const posts = await fetchSubredditPosts(subreddit, 100, 'day');

  // Extract stock mentions ($SYMBOL format)
  const symbolMentions: { [key: string]: number } = {};

  posts.forEach(post => {
    const text = `${post.title} ${post.content}`;
    const matches = text.match(/\$[A-Z]{1,5}\b/g) || [];

    matches.forEach(match => {
      const symbol = match.substring(1); // Remove $
      symbolMentions[symbol] = (symbolMentions[symbol] || 0) + 1;
    });
  });

  // Convert to array and sort by mentions
  return Object.entries(symbolMentions)
    .map(([symbol, count]) => ({
      symbol,
      mentions_count: count,
      source: 'REDDIT',
    }))
    .sort((a, b) => b.mentions_count - a.mentions_count)
    .slice(0, 20);
}

/**
 * Calculate Reddit sentiment metrics for a symbol
 */
export function calculateRedditSentiment(symbol: string, days: number = 7): any {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const posts = db.prepare(`
    SELECT sentiment_score, sentiment_label, score, comments_count
    FROM social_posts
    WHERE platform = 'REDDIT' AND symbol = ? AND posted_at >= ?
  `).all(symbol, startDate.toISOString());

  if (posts.length === 0) {
    return null;
  }

  const scores = posts.map((p: any) => p.sentiment_score || 0);
  const avgSentiment = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  const bullishCount = posts.filter((p: any) => p.sentiment_label === 'BULLISH').length;
  const neutralCount = posts.filter((p: any) => p.sentiment_label === 'NEUTRAL').length;
  const bearishCount = posts.filter((p: any) => p.sentiment_label === 'BEARISH').length;

  let sentimentLabel: 'BULLISH' | 'NEUTRAL' | 'BEARISH' = 'NEUTRAL';
  if (avgSentiment > 0.2) sentimentLabel = 'BULLISH';
  else if (avgSentiment < -0.2) sentimentLabel = 'BEARISH';

  const totalEngagement = posts.reduce((sum: number, p: any) => sum + (p.score || 0) + (p.comments_count || 0), 0);

  return {
    id: uuidv4(),
    symbol,
    date: new Date().toISOString().split('T')[0],
    timeframe: 'daily',
    source: 'REDDIT',
    avg_sentiment: avgSentiment,
    sentiment_label: sentimentLabel,
    volume: posts.length,
    bullish_count: bullishCount,
    neutral_count: neutralCount,
    bearish_count: bearishCount,
    engagement: totalEngagement,
  };
}

/**
 * Get Reddit posts from database
 */
export function getRedditPosts(symbol?: string, limit: number = 50): any[] {
  let query = 'SELECT * FROM social_posts WHERE platform = ?';
  const params: any[] = ['REDDIT'];

  if (symbol) {
    query += ' AND symbol = ?';
    params.push(symbol);
  }

  query += ' ORDER BY posted_at DESC LIMIT ?';
  params.push(limit);

  return db.prepare(query).all(...params);
}

