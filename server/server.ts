import dotenv from 'dotenv';
// Load environment variables FIRST before any other imports
// Trigger rebuild for Daily Picks feature
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import './services/database'; // Database auto-initializes on import
import { initializeEmailService } from './services/email';
import logger from './services/logger';
import redisService from './services/redis';
import { initializeUsersTable } from './services/auth';
import { httpLogger, requestTracker, errorLogger } from './middleware/logging';

// Import routes
import authRouter from './routes/auth';
import stocksRouter from './routes/stocks';
import watchlistRouter from './routes/watchlist';
import journalRouter from './routes/journal';
import alertsRouter from './routes/alerts';
import settingsRouter from './routes/settings';
import screenerRouter from './routes/screener';
import fundamentalsRouter from './routes/fundamentals';
import optionsRouter from './routes/options';
import aiRouter from './routes/ai';
import portfolioRouter from './routes/portfolio';
import backtestRouter from './routes/backtest';
import newsRouter from './routes/news';
import economyRouter from './routes/economy';
import discoveryRouter from './routes/discovery';
import optionsIdeasRouter from './routes/optionsIdeas';
import optionsFlowRouter from './routes/optionsFlow';
import tradingRouter from './routes/trading';
import tradeIdeasRouter from './routes/tradeIdeas';
import tradeComparisonRouter from './routes/tradeComparison';

// Import dailyPicks with explicit error handling
let dailyPicksRouter: any;
try {
  dailyPicksRouter = require('./routes/dailyPicks').default;
  console.log('[SERVER] ✓ dailyPicks router imported successfully');
} catch (error: any) {
  console.error('[SERVER] ✗ FAILED to import dailyPicks router:', error.message);
  console.error('[SERVER] Stack:', error.stack);
  // Create a dummy router that returns error
  const express = require('express');
  dailyPicksRouter = express.Router();
  dailyPicksRouter.get('*', (req: any, res: any) => {
    res.status(500).json({ error: 'dailyPicks module failed to load', details: error.message });
  });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - required for Render and other reverse proxies
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api', limiter);

// Logging middleware
app.use(httpLogger); // HTTP request logging
app.use(requestTracker); // Performance tracking

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize services
logger.info('Starting Stock Analyzer API Server...');

// Database initializes automatically on import
logger.info('✓ Database initialized');

// Initialize users table for authentication
try {
  initializeUsersTable();
  logger.info('✓ Users table initialized');
} catch (error: any) {
  logger.error('Failed to initialize users table:', error);
}

// Initialize Redis cache
redisService
  .connect()
  .then(() => {
    logger.info('✓ Redis cache connected');
  })
  .catch((error) => {
    logger.warn('Redis connection failed, running without cache');
  });

// Initialize email service
try {
  initializeEmailService();
  logger.info('✓ Email service initialized');
} catch (error) {
  logger.warn('Email service initialization failed:', error);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.1' // Added to force cache bust
  });
});

// DEBUG: Log ALL requests
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url} - Headers:`, JSON.stringify(req.headers, null, 2));
  next();
});

// API routes
console.log('[SERVER] Registering API routes...');
app.use('/api/auth', authRouter); // Authentication routes (no auth required)
app.use('/api/stocks', stocksRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/journal', journalRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/screener', screenerRouter);
app.use('/api/fundamentals', fundamentalsRouter);
app.use('/api/options', optionsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/backtest', backtestRouter);
app.use('/api/news', newsRouter);
app.use('/api/economy', economyRouter);
app.use('/api/discovery', discoveryRouter);
app.use('/api/options-ideas', optionsIdeasRouter);
app.use('/api/options-flow', optionsFlowRouter);
app.use('/api/trading', tradingRouter);
app.use('/api/trade-ideas', tradeIdeasRouter);
app.use('/api/trade-comparison', tradeComparisonRouter);
console.log('[SERVER] Registering /api/daily-picks with router:', typeof dailyPicksRouter);
app.use('/api/daily-picks', dailyPicksRouter);
console.log('[SERVER] ✓ All routes registered');

// Error logging middleware
app.use(errorLogger);

// Serve static files from client build in production
if (process.env.NODE_ENV === 'production') {
  // __dirname is server/dist, so we need ../../client/dist to get to client/dist
  const clientBuildPath = path.join(__dirname, '../../client/dist');
  logger.info(`[PRODUCTION] Serving client from: ${clientBuildPath}`);
  app.use(express.static(clientBuildPath));

  // Handle client-side routing - send all non-API requests to index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler for development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
}

// Start server
app.listen(PORT, () => {
  logger.info(`
╔════════════════════════════════════════╗
║   Stock Analyzer API Server           ║
║   Running on http://localhost:${PORT}   ║
╚════════════════════════════════════════╝
  `);
});

// Start alert processor (if enabled)
if (process.env.NODE_ENV !== 'test') {
  import('./services/alertProcessor')
    .then(() => {
      logger.info('✓ Alert processor started');
    })
    .catch((error) => {
      logger.error('Failed to start alert processor:', error);
    });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing server');
  await redisService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing server');
  await redisService.disconnect();
  process.exit(0);
});

export default app;
