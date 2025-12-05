import winston from 'winston';
import path from 'path';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}] ${message}`;
    if (Object.keys(meta).length > 0 && meta.stack) {
      msg += `\n${meta.stack}`;
    }
    return msg;
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write errors to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Create logger stream for Morgan
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Performance monitoring helper
export class PerformanceMonitor {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = Date.now();
  }

  end() {
    const duration = Date.now() - this.startTime;
    logger.info(`${this.label} completed in ${duration}ms`);
    return duration;
  }
}

// API metrics tracker
interface ApiMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
}

const apiMetrics: ApiMetrics[] = [];
const MAX_METRICS = 1000;

export function trackApiMetric(metric: ApiMetrics) {
  apiMetrics.push(metric);
  if (apiMetrics.length > MAX_METRICS) {
    apiMetrics.shift();
  }

  // Log slow requests (>2 seconds)
  if (metric.duration > 2000) {
    logger.warn('Slow API request detected', {
      endpoint: metric.endpoint,
      method: metric.method,
      duration: metric.duration,
    });
  }
}

export function getApiMetrics(limit: number = 100) {
  return apiMetrics.slice(-limit);
}

export function getAverageResponseTime(endpoint?: string): number {
  let metrics = apiMetrics;
  if (endpoint) {
    metrics = metrics.filter((m) => m.endpoint === endpoint);
  }
  if (metrics.length === 0) return 0;
  const total = metrics.reduce((sum, m) => sum + m.duration, 0);
  return total / metrics.length;
}

// Error types for better categorization
export enum ErrorType {
  DATABASE = 'DATABASE_ERROR',
  API = 'API_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
}

export function logError(
  error: Error,
  type: ErrorType = ErrorType.API,
  context?: Record<string, any>
) {
  logger.error(error.message, {
    type,
    stack: error.stack,
    ...context,
  });
}

export default logger;
