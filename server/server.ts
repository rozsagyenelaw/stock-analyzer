import dotenv from 'dotenv';
// Load environment variables FIRST before any other imports
dotenv.config({ path: '../.env' });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import './services/database'; // Database auto-initializes on import
import { initializeEmailService } from './services/email';

// Import routes
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

const app = express();
const PORT = process.env.PORT || 3001;

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

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database initializes automatically on import
console.log('✓ Database initialized');

// Initialize email service
try {
  initializeEmailService();
  console.log('✓ Email service initialized');
} catch (error) {
  console.warn('Email service initialization failed:', error);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
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

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
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
      console.log('✓ Alert processor started');
    })
    .catch((error) => {
      console.error('Failed to start alert processor:', error);
    });
}

export default app;
