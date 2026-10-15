import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../../common/errors/AppError.js';
import { getEnv } from '../../config/env.js';
import type { AccessTokenPayload } from '../../common/types/auth.js';
import { ROLES, type Role } from '../../common/constants/roles.js';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(AppError.unauthorized('Missing or invalid authorization header'));
  }

  try {
    const env = getEnv();
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'mavunoiq',
      audience: 'mavunoiq-api',
    }) as AccessTokenPayload;

    if (payload.type !== 'access') throw AppError.unauthorized('Invalid token type');

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      isEmailVerified: true,
      isActive: true,
    };
    return next();
  } catch {
    return next(AppError.unauthorized('Invalid or expired token'));
  }
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? '';
  if (!header.startsWith('Bearer ')) return next();
  return authenticate(req, _res, next);
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden('Insufficient permissions'));
    return next();
  };
}

export const requireAdmin = requireRole(ROLES.ADMIN);