/**
 * Money utilities. All financial amounts are stored as integer cents (KES * 100)
 * to avoid floating-point arithmetic.
 */

export function toCents(amount: number | string): number {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) throw new Error(`Invalid amount: ${amount}`);
  return Math.round(n * 100);
}

export function fromCents(cents: number): number {
  if (!Number.isInteger(cents)) throw new Error(`Cents must be an integer: ${cents}`);
  return cents / 100;
}

export function addCents(...values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function multiplyCents(cents: number, quantity: number): number {
  return Math.round(cents * quantity);
}

export function formatKES(cents: number): string {
  return `KES ${(cents / 100).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}