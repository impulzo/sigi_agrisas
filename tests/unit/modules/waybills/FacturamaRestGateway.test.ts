import { FacturamaRestGateway } from "../../../../src/modules/waybills/infrastructure/services/FacturamaRestGateway";
import {
  FacturamaStampError,
  FacturamaCancelError,
  EmitterFiscalDataIncompleteError,
} from "../../../../src/modules/waybills/domain/errors";
import { getEmitterFiscalSettings } from "@/shared/infrastructure/emitter/emitterFiscalSettingsStore";

jest.mock("@/shared/infrastructure/emitter/emitterFiscalSettingsStore", () => ({
  getEmitterFiscalSettings: jest.fn(),
  isEmitterFiscalDataComplete: (data: Record<string, unknown> | null) =>
    !!data && !!data.rfc && !!data.legalName && !!data.fiscalRegime && !!data.zipCode,
}));

const mockedGetEmitterFiscalSettings = getEmitterFiscalSettings as jest.Mock;

const EMITTER = {
  rfc: "XAXX010101000",
  legalName: "Agrisas",
  fiscalRegime: "601",
  zipCode: "83000",
};

function mockFetch(responseData: unknown, status = 200) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 400 ? "Error" : "OK",
    headers: { get: () => "application/json" },
    json: () => Promise.resolve(responseData),
    text: () => Promise.resolve(JSON.stringify(responseData)),
  } as unknown as Response);
}

const BASE_OPTS = {
  baseUrl: "https://apisandbox.facturama.mx/",
  user: "testuser",
  password: "testpass",
};

const EXPECTED_AUTH = "Basic " + Buffer.from("testuser:testpass").toString("base64");

const LOCATION = {
  street: "Reforma",
  exteriorNumber: "100",
  interiorNumber: null,
  neighborhood: "Centro",
  municipality: "Hermosillo",
  state: "SON",
  country: "MEX",
  zipCode: "83000",
};

const STAMP_INPUT = {
  origin: LOCATION,
  destination: { ...LOCATION, street: "Otra calle" },
  merchandise: [
    {
      description: "Fertilizante",
      satBienesTranspCode: "10161500",
      satUnitCode: "KGM",
      quantity: 100,
      weightKg: 500,
      isHazardousMaterial: false,
      hazardousMaterialCode: null,
    },
  ],
  autotransporte: {
    plate: "ABC1234",
    config: "C2",
    permitType: "TPAF01",
    permitNumber: "SCT-123",
    insuranceCompany: "Aseguradora SA",
    insurancePolicy: "POL-1",
  },
  figuraTransporte: {
    name: "Juan Perez",
    rfc: null,
    licenseNumber: "LIC-1",
  },
  distanceKm: 120,
};

