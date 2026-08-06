export class DosificationPriceCalculator {
  static computeUnitPrice(basePrice: number, numParts: number, surchargePct: number): number {
    if (numParts < 1) {
      throw new Error("numParts debe ser >= 1");
    }
    const perPart = basePrice / numParts;
    return perPart * (1 + surchargePct / 100);
  }
}
