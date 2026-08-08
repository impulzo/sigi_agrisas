import { customerQuickAddSchema } from "../../../../app/(private)/pos/_logic/schemas/customerQuickAdd.schema";

const BASE = {
  code: "CLI001",
  name: "Cliente ACME",
  rfc: "SAC120101A12",
};

describe("customerQuickAddSchema — taxRegime y cfdiUse", () => {
  it("acepta régimen fiscal de 3 dígitos", () => {
    const parsed = customerQuickAddSchema.safeParse({ ...BASE, taxRegime: "601" });
    expect(parsed.success).toBe(true);
  });

  it("acepta uso CFDI de 4 caracteres (CP01 y CN01)", () => {
    for (const cfdiUse of ["CP01", "CN01"]) {
      const parsed = customerQuickAddSchema.safeParse({ ...BASE, cfdiUse });
      expect(parsed.success).toBe(true);
    }
  });

  it("rechaza uso CFDI sin dígitos finales (G03X)", () => {
    const parsed = customerQuickAddSchema.safeParse({ ...BASE, cfdiUse: "G03X" });
    expect(parsed.success).toBe(false);
  });
});
