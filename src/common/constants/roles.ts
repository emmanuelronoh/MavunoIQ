export const ROLES = {
  FARMER: 'FARMER',
  BUYER: 'BUYER',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PUBLIC_REGISTRATION_ROLES: Role[] = [ROLES.FARMER, ROLES.BUYER];