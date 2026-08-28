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

  it("colapsa espacio entre dígito y unidad corta — mismo valor con o sin espacio", () => {
    expect(normalizeProductNameForMatching("ATP UP DE 10L")).toBe(normalizeProductNameForMatching("ATP UP 10 L"));
    expect(normalizeProductNameForMatching("ATP UP DE 10L")).toBe("ATP UP 10L");
  });

  it("colapsa dígito+unidad de 2 letras (KG)", () => {
    expect(normalizeProductNameForMatching("MYCOROOT DE 1KG")).toBe(normalizeProductNameForMatching("MYCOROOT 1 KG"));
  });

  it("no colapsa dígito seguido de palabra larga (no es unidad)", () => {
    expect(normalizeProductNameForMatching("FIAT 25 4 TIEMPOS")).toBe("FIAT 25 4 TIEMPOS");
  });

  it("no colapsa espacio entre palabras completas sin dígito", () => {
    expect(normalizeProductNameForMatching("CARBOXY MIN L")).toBe("CARBOXY MIN L");
  });
});
