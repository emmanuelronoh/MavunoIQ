import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { User, type IUser } from '../users/user.model.js';
import { RefreshToken } from './refreshToken.model.js';
import { AppError } from '../../common/errors/AppError.js';
import { getEnv } from '../../config/env.js';
import { ROLES, type Role } from '../../common/constants/roles.js';
import type { AccessTokenPayload, RefreshTokenPayload } from '../../common/types/auth.js';
import { logger } from '../../config/logger.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresAt: Date;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

function signAccessToken(user: IUser): { token: string; expiresIn: number } {
  const env = getEnv();
  const payload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
    sub: String(user._id),
    email: user.email,
    role: user.role,
    type: 'access',
  };
  const token = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
    issuer: 'mavunoiq',
    audience: 'mavunoiq-api',
  });
  const decoded = jwt.decode(token) as { exp?: number };
  const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900;
  return { token, expiresIn };
}

async function issueRefreshToken(
  user: IUser,
  family: string,
  meta: { userAgent?: string; ip?: string },
): Promise<{ token: string; expiresAt: Date }> {
  const env = getEnv();
  const jti = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
    sub: String(user._id),
    jti,
    type: 'refresh',
  };
  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` as jwt.SignOptions['expiresIn'],
    issuer: 'mavunoiq',
    audience: 'mavunoiq-api',
  });

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(token),
    family,
    expiresAt,
    userAgent: meta.userAgent?.slice(0, 300),
    ip: meta.ip,
  });

  return { token, expiresAt };
}

export async function register(input: RegisterInput): Promise<IUser> {
  if (input.role === ROLES.ADMIN) {
    throw AppError.forbidden('Cannot self-register as admin');
  }
  if (![ROLES.FARMER, ROLES.BUYER].includes(input.role)) {
    throw AppError.badRequest('Invalid role for registration');
  }

  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) throw AppError.conflict('Email already registered');

  const passwordHash = await hashPassword(input.password);

  const user = await User.create({
    email: input.email.toLowerCase(),
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    role: input.role,
    isEmailVerified: false,
  });

  return user;
}

export async function login(
  email: string,
  password: string,
  meta: { userAgent?: string; ip?: string },
): Promise<{ user: IUser; tokens: TokenPair }> {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) throw AppError.unauthorized('Invalid email or password');
  if (!user.isActive) throw AppError.forbidden('Account is deactivated');

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) throw AppError.unauthorized('Invalid email or password');

  user.lastLoginAt = new Date();
  await user.save();

  const family = crypto.randomUUID();
  const { token: refreshToken, expiresAt } = await issueRefreshToken(user, family, meta);
  const { token: accessToken, expiresIn } = signAccessToken(user);

  return {
    user,
    tokens: {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: expiresIn,
      refreshTokenExpiresAt: expiresAt,
    },
  };
}

export async function refresh(
  incomingToken: string,
  meta: { userAgent?: string; ip?: string },
): Promise<{ user: IUser; tokens: TokenPair }> {
  const env = getEnv();
  let payload: RefreshTokenPayload;
  try {
    payload = jwt.verify(incomingToken, env.JWT_REFRESH_SECRET, {
      issuer: 'mavunoiq',
      audience: 'mavunoiq-api',
    }) as RefreshTokenPayload;
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  if (payload.type !== 'refresh') throw AppError.unauthorized('Invalid token type');

  const tokenHash = hashToken(incomingToken);
  const record = await RefreshToken.findOne({ tokenHash });
  if (!record) {
    // Possible token reuse / attack - revoke entire family
    await RefreshToken.updateMany(
      { family: payload.jti ? payload.jti : tokenHash },
      { revokedAt: new Date() },
    );
    throw AppError.unauthorized('Refresh token not recognized');
  }

  if (record.revokedAt) {
    // Reuse detection: revoke all tokens in this family
    logger.warn({ userId: String(record.user), family: record.family }, 'Refresh token reuse detected');
    await RefreshToken.updateMany({ family: record.family }, { revokedAt: new Date() });
    throw AppError.unauthorized('Refresh token has been revoked');
  }

  if (record.expiresAt.getTime() < Date.now()) {
    throw AppError.unauthorized('Refresh token expired');
  }

  const user = await User.findById(record.user);
  if (!user || !user.isActive) throw AppError.unauthorized('User not found or inactive');

  // Rotate
  const { token: newRefresh, expiresAt } = await issueRefreshToken(user, record.family, meta);
  record.revokedAt = new Date();
  record.replacedBy = hashToken(newRefresh);
  await record.save();

  const { token: accessToken, expiresIn } = signAccessToken(user);

  return {
    user,
    tokens: {
      accessToken,
      refreshToken: newRefresh,
      accessTokenExpiresIn: expiresIn,
      refreshTokenExpiresAt: expiresAt,
    },
  };
}

export async function logout(incomingToken?: string): Promise<void> {
  if (!incomingToken) return;
  const tokenHash = hashToken(incomingToken);
  await RefreshToken.updateOne({ tokenHash }, { revokedAt: new Date() });
}

export async function revokeAllForUser(userId: string): Promise<void> {
  await RefreshToken.updateMany({ user: userId, revokedAt: { $exists: false } }, { revokedAt: new Date() });
}