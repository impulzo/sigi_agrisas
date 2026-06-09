export const DOSIFICATION_SURCHARGE_PCT = 7.0;

export class DosificationPriceCalculator {
  static computeUnitPrice(basePrice: number, numParts: number): number {
    if (numParts < 1) {
      throw new Error("numParts debe ser >= 1");
    }
    const perPart = basePrice / numParts;
    return perPart * (1 + DOSIFICATION_SURCHARGE_PCT / 100);
  }
}
