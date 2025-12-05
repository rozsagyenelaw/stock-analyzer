import { createClient, RedisClientType } from 'redis';
import logger from './logger';

class RedisService {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  async connect() {
    if (this.isConnected && this.client) {
      return this.client;
    }

    try {
      // Create Redis client
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis: Max reconnection attempts reached');
              return new Error('Redis connection failed');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      // Error handling
      this.client.on('error', (err) => {
        logger.error('Redis Client Error', { error: err.message });
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis: Connecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis: Connected and ready');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis: Reconnecting...');
      });

      // Connect to Redis
      await this.client.connect();
      return this.client;
    } catch (error: any) {
      logger.error('Failed to connect to Redis', { error: error.message });
      this.isConnected = false;
      this.client = null;
      // Don't throw - allow app to run without Redis
      return null;
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error: any) {
      logger.error('Redis GET error', { key, error: error.message });
      return null;
    }
  }

  async set(key: string, value: any, expirySeconds?: number): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      if (expirySeconds) {
        await this.client.setEx(key, expirySeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error: any) {
      logger.error('Redis SET error', { key, error: error.message });
      return false;
    }
  }

  async del(key: string | string[]): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(Array.isArray(key) ? key : [key]);
      return true;
    } catch (error: any) {
      logger.error('Redis DEL error', { key, error: error.message });
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error: any) {
      logger.error('Redis EXISTS error', { key, error: error.message });
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isConnected || !this.client) {
      return [];
    }

    try {
      return await this.client.keys(pattern);
    } catch (error: any) {
      logger.error('Redis KEYS error', { pattern, error: error.message });
      return [];
    }
  }

  async flush(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.flushAll();
      logger.info('Redis: Cache flushed');
      return true;
    } catch (error: any) {
      logger.error('Redis FLUSH error', { error: error.message });
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info('Redis: Disconnected');
      } catch (error: any) {
        logger.error('Redis disconnect error', { error: error.message });
      } finally {
        this.isConnected = false;
        this.client = null;
      }
    }
  }

  getStatus(): { connected: boolean; client: boolean } {
    return {
      connected: this.isConnected,
      client: this.client !== null,
    };
  }
}

// Singleton instance
const redisService = new RedisService();

// Cache key builders
export const CacheKeys = {
  stockAnalysis: (symbol: string) => `stock:analysis:${symbol}`,
  stockQuote: (symbol: string) => `stock:quote:${symbol}`,
  stockChart: (symbol: string, interval: string) => `stock:chart:${symbol}:${interval}`,
  optionsChain: (symbol: string, expiration: string) => `options:chain:${symbol}:${expiration}`,
  optionsIdeas: (strategy: string) => `options:ideas:${strategy}`,
  fundamentals: (symbol: string) => `fundamentals:${symbol}`,
  news: (symbol?: string) => symbol ? `news:${symbol}` : 'news:general',
  economicData: (indicator: string) => `economic:${indicator}`,
  discovery: (strategy: string) => `discovery:${strategy}`,
  aiAnalysis: (symbol: string, type: string) => `ai:${type}:${symbol}`,
};

// Cache TTL (Time To Live) in seconds
export const CacheTTL = {
  stockQuote: 60, // 1 minute
  stockAnalysis: 300, // 5 minutes
  stockChart: 300, // 5 minutes
  optionsChain: 300, // 5 minutes
  optionsIdeas: 600, // 10 minutes
  fundamentals: 3600, // 1 hour
  news: 600, // 10 minutes
  economicData: 3600, // 1 hour
  discovery: 1800, // 30 minutes
  aiAnalysis: 1800, // 30 minutes
};

// Middleware for caching API responses
export function cacheMiddleware(
  keyBuilder: (req: any) => string,
  ttl: number
) {
  return async (req: any, res: any, next: any) => {
    // Skip cache in development if env var is set
    if (process.env.DISABLE_CACHE === 'true') {
      return next();
    }

    const key = keyBuilder(req);
    const cachedData = await redisService.get(key);

    if (cachedData) {
      logger.debug(`Cache HIT: ${key}`);
      return res.json(cachedData);
    }

    logger.debug(`Cache MISS: ${key}`);

    // Store original json function
    const originalJson = res.json.bind(res);

    // Override json function to cache response
    res.json = (data: any) => {
      redisService.set(key, data, ttl).catch((err) => {
        logger.error('Failed to cache response', { key, error: err });
      });
      return originalJson(data);
    };

    next();
  };
}

export default redisService;
