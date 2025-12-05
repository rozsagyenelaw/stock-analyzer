import { Request, Response, NextFunction } from 'express';
import { verifyToken, getUserById, JWTPayload } from '../services/auth';
import logger, { ErrorType, logError } from '../services/logger';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Authentication middleware
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyToken(token);

    // Verify user still exists and is active
    const user = getUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Attach user to request
    req.user = payload;

    next();
  } catch (error: any) {
    logError(error, ErrorType.AUTHENTICATION, { path: req.path });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Optional authentication middleware (doesn't fail if no token)
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      const user = getUserById(payload.userId);

      if (user) {
        req.user = payload;
      }
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}

// Rate limiting per user
const userRequestCounts = new Map<number, { count: number; resetTime: number }>();

export function userRateLimit(maxRequests: number = 100, windowMinutes: number = 15) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.userId;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    const userLimit = userRequestCounts.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or create new limit
      userRequestCounts.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (userLimit.count >= maxRequests) {
      logger.warn('User rate limit exceeded', {
        userId,
        count: userLimit.count,
        maxRequests,
      });
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
      });
    }

    userLimit.count++;
    next();
  };
}

// Cleanup old rate limit entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [userId, limit] of userRequestCounts.entries()) {
    if (now > limit.resetTime) {
      userRequestCounts.delete(userId);
    }
  }
}, 60 * 60 * 1000);
