import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, AuthorizationError } from './errors';
import { logWarn } from './logger';

/**
 * Extract org ID from request context
 * In production, this would come from JWT token verification
 */
export interface AuthenticatedRequest extends Request {
  userId?: string;
  orgId?: string;
  userEmail?: string;
  userIpAddress?: string;
}

/**
 * Mock authentication middleware
 * In production, this would verify JWT tokens
 */
export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    // Mock token parsing - in production, use jsonwebtoken
    const token = authHeader.substring(7);
    if (token === 'invalid') {
      throw new AuthenticationError('Invalid token');
    }

    // Mock user context - in production, extract from decoded JWT
    req.userId = 'user-' + token.substring(0, 8);
    req.orgId = 'org-' + token.substring(8, 16);
    req.userEmail = 'user@example.com';
    req.userIpAddress = req.ip || '127.0.0.1';

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
        },
        requestId: req.id,
      });
    } else {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authentication failed',
        },
        requestId: req.id,
      });
    }
  }
}

/**
 * Error handling middleware
 */
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof Error) {
    if (err instanceof AuthorizationError) {
      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
        requestId: req.id,
      });
    } else if ('statusCode' in err) {
      const appErr = err as { statusCode: number; code: string; details?: Record<string, unknown> };
      res.status(appErr.statusCode).json({
        error: {
          code: appErr.code,
          message: err.message,
          details: appErr.details,
        },
        requestId: req.id,
      });
    } else {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        requestId: req.id,
      });
    }
  } else {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unknown error occurred',
      },
      requestId: req.id,
    });
  }
}

/**
 * Request ID middleware
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.id = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  next();
}
