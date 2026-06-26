import { FolioScopeMismatchError } from "@/shared/domain/errors/FolioScopeMismatchError";

describe("FolioScopeMismatchError", () => {
  it("es instanceof Error", () => {
    const err = new FolioScopeMismatchError("POS", "OPERATIONS");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(FolioScopeMismatchError);
  });

  it("expone expected y actual", () => {
    const err = new FolioScopeMismatchError("OPERATIONS", "POS");
    expect(err.expected).toBe("OPERATIONS");
    expect(err.actual).toBe("POS");
  });

  it("tiene name FolioScopeMismatchError", () => {
    const err = new FolioScopeMismatchError("POS", "INVENTORY");
    expect(err.name).toBe("FolioScopeMismatchError");
  });

  it("mensaje indica expected y actual", () => {
    const err = new FolioScopeMismatchError("POS", "OPERATIONS");
    expect(err.message).toContain("POS");
    expect(err.message).toContain("OPERATIONS");
  });
});
