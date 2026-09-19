/* The pure core. Every rule the service applies lives here, where it can be
   tested in microseconds. See /practices/writing-testable-code. */

export interface Line {
  sku: string;
  unitCents: number;
  quantity: number;
}

export const SHIPPING_STANDARD_CENTS = 395;
export const FREE_SHIPPING_THRESHOLD_CENTS = 5_000;

export function subtotalCents(lines: Line[]): number {
  return lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);
}

/** Free at or above the threshold. The boundary is the whole point. */
export function shippingCents(subtotal: number, tier: 'standard' | 'gold'): number {
  if (tier === 'gold') return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_STANDARD_CENTS;
}

export function totalCents(lines: Line[], tier: 'standard' | 'gold'): number {
  const subtotal = subtotalCents(lines);
  return subtotal + shippingCents(subtotal, tier);
}
