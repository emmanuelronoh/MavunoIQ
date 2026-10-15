import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { AppError } from '../errors/AppError.js';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodTypeAny, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      // Assign back parsed (with coercions applied)
      (req as unknown as Record<Source, unknown>)[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(AppError.validation('Validation failed', err.issues));
      } else {
        next(err);
      }
    }
  };
}

export function validateMultiple(schemas: Partial<Record<Source, ZodTypeAny>>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      for (const [source, schema] of Object.entries(schemas)) {
        if (!schema) continue;
        const parsed = schema.parse(req[source as Source]);
        (req as unknown as Record<Source, unknown>)[source as Source] = parsed;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(AppError.validation('Validation failed', err.issues));
      } else {
        next(err);
      }
    }
  };
}