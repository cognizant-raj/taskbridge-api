import pino from 'pino';

/**
 * Structured logger using Pino
 * All logging must use this instance with structured context
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

/**
 * Log info level with structured context
 * @param context - Structured log context object
 * @param message - Human-readable message
 */
export function logInfo(context: Record<string, unknown>, message: string): void {
  logger.info(context, message);
}

/**
 * Log warning level with structured context
 * @param context - Structured log context object
 * @param message - Human-readable message
 */
export function logWarn(context: Record<string, unknown>, message: string): void {
  logger.warn(context, message);
}

/**
 * Log error level with structured context
 * @param context - Structured log context object
 * @param message - Human-readable message
 */
export function logError(context: Record<string, unknown>, message: string): void {
  logger.error(context, message);
}

/**
 * Log debug level with structured context
 * @param context - Structured log context object
 * @param message - Human-readable message
 */
export function logDebug(context: Record<string, unknown>, message: string): void {
  logger.debug(context, message);
}
