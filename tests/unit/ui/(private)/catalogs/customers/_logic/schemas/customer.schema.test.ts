import { createCustomerSchema, updateCustomerSchema } from "../../../../../../../../app/(private)/catalogs/customers/_logic/schemas/customer.schema";

const BASE = {
  code: "CLI_001",
  name: "Cliente ACME",
  rfc: "SAC120101A12",
};

describe("customer.schema — taxRegime y cfdiUse", () => {
  it("acepta régimen fiscal de 3 dígitos", () => {
    const parsed = createCustomerSchema.safeParse({ ...BASE, taxRegime: "601" });
    expect(parsed.success).toBe(true);
  });

  it("rechaza régimen fiscal no numérico", () => {
    const parsed = createCustomerSchema.safeParse({ ...BASE, taxRegime: "AB" });
    expect(parsed.success).toBe(false);
  });

  it("acepta uso CFDI clásico de 3 caracteres (G03)", () => {
    const parsed = createCustomerSchema.safeParse({ ...BASE, cfdiUse: "G03" });
    expect(parsed.success).toBe(true);
  });

  it("acepta uso CFDI de 4 caracteres (CP01 y CN01)", () => {
    for (const cfdiUse of ["CP01", "CN01"]) {
      const parsed = createCustomerSchema.safeParse({ ...BASE, cfdiUse });
      expect(parsed.success).toBe(true);
    }
  });

  it("rechaza uso CFDI sin dígitos finales (G03X)", () => {
    const parsed = createCustomerSchema.safeParse({ ...BASE, cfdiUse: "G03X" });
    expect(parsed.success).toBe(false);
  });

  it("updateCustomerSchema comparte las mismas reglas de cfdiUse", () => {
    const parsed = updateCustomerSchema.safeParse({ cfdiUse: "CP01" });
    expect(parsed.success).toBe(true);
  });
});
