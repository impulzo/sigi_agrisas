import {
  buildSatApplyResult,
  extractProductNameFromDescripcion,
} from "../../../../../../../app/(private)/purchases/_logic/lib/satInvoiceMapping";
import type { ParsedSatInvoice, SatConcepto } from "../../../../../../../app/(private)/purchases/_logic/lib/satXmlParser";
import type { ProductDto } from "../../../../../../../app/(private)/purchases/_logic/types/api";
import type { PaymentMethodOption } from "../../../../../../../app/_hooks/usePaymentMethodsOptions";
import { searchProductsByName } from "../../../../../../../app/(private)/purchases/_logic/services/searchProductsByName";

jest.mock("../../../../../../../app/(private)/purchases/_logic/services/searchProductsByName");

const mockedSearch = searchProductsByName as jest.MockedFunction<typeof searchProductsByName>;

function makeConcepto(overrides: Partial<SatConcepto> = {}): SatConcepto {
  return {
    claveProdServ: "10171600",
    noIdentificacion: "40.04.01",
    cantidad: 10,
    claveUnidad: "LTR",
    unidad: "L",
    descripcion: "[40.04.01] AMINOGREEN K",
    valorUnitario: 285.075,
    importe: 2850.75,
    traslados: [],
    ...overrides,
  };
}

function makeInvoice(conceptos: SatConcepto[]): ParsedSatInvoice {
  return {
    version: "4.0",
    serie: "A",
    folio: "15269",
    fecha: "2026-07-21T10:42:36",
    formaPago: "99",
    metodoPago: "PPD",
    moneda: "MXN",
    subTotal: null,
    total: null,
    tipoDeComprobante: "I",
    uuid: "788110F9-B247-5374-94D1-8E9FA34B8015",
    emisor: { rfc: "AME0707181W1", nombre: "AGRINOVA MEXICO", regimenFiscal: "601" },
    receptor: { rfc: "OIRI8506123Y7", nombre: "IVAN ENRIQUE OLIVERA RAMIREZ" },
    conceptos,
    trasladosComprobante: [],
  };
}

function makeProduct(overrides: Partial<ProductDto> = {}): ProductDto {
  return {
    id: "prod-amk",
    code: "AMK",
    name: "AMINOGREEN K 1LT",
    unit: "LTR",
    ivaRate: 0.16,
    iepsRate: null,
    isActive: true,
    ...overrides,
  };
}

const noPaymentMethods: PaymentMethodOption[] = [];

beforeEach(() => {
  mockedSearch.mockReset();
});

describe("extractProductNameFromDescripcion", () => {
  it("quita el prefijo [NoIdentificacion] cuando está presente", () => {
    expect(extractProductNameFromDescripcion("[40.04.01] AMINOGREEN K")).toBe("AMINOGREEN K");
  });

  it("devuelve la descripción tal cual cuando no hay prefijo entre corchetes", () => {
    expect(extractProductNameFromDescripcion("AMINOGREEN K")).toBe("AMINOGREEN K");
  });
});

