import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, AuthorizationError } from './errors';
import jwt, { JwtPayload } from 'jsonwebtoken';

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

interface TaskBridgeJwtPayload extends JwtPayload {
  sub: string;
  orgId: string;
  email?: string;
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

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new AuthenticationError('Authentication is not configured');
    let payload: TaskBridgeJwtPayload;
    try {
      payload = jwt.verify(token, jwtSecret) as TaskBridgeJwtPayload;
    } catch {
      throw new AuthenticationError('Invalid or expired token');
    }
    if (!payload.sub || !payload.orgId) throw new AuthenticationError('Token is missing identity claims');
    req.userId = payload.sub;
    req.orgId = payload.orgId;
    req.userEmail = payload.email;
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
 * Authenticate service-to-service requests using a dedicated shared token.
 * @param req - Incoming request
 * @param res - HTTP response
 * @param next - Express continuation
 */
export function authenticateInternalService(req: Request, res: Response, next: NextFunction): void {
  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;
  const suppliedToken = req.headers['x-internal-service-token'];

  if (!expectedToken || suppliedToken !== expectedToken) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Valid internal service credentials are required',
      },
      requestId: req.id,
    });
    return;
  }

  next();
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
