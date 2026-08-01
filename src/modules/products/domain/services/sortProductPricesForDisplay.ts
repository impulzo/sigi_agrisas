import { ProductPrice } from "../entities/ProductPrice";

function priorityOf(price: ProductPrice): number {
  if (price.isDefault) return 0;
  if (/subdis/i.test(price.name)) return 1;
  if (/distri/i.test(price.name)) return 2;
  return 3;
}

export function sortProductPricesForDisplay(prices: ProductPrice[]): ProductPrice[] {
  return [...prices].sort((a, b) => {
    const rankDiff = priorityOf(a) - priorityOf(b);
    if (rankDiff !== 0) return rankDiff;
    return a.name.localeCompare(b.name);
  });
}