describe("buildSatApplyResult", () => {
  it("1 candidato único por nombre genera línea con producto, cantidad y costo correctos", async () => {
    const producto = makeProduct();
    mockedSearch.mockResolvedValue([producto]);

    const result = await buildSatApplyResult(
      makeInvoice([makeConcepto({ cantidad: 128, valorUnitario: 285.075 })]),
      noPaymentMethods,
      "factura.xml"
    );

    expect(result.lines).toEqual([{ product: producto, quantity: 128, unitCost: 285.075 }]);
    expect(result.unmatched).toEqual([]);
  });

  it("dos conceptos con nombres distintos (mismo claveProdServ) generan dos líneas separadas", async () => {
    const aminogreen = makeProduct({ id: "prod-amk", name: "AMINOGREEN K 1LT" });
    const algimel = makeProduct({ id: "prod-alg", code: "ALGM500", name: "ALGIMEL 500 GR", unit: "KGM" });

    mockedSearch.mockImplementation(async (name: string) => {
      if (name === "AMINOGREEN K") return [aminogreen];
      if (name === "ALGIMEL") return [algimel];
      return [];
    });

    const result = await buildSatApplyResult(
      makeInvoice([
        makeConcepto({ descripcion: "[40.04.01] AMINOGREEN K", cantidad: 128, valorUnitario: 285.075 }),
        makeConcepto({
          descripcion: "[90.13.50] ALGIMEL",
          claveUnidad: "KGM",
          cantidad: 24,
          valorUnitario: 348.75,
        }),
      ]),
      noPaymentMethods,
      "factura.xml"
    );

    expect(result.lines).toHaveLength(2);
    expect(result.lines.map((l) => l.product.id).sort()).toEqual(["prod-alg", "prod-amk"]);
    expect(result.unmatched).toEqual([]);
  });

  it("dos conceptos que resuelven al mismo producto se agregan en una sola línea con cantidad sumada", async () => {
    const producto = makeProduct();
    mockedSearch.mockResolvedValue([producto]);

    const result = await buildSatApplyResult(
      makeInvoice([
        makeConcepto({ cantidad: 10, valorUnitario: 285.075 }),
        makeConcepto({ cantidad: 5, valorUnitario: 285.075 }),
      ]),
      noPaymentMethods,
      "factura.xml"
    );

    expect(result.lines).toEqual([{ product: producto, quantity: 15, unitCost: 285.075 }]);
  });

  it("concepto sin candidatos cae a unmatched", async () => {
    mockedSearch.mockResolvedValue([]);

    const concepto = makeConcepto({ descripcion: "[99.99.99] PRODUCTO INEXISTENTE" });
    const result = await buildSatApplyResult(makeInvoice([concepto]), noPaymentMethods, "factura.xml");

    expect(result.lines).toEqual([]);
    expect(result.unmatched).toEqual([concepto]);
  });

  it("≥2 candidatos con claveUnidad que desempata a exactamente 1 usa ese candidato", async () => {
    const bufalo20L = makeProduct({ id: "prod-buf20", code: "BUF20", name: "BUFALO 20 L", unit: "LTR" });
    const bufaloSolido = makeProduct({ id: "prod-bufso", code: "BUFSO", name: "BUFALO SOLID 5KG", unit: "KGM" });
    mockedSearch.mockResolvedValue([bufalo20L, bufaloSolido]);

    const result = await buildSatApplyResult(
      makeInvoice([makeConcepto({ descripcion: "[50.02.20] BUFALO", claveUnidad: "LTR", cantidad: 40 })]),
      noPaymentMethods,
      "factura.xml"
    );

    expect(result.lines).toEqual([{ product: bufalo20L, quantity: 40, unitCost: 285.075 }]);
    expect(result.unmatched).toEqual([]);
  });

  it("≥2 candidatos sin desempate posible cae a unmatched con warning de ambigüedad", async () => {
    const bufalo1 = makeProduct({ id: "prod-buf1", code: "BUFA1LT", name: "BUFALO 1L", unit: "LTR" });
    const bufalo2 = makeProduct({ id: "prod-buf20", code: "BUF20", name: "BUFALO 20 L", unit: "LTR" });
    mockedSearch.mockResolvedValue([bufalo1, bufalo2]);

    const concepto = makeConcepto({ descripcion: "[50.02.20] BUFALO", claveUnidad: "LTR" });
    const result = await buildSatApplyResult(makeInvoice([concepto]), noPaymentMethods, "factura.xml");

    expect(result.lines).toEqual([]);
    expect(result.unmatched).toEqual([concepto]);
    expect(result.warnings.some((w) => w.toLowerCase().includes("ambig"))).toBe(true);
  });

  it("descripción sin prefijo [...] se usa tal cual como término de búsqueda", async () => {
    const producto = makeProduct();
    mockedSearch.mockResolvedValue([producto]);

    await buildSatApplyResult(
      makeInvoice([makeConcepto({ descripcion: "AMINOGREEN K" })]),
      noPaymentMethods,
      "factura.xml"
    );

    expect(mockedSearch).toHaveBeenCalledWith("AMINOGREEN K");
  });

  it("nombre extraído con menos de 2 caracteres cae a unmatched sin llamar al servicio de búsqueda", async () => {
    const concepto = makeConcepto({ descripcion: "[40.04.01] X" });
    const result = await buildSatApplyResult(makeInvoice([concepto]), noPaymentMethods, "factura.xml");

    expect(mockedSearch).not.toHaveBeenCalled();
    expect(result.lines).toEqual([]);
    expect(result.unmatched).toEqual([concepto]);
  });
});
