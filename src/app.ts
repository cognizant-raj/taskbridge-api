import express, { Express, Request, Response, NextFunction } from 'express';
import { requestIdMiddleware, errorHandler, authenticateJWT } from './shared/middleware';
import { logInfo, logError } from './shared/logger';
import auditRouter from './audit/controller';
import notificationRouter from './notification/controller';
import projectRouter from './project/controller';

/**
 * Initialize Express application with middleware and routes
 */
export function createApp(): Express {
  const app = express();

  // Global middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request tracking
  app.use(requestIdMiddleware);

  // Health check endpoint (no auth required)
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // Logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    logInfo(
      {
        method: req.method,
        path: req.path,
        requestId: req.id,
      },
      `Incoming ${req.method} ${req.path}`
    );
    next();
  });

  // API Routes
  app.use('/api', auditRouter);
  app.use('/api', notificationRouter);
  app.use('/api', projectRouter);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
      },
      requestId: req.id,
    });
  });

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the Express server
 */
export async function startServer(): Promise<void> {
  const app = createApp();
  const PORT = process.env.PORT || 3000;

  const server = app.listen(PORT, () => {
    logInfo(
      { port: PORT, environment: process.env.NODE_ENV || 'development' },
      `Server started successfully on port ${PORT}`
    );
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logInfo({}, 'SIGTERM signal received: closing HTTP server');
    server.close(() => {
      logInfo({}, 'HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logInfo({}, 'SIGINT signal received: closing HTTP server');
    server.close(() => {
      logInfo({}, 'HTTP server closed');
      process.exit(0);
    });
  });
}

// Only start server if this file is run directly
if (require.main === module) {
  startServer().catch((error) => {
    logError(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to start server'
    );
    process.exit(1);
  });
}
