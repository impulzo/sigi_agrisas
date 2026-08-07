export class SatUuidAlreadyExistsError extends Error {
  readonly existingPurchaseFolio: string | null;

  constructor(existingPurchaseFolio: string | null = null) {
    super("A purchase with this SAT UUID already exists");
    this.name = "SatUuidAlreadyExistsError";
    this.existingPurchaseFolio = existingPurchaseFolio;
  }
}
