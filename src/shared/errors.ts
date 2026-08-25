/**
 * Base application error class
 */
export class ApplicationError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, ApplicationError.prototype);
  }
}

/**
 * Validation error - 400 Bad Request
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Not found error - 404 Not Found
 */
export class NotFoundError extends ApplicationError {
  constructor(message: string) {
    super('NOT_FOUND', message, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Authorization error - 403 Forbidden
 */
export class AuthorizationError extends ApplicationError {
  constructor(message: string) {
    super('FORBIDDEN', message, 403);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Authentication error - 401 Unauthorized
 */
export class AuthenticationError extends ApplicationError {
  constructor(message: string) {
    super('UNAUTHORIZED', message, 401);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Conflict error - 409 Conflict
 */
export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Internal server error - 500 Internal Server Error
 */
export class InternalServerError extends ApplicationError {
  constructor(message: string) {
    super('INTERNAL_ERROR', message, 500);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}
