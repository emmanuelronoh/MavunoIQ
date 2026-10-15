export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'PAYMENT_ERROR'
  | 'PROVIDER_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly errors?: unknown[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code: ErrorCode = 'INTERNAL_ERROR',
    errors?: unknown[],
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message: string, errors?: unknown[]) {
    return new AppError(message, 400, 'BAD_REQUEST', errors);
  }
  static validation(message = 'Validation failed', errors?: unknown[]) {
    return new AppError(message, 422, 'VALIDATION_ERROR', errors);
  }
  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }
  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403, 'FORBIDDEN');
  }
  static notFound(message = 'Resource not found') {
    return new AppError(message, 404, 'NOT_FOUND');
  }
  static conflict(message: string) {
    return new AppError(message, 409, 'CONFLICT');
  }
  static rateLimited(message = 'Too many requests') {
    return new AppError(message, 429, 'RATE_LIMITED');
  }
  static serviceUnavailable(message = 'Service unavailable') {
    return new AppError(message, 503, 'SERVICE_UNAVAILABLE');
  }
  static provider(message = 'External provider error') {
    return new AppError(message, 502, 'PROVIDER_ERROR');
  }
  static internal(message = 'Internal server error') {
    return new AppError(message, 500, 'INTERNAL_ERROR', undefined, false);
  }
}