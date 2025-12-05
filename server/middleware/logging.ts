import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import logger, { morganStream, trackApiMetric } from '../services/logger';

// Custom Morgan token for response time
morgan.token('response-time-ms', (req: Request, res: Response) => {
  const startTime = (req as any).startTime;
  if (!startTime) return '-';
  return `${Date.now() - startTime}ms`;
});

// Custom Morgan format
const morganFormat =
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms';

// Morgan middleware for HTTP request logging
export const httpLogger = morgan(morganFormat, {
  stream: morganStream,
  skip: (req: Request) => {
    // Skip logging for health checks
    return req.path === '/health';
  },
});

// Request tracking middleware
export function requestTracker(req: Request, res: Response, next: NextFunction) {
  // Store start time
  (req as any).startTime = Date.now();

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - (req as any).startTime;

    // Track API metrics
    trackApiMetric({
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date(),
    });

    // Log slow requests
    if (duration > 2000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration,
        query: req.query,
        user: (req as any).user?.userId,
      });
    }

    return originalSend.call(this, data);
  };

  next();
}

// Error logging middleware
export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    user: (req as any).user?.userId,
    ip: req.ip,
  });

  next(err);
}
