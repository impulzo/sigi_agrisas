export function inventoryQuantityOf(quantity: number, numPartsSnapshot: number | null): number {
  return numPartsSnapshot ? quantity / numPartsSnapshot : quantity;
}