describe("waybills FacturamaRestGateway", () => {
  beforeEach(() => {
    mockedGetEmitterFiscalSettings.mockReset();
    mockedGetEmitterFiscalSettings.mockResolvedValue(EMITTER);
  });

  it("sends Authorization: Basic header on stampTraslado", async () => {
    const fakeFetch = mockFetch({ Id: "cfdi-id-1", Complement: { TaxStamp: { Uuid: "UUID-1" } } });
    const gw = new FacturamaRestGateway({ ...BASE_OPTS, fetchImpl: fakeFetch as unknown as typeof fetch });

    await gw.stampTraslado(STAMP_INPUT);

    const [, init] = fakeFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(EXPECTED_AUTH);
  });

  it("posts to /3/cfdis with CfdiType T and Complemento CartaPorte", async () => {
    const fakeFetch = mockFetch({ Id: "cfdi-id-1", Complement: { TaxStamp: { Uuid: "UUID-1" } } });
    const gw = new FacturamaRestGateway({ ...BASE_OPTS, fetchImpl: fakeFetch as unknown as typeof fetch });

    await gw.stampTraslado(STAMP_INPUT);

    const [url, init] = fakeFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/3/cfdis");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.CfdiType).toBe("T");
    expect(body.Total).toBe(0);
    expect(body.Receiver).toEqual({
      Rfc: "XAXX010101000",
      Name: "Agrisas",
      CfdiUse: "S01",
      FiscalRegime: "601",
      TaxZipCode: "83000",
    });
    expect(body.Complemento.CartaPorte).toBeDefined();
    expect(body.Complemento.CartaPorte.Ubicaciones).toHaveLength(2);
    expect(body.Complemento.CartaPorte.Mercancias.Mercancia).toHaveLength(1);
  });

  it("returns cfdiId and uuid from stamp response", async () => {
    const fakeFetch = mockFetch({ Id: "cfdi-id-1", Complement: { TaxStamp: { Uuid: "MY-UUID-1" } } });
    const gw = new FacturamaRestGateway({ ...BASE_OPTS, fetchImpl: fakeFetch as unknown as typeof fetch });

    const result = await gw.stampTraslado(STAMP_INPUT);

    expect(result.cfdiId).toBe("cfdi-id-1");
    expect(result.uuid).toBe("MY-UUID-1");
  });

  it("throws FacturamaStampError on non-ok response", async () => {
    const fakeFetch = mockFetch({ message: "Invalid Carta Porte payload" }, 422);
    const gw = new FacturamaRestGateway({ ...BASE_OPTS, fetchImpl: fakeFetch as unknown as typeof fetch });

    await expect(gw.stampTraslado(STAMP_INPUT)).rejects.toThrow(FacturamaStampError);
  });

  it("sends DELETE to /cfdi/{id}?type=issued&motive= on cancel", async () => {
    const fakeFetch = mockFetch({ Acuse: "" });
    const gw = new FacturamaRestGateway({ ...BASE_OPTS, fetchImpl: fakeFetch as unknown as typeof fetch });

    await gw.cancel("cfdi-id-1", "02");

    const [url, init] = fakeFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/cfdi/cfdi-id-1");
    expect(url).toContain("motive=02");
    expect(init.method).toBe("DELETE");
  });

  it("throws FacturamaCancelError on cancel failure", async () => {
    const fakeFetch = mockFetch({ message: "Not found" }, 404);
    const gw = new FacturamaRestGateway({ ...BASE_OPTS, fetchImpl: fakeFetch as unknown as typeof fetch });

    await expect(gw.cancel("cfdi-id-1", "02")).rejects.toThrow(FacturamaCancelError);
  });

  it("throws startup error when credentials missing", () => {
    expect(
      () => new FacturamaRestGateway({ baseUrl: "https://api.facturama.mx/", user: "", password: "x" })
    ).toThrow(/FACTURAMA_USER/);
  });

  it("does not throw at construction when emitter fiscal data is missing", () => {
    expect(
      () => new FacturamaRestGateway({ baseUrl: "https://api.facturama.mx/", user: "u", password: "p" })
    ).not.toThrow();
  });

  it("throws EmitterFiscalDataIncompleteError on stampTraslado when emitter settings are incomplete, without calling fetchImpl", async () => {
    mockedGetEmitterFiscalSettings.mockResolvedValue({ rfc: "XAXX010101000", legalName: "Agrisas" });
    const fakeFetch = jest.fn();
    const gw = new FacturamaRestGateway({ ...BASE_OPTS, fetchImpl: fakeFetch as unknown as typeof fetch });

    await expect(gw.stampTraslado(STAMP_INPUT)).rejects.toThrow(EmitterFiscalDataIncompleteError);
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it("throws EmitterFiscalDataIncompleteError when no emitter settings are persisted at all", async () => {
    mockedGetEmitterFiscalSettings.mockResolvedValue(null);
    const fakeFetch = jest.fn();
    const gw = new FacturamaRestGateway({ ...BASE_OPTS, fetchImpl: fakeFetch as unknown as typeof fetch });

    await expect(gw.stampTraslado(STAMP_INPUT)).rejects.toThrow(EmitterFiscalDataIncompleteError);
    expect(fakeFetch).not.toHaveBeenCalled();
  });
});
