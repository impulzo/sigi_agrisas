export type ExpiryStatus = "ok" | "warning" | "critical";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class ExpiryStatusCalculator {
  static compute(expirationDate: Date | null, now: Date): ExpiryStatus | null {
    if (!expirationDate) return null;

    const expirationUtcMidnight = Date.UTC(
      expirationDate.getUTCFullYear(),
      expirationDate.getUTCMonth(),
      expirationDate.getUTCDate()
    );
    const nowUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const diffDays = Math.floor((expirationUtcMidnight - nowUtcMidnight) / MS_PER_DAY);
    if (diffDays > 30) return "ok";
    if (diffDays >= 8) return "warning";
    return "critical";
  }
}
