import { resolveSatDescription } from "../../../../src/modules/billing/application/services/resolveSatDescription";

describe("resolveSatDescription", () => {
  it("returns 'code - description' on exact match", async () => {
    const useCase = { execute: jest.fn().mockResolvedValue({ items: [{ code: "601", description: "General de Ley Personas Morales" }] }) };
    await expect(resolveSatDescription(useCase, "601")).resolves.toBe("601 - General de Ley Personas Morales");
  });

  it("falls back to the raw code when no exact match is found", async () => {
    const useCase = { execute: jest.fn().mockResolvedValue({ items: [] }) };
    await expect(resolveSatDescription(useCase, "999")).resolves.toBe("999");
  });

  it("falls back to the raw code when search returns a different code (substring false-positive guard)", async () => {
    const useCase = { execute: jest.fn().mockResolvedValue({ items: [{ code: "6011", description: "Otro régimen" }] }) };
    await expect(resolveSatDescription(useCase, "601")).resolves.toBe("601");
  });

  it("returns the empty code as-is without calling the use case", async () => {
    const useCase = { execute: jest.fn() };
    await expect(resolveSatDescription(useCase, "")).resolves.toBe("");
    expect(useCase.execute).not.toHaveBeenCalled();
  });
});
