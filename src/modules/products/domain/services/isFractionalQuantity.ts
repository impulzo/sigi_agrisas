/** Quantities are persisted as Decimal(14,4); round to that scale before checking
 * for a whole number so float noise (e.g. 2.9999999999996) doesn't misclassify. */
export function isFractionalQuantity(quantity: number): boolean {
  return Math.round(quantity * 10000) % 10000 !== 0;
}
