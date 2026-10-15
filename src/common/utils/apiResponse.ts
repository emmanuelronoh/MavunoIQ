import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function ok<T>(
  res: Response,
  data: T,
  message = 'Success',
  status = 200,
  meta?: PaginationMeta | Record<string, unknown>,
): Response {
  return res.status(status).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function created<T>(res: Response, data: T, message = 'Created'): Response {
  return ok(res, data, message, 201);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

export function buildPagination(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function parsePagination(
  query: Record<string, unknown>,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {},
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, Number(query.page) || defaults.page || 1);
  const maxLimit = defaults.maxLimit ?? 100;
  const limit = Math.min(maxLimit, Math.max(1, Number(query.limit) || defaults.limit || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}