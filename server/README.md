# Stock Analyzer Server

Backend API for the Stock Analyzer application.

## New Features Implemented

### 1. Authentication System
- **JWT-based authentication** with bcrypt password hashing
- User registration and login endpoints
- Password change and account management
- Authentication middleware for protected routes
- User-specific rate limiting

**Endpoints:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/change-password` - Change password
- `DELETE /api/auth/account` - Delete account
- `GET /api/auth/verify` - Verify token validity

### 2. Redis Caching System
- Automatic caching for API responses
- Configurable TTL for different data types
- Cache key builders for organized caching
- Graceful fallback when Redis is unavailable
- Cache middleware for easy route integration

**Cache TTL:**
- Stock quotes: 1 minute
- Stock analysis: 5 minutes
- Options chain: 5 minutes
- Fundamentals: 1 hour
- News: 10 minutes

### 3. Winston Logging System
- Structured logging with Winston
- HTTP request logging with Morgan
- Separate log files for errors, combined logs, exceptions, and rejections
- Performance monitoring and slow request detection
- API metrics tracking
- Colored console output for development

**Log Files** (in `/logs/`):
- `combined.log` - All logs
- `error.log` - Errors only
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

### 4. Database Indexes
- Automatic index creation for better query performance
- Indexes on frequently queried columns
- Compound indexes for common query patterns

**Indexes:**
- Watchlist: symbol, sort_order
- Trades: symbol, status, entry_date, exit_date, symbol+status
- Alerts: symbol, enabled, triggered, created_at, enabled+triggered
- Users: email, username, is_active

## Environment Variables

Add these to your `.env` file:

```env
# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=7d

# Redis
REDIS_URL=redis://localhost:6379
DISABLE_CACHE=false

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

## Setup

### Install Dependencies
```bash
npm install
```

### Start Redis (Optional but recommended)
```bash
# macOS (with Homebrew)
brew install redis
brew services start redis

# Or using Docker
docker run -d -p 6379:6379 redis:alpine

# Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

## Authentication Flow

1. **Register**: POST to `/api/auth/register` with email, username, password
2. **Login**: POST to `/api/auth/login` with emailOrUsername, password
3. **Get Token**: Response includes JWT token
4. **Use Token**: Include in requests: `Authorization: Bearer <token>`
5. **Protected Routes**: Add `authenticate` middleware to routes that need auth

## Example: Protecting a Route

```typescript
import { authenticate } from './middleware/auth';

// Protect a single route
router.get('/protected', authenticate, (req, res) => {
  const userId = req.user?.userId;
  res.json({ message: 'Protected data', userId });
});
```

## Example: Using Cache Middleware

```typescript
import { cacheMiddleware, CacheKeys, CacheTTL } from './services/redis';

// Cache stock analysis for 5 minutes
router.get(
  '/stocks/:symbol/analysis',
  cacheMiddleware(
    (req) => CacheKeys.stockAnalysis(req.params.symbol),
    CacheTTL.stockAnalysis
  ),
  async (req, res) => {
    // Your route handler
    const analysis = await getAnalysis(req.params.symbol);
    res.json(analysis);
  }
);
```

## Monitoring & Logging

### View Logs
```bash
# Watch combined logs
tail -f logs/combined.log

# Watch error logs
tail -f logs/error.log
```

### API Metrics
The server tracks performance metrics including:
- Response times
- Slow requests (>2 seconds)
- Request counts by endpoint
- Error rates

Access metrics through the logging system or integrate with monitoring tools.

## Performance Features

1. **Database Indexes**: Faster queries on common patterns
2. **Redis Caching**: Reduced API calls and database queries
3. **WAL Mode**: Better SQLite concurrency
4. **Connection Pooling**: Efficient Redis connections
5. **Request Tracking**: Identify performance bottlenecks

## Security Features

1. **JWT Authentication**: Secure token-based auth
2. **Password Hashing**: bcrypt with salt rounds
3. **Rate Limiting**: IP-based and user-based limits
4. **Helmet**: Security headers
5. **CORS**: Controlled origin access
6. **Input Validation**: Email and password requirements

## Development

- All new services are in `/services/`
- Authentication middleware in `/middleware/auth.ts`
- Logging middleware in `/middleware/logging.ts`
- Auth routes in `/routes/auth.ts`

## Production Considerations

1. **Set JWT_SECRET**: Use a strong, random secret
2. **Configure Redis**: Use persistent storage
3. **Log Rotation**: Configure log file size limits
4. **Monitor Performance**: Watch slow request logs
5. **Backup Database**: Regular SQLite backups
6. **HTTPS**: Use TLS in production
7. **Environment Variables**: Never commit secrets

## Troubleshooting

### Redis Connection Fails
- Server will run without Redis (caching disabled)
- Check Redis is running: `redis-cli ping` should return `PONG`
- Verify REDIS_URL in `.env`

### Authentication Issues
- Check JWT_SECRET is set
- Verify token format: `Bearer <token>`
- Check token expiry

### Logging Issues
- Ensure `/logs/` directory exists
- Check file permissions
- Verify LOG_LEVEL setting

## API Documentation

Full API documentation available at:
- Swagger/OpenAPI (coming soon)
- Postman collection (coming soon)

For now, refer to route files in `/routes/` for endpoint details.
