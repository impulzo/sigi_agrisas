import { FakeFacturamaGateway } from "../../../../src/modules/waybills/infrastructure/services/FakeFacturamaGateway";

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
  destination: LOCATION,
  merchandise: [],
  autotransporte: {
    plate: "ABC1234",
    config: "C2",
    permitType: "TPAF01",
    permitNumber: "SCT-123",
    insuranceCompany: "Aseguradora SA",
    insurancePolicy: "POL-1",
  },
  figuraTransporte: { name: "Juan Perez", rfc: null, licenseNumber: "LIC-1" },
  distanceKm: 10,
};

describe("waybills FakeFacturamaGateway", () => {
  it("returns deterministic-shaped, unique UUIDs without network calls", async () => {
    const gw = new FakeFacturamaGateway();
    const r1 = await gw.stampTraslado(STAMP_INPUT);
    const r2 = await gw.stampTraslado(STAMP_INPUT);

    expect(r1.cfdiId).toBeTruthy();
    expect(r1.uuid).toBeTruthy();
    expect(r1.cfdiId).not.toBe(r2.cfdiId);
    expect(r1.uuid).not.toBe(r2.uuid);
  });

  it("cancel resolves successfully", async () => {
    const gw = new FakeFacturamaGateway();
    const result = await gw.cancel("some-cfdi-id", "01");
    expect(result.success).toBe(true);
  });

  it("download returns base64 content for pdf and xml", async () => {
    const gw = new FakeFacturamaGateway();
    const pdf = await gw.download("pdf", "some-cfdi-id");
    const xml = await gw.download("xml", "some-cfdi-id");

    expect(pdf.contentType).toBe("application/pdf");
    expect(pdf.contentBase64.length).toBeGreaterThan(0);
    expect(xml.contentType).toBe("application/xml");
    expect(xml.contentBase64.length).toBeGreaterThan(0);
  });
});
