export const PRODUCT_UNITS = ['kg', 'tonne', 'crate', 'bag', 'litre', 'piece'] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export const QUALITY_GRADES = ['A', 'B', 'C', 'ungraded'] as const;
export type QualityGrade = (typeof QUALITY_GRADES)[number];

export const FARMING_METHODS = [
  'conventional',
  'organic',
  'greenhouse',
  'irrigated',
  'rain-fed',
  'hydroponic',
] as const;
export type FarmingMethod = (typeof FARMING_METHODS)[number];

export const ORDER_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'IN_TRANSIT',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'UNPAID',
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const VERIFICATION_STATUSES = ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const PRODUCT_STATUSES = ['DRAFT', 'PUBLISHED', 'SUSPENDED', 'ARCHIVED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const BUYER_TYPES = [
  'individual',
  'retailer',
  'hotel_restaurant',
  'school_institution',
  'processor',
  'wholesaler',
  'agri_business',
] as const;
export type BuyerType = (typeof BUYER_TYPES)[number];