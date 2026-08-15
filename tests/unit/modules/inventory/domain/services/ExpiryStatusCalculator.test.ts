import { ExpiryStatusCalculator } from "@/modules/inventory/domain/services/ExpiryStatusCalculator";

const NOW = new Date("2026-08-14T00:00:00.000Z");

function daysFromNow(days: number): Date {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
}

describe("ExpiryStatusCalculator", () => {
  it("returns null when there is no expiration date", () => {
    expect(ExpiryStatusCalculator.compute(null, NOW)).toBeNull();
  });

  it("returns ok when more than 30 days remain", () => {
    expect(ExpiryStatusCalculator.compute(daysFromNow(45), NOW)).toBe("ok");
  });

  it("returns ok at the 31-day boundary", () => {
    expect(ExpiryStatusCalculator.compute(daysFromNow(31), NOW)).toBe("ok");
  });

  it("returns warning at the 30-day boundary", () => {
    expect(ExpiryStatusCalculator.compute(daysFromNow(30), NOW)).toBe("warning");
  });

  it("returns warning when 15 days remain", () => {
    expect(ExpiryStatusCalculator.compute(daysFromNow(15), NOW)).toBe("warning");
  });

  it("returns warning at the 8-day boundary", () => {
    expect(ExpiryStatusCalculator.compute(daysFromNow(8), NOW)).toBe("warning");
  });

  it("returns critical at the 7-day boundary", () => {
    expect(ExpiryStatusCalculator.compute(daysFromNow(7), NOW)).toBe("critical");
  });

  it("returns critical when 3 days remain", () => {
    expect(ExpiryStatusCalculator.compute(daysFromNow(3), NOW)).toBe("critical");
  });

  it("returns critical when already expired", () => {
    expect(ExpiryStatusCalculator.compute(daysFromNow(-5), NOW)).toBe("critical");
  });

  it("stays ok at the 31-day boundary regardless of time-of-day", () => {
    const laterSameDay = new Date("2026-08-14T23:59:59.999Z");
    expect(ExpiryStatusCalculator.compute(daysFromNow(31), laterSameDay)).toBe("ok");
  });
});
