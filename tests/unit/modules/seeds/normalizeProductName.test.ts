import { normalizeProductNameForMatching } from "../../../../prisma/seeds/lib/normalizeProductName";

describe("normalizeProductNameForMatching", () => {
  it("quita el token de relleno DE", () => {
    expect(normalizeProductNameForMatching("ALGAK DE 1L")).toBe("ALGAK 1L");
  });

  it("quita el token de relleno DE en frases más largas", () => {
    expect(normalizeProductNameForMatching("ATP UP DE 1L")).toBe("ATP UP 1L");
  });

  it("no quita DE cuando es prefijo de otra palabra, no un token separado", () => {
    expect(normalizeProductNameForMatching("DESINFECTANTE X")).toBe("DESINFECTANTE X");
  });

  it("remueve acentos", () => {
    expect(normalizeProductNameForMatching("FERTILIZACIÓN")).toBe("FERTILIZACION");
  });

  it("colapsa espacios múltiples", () => {
    expect(normalizeProductNameForMatching("ALGAK   1L")).toBe("ALGAK 1L");
  });

  it("uppercase de entrada en minúsculas", () => {
    expect(normalizeProductNameForMatching("algak 1l")).toBe("ALGAK 1L");
  });

  it("quita CON y Y como tokens completos", () => {
    expect(normalizeProductNameForMatching("PRODUCTO CON Y SIN RELLENO")).toBe("PRODUCTO SIN RELLENO");
  });
});
