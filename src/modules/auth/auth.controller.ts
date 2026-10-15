import type { Request, Response } from 'express';
import * as authService from './auth.service.js';
import { AppError } from '../../common/errors/AppError.js';
import { getEnv, isProd } from '../../config/env.js';
import { created, ok } from '../../common/utils/apiResponse.js';
import { logger } from '../../config/logger.js';
import { emailProvider } from '../../integrations/email/index.js';
import crypto from 'node:crypto';
import { User } from '../users/user.model.js';
import { verifyPassword, hashPassword, revokeAllForUser } from './auth.service.js';

const REFRESH_COOKIE = 'mavunoiq_rt';

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  const env = getEnv();
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE || isProd(),
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN,
    expires: expiresAt,
    path: '/',
  });
}

function clearRefreshCookie(res: Response) {
  const env = getEnv();
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.COOKIE_SECURE || isProd(),
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN,
    path: '/',
  });
}

function publicUser(u: { _id: unknown; email: string; firstName: string; lastName: string; role: string; isEmailVerified: boolean; avatarUrl?: string; phone?: string }) {
  return {
    id: String(u._id),
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    isEmailVerified: u.isEmailVerified,
    avatarUrl: u.avatarUrl,
    phone: u.phone,
  };
}

export async function register(req: Request, res: Response) {
  const user = await authService.register(req.body);

  // Generate verification token
  const token = crypto.randomBytes(32).toString('hex');
  await User.updateOne(
    { _id: user._id },
    {
      emailVerificationToken: token,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  );

  const env = getEnv();
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  await emailProvider.send({
    to: user.email,
    subject: 'Verify your MavunoIQ account',
    text: `Welcome to MavunoIQ! Verify your email: ${verifyUrl}`,
    html: `<p>Welcome to MavunoIQ!</p><p><a href="${verifyUrl}">Verify your email</a></p>`,
  });

  return created(res, { user: publicUser(user) }, 'Registration successful. Please verify your email.');
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const meta = { userAgent: req.header('user-agent'), ip: req.ip };
  const { user, tokens } = await authService.login(email, password, meta);
  setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresAt);
  return ok(
    res,
    {
      user: publicUser(user),
      accessToken: tokens.accessToken,
      accessTokenExpiresIn: tokens.accessTokenExpiresIn,
    },
    'Login successful',
  );
}

export async function refresh(req: Request, res: Response) {
  const cookieToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  const bodyToken = req.body?.refreshToken as string | undefined;
  const token = cookieToken || bodyToken;
  if (!token) throw AppError.unauthorized('No refresh token provided');

  const meta = { userAgent: req.header('user-agent'), ip: req.ip };
  const { user, tokens } = await authService.refresh(token, meta);
  setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresAt);
  return ok(
    res,
    {
      user: publicUser(user),
      accessToken: tokens.accessToken,
      accessTokenExpiresIn: tokens.accessTokenExpiresIn,
    },
    'Token refreshed',
  );
}

export async function logout(req: Request, res: Response) {
  const cookieToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  const bodyToken = req.body?.refreshToken as string | undefined;
  await authService.logout(cookieToken || bodyToken);
  clearRefreshCookie(res);
  return ok(res, null, 'Logged out');
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.user!.id);
  if (!user) throw AppError.notFound('User not found');
  return ok(res, { user: publicUser(user) }, 'Current user');
}

export async function verifyEmail(req: Request, res: Response) {
  const { token } = req.body;
  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) throw AppError.badRequest('Invalid or expired verification token');

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return ok(res, { user: publicUser(user) }, 'Email verified');
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  // Always return success to prevent account enumeration
  if (user && user.isActive) {
    const token = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const env = getEnv();
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    await emailProvider.send({
      to: user.email,
      subject: 'Reset your MavunoIQ password',
      text: `Reset your password: ${resetUrl}`,
      html: `<p><a href="${resetUrl}">Reset your password</a> (valid for 1 hour)</p>`,
    });
  }
  return ok(res, null, 'If that email exists, a reset link has been sent.');
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body;
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) throw AppError.badRequest('Invalid or expired reset token');

  user.passwordHash = await hashPassword(password);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await revokeAllForUser(String(user._id));
  logger.info({ userId: String(user._id) }, 'Password reset completed');

  return ok(res, null, 'Password reset successful');
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user!.id).select('+passwordHash');
  if (!user) throw AppError.notFound('User not found');

  const okPass = await verifyPassword(user.passwordHash, currentPassword);
  if (!okPass) throw AppError.unauthorized('Current password is incorrect');

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  await revokeAllForUser(String(user._id));

  return ok(res, null, 'Password changed. Please log in again.');
}