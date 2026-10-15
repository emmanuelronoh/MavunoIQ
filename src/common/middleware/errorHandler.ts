import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../errors/AppError.js';
import { logger } from '../../config/logger.js';
import { isProd } from '../../config/env.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = (req as Request & { id?: string }).id;

  // Zod validation
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
        code: i.code,
      })),
      requestId,
    });
    return;
  }

  // Mongoose validation
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(422).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: Object.values(err.errors).map((e) => ({
        path: e.path,
        message: e.message,
      })),
      requestId,
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      message: `Invalid ${err.path}`,
      code: 'BAD_REQUEST',
      requestId,
    });
    return;
  }

  if ((err as { code?: number }).code === 11000) {
    const dup = err as { keyValue?: Record<string, unknown> };
    res.status(409).json({
      success: false,
      message: 'Duplicate resource',
      code: 'CONFLICT',
      errors: dup.keyValue ? [dup.keyValue] : undefined,
      requestId,
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId, path: req.originalUrl }, err.message);
    } else {
      logger.warn({ requestId, path: req.originalUrl, code: err.code }, err.message);
    }
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      errors: err.errors,
      requestId,
    });
    return;
  }

  // Unknown error
  const anyErr = err as Error;
  logger.error({ err: anyErr, requestId, path: req.originalUrl }, 'Unhandled error');
  res.status(500).json({
    success: false,
    message: isProd() ? 'Internal server error' : anyErr.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
    requestId,
    ...(isProd() ? {} : { stack: anyErr.stack }),
  });
}