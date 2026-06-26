import { FacturamaRestGateway } from "../../../../src/modules/billing/infrastructure/services/FacturamaRestGateway";
import { FacturamaStampError, FacturamaCancelError } from "../../../../src/modules/billing/domain/errors";

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

const STAMP_INPUT = {
  currency: "MXN",
  paymentForm: "01",
  paymentMethod: "PUE",
  expeditionPlace: "45010",
  cfdiType: "I" as const,
  receiver: {
    rfc: "CAN850101AAA",
    name: "Cliente SA",
    cfdiUse: "G03",
    fiscalRegime: "601",
    taxZipCode: "45010",
  },
  items: [
    {
      productCode: "10171600",
      description: "Producto",
      unit: "PZA",
      satUnitCode: "H87",
      quantity: 1,
      unitPrice: 100,
      subtotal: 100,
      taxes: [{ type: "IVA" as const, rate: 0.16, base: 100, total: 16, isRetention: false }],
      taxObject: "02",
      total: 116,
    },
  ],
};

describe("FacturamaRestGateway", () => {
  it("sends Authorization: Basic header on stamp", async () => {
    const fakeFetch = mockFetch({ Id: "cfdi-id-1", Complement: { TaxStamp: { Uuid: "UUID-1" } } });
    const gw = new FacturamaRestGateway({ ...BASE_OPTS, fetchImpl: fakeFetch as unknown as typeof fetch });

    await gw.stamp(STAMP_INPUT);

    const [url, init] = fakeFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(EXPECTED_AUTH);
  });

  it("posts to /3/cfdis on stamp", async () => {
    const fakeFetch = mockFetch({ Id: "cfdi-id-1", Complement: { TaxStamp: { Uuid: "UUID-1" } } });
    const gw = new FacturamaRestGateway({ ...BASE_OPTS, fetchImpl: fakeFetch as unknown as typeof fetch });

    await gw.stamp(STAMP_INPUT);

    const [url] = fakeFetch.mock.calls[0] as [string];
    expect(url).toContain("/3/cfdis");
    expect(fakeFetch.mock.calls[0][1].method).toBe("POST");
  });

  it("returns cfdiId and uuid from stamp response", async () => {
    const fakeFetch = mockFetch({ Id: "cfdi-id-1", Complement: { TaxStamp: { Uuid: "MY-UUID-1" } } });
    const gw = new FacturamaRestGateway({ ...BASE_OPTS, fetchImpl: fakeFetch as unknown as typeof fetch });

    const result = await gw.stamp(STAMP_INPUT);

    expect(result.cfdiId).toBe("cfdi-id-1");
    expect(result.uuid).toBe("MY-UUID-1");
  });

  it("throws FacturamaStampError on non-ok response", async () => {
    const fakeFetch = mockFetch({ message: "Invalid CSD" }, 400);
    const gw = new FacturamaRestGateway({ ...BASE_OPTS, fetchImpl: fakeFetch as unknown as typeof fetch });

    await expect(gw.stamp(STAMP_INPUT)).rejects.toThrow(FacturamaStampError);
  });

  it("sends DELETE to /cfdi/{id}?type=issued&motive= on cancel", async () => {
    const fakeFetch = mockFetch({ Acuse: "" });
    const gw = new FacturamaRestGateway({ ...BASE_OPTS, fetchImpl: fakeFetch as unknown as typeof fetch });

    await gw.cancel("cfdi-id-1", "02");

    const [url] = fakeFetch.mock.calls[0] as [string];
    expect(url).toContain("/cfdi/cfdi-id-1");
    expect(url).toContain("motive=02");
    expect(fakeFetch.mock.calls[0][1].method).toBe("DELETE");
  });

  it("throws FacturamaCancelError on cancel failure", async () => {
    const fakeFetch = mockFetch({ message: "Not found" }, 404);
    const gw = new FacturamaRestGateway({ ...BASE_OPTS, fetchImpl: fakeFetch as unknown as typeof fetch });

    await expect(gw.cancel("cfdi-id-1", "02")).rejects.toThrow(FacturamaCancelError);
  });

  it("throws startup error when credentials missing and mock=false", () => {
    expect(
      () => new FacturamaRestGateway({ baseUrl: "https://api.facturama.mx/", user: "", password: "x" })
    ).toThrow(/FACTURAMA_USER/);
  });
});
