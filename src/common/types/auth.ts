import type { Role } from '../constants/roles.js';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  isEmailVerified: boolean;
  isActive: boolean;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}