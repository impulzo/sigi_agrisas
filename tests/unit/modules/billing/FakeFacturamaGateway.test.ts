import { FakeFacturamaGateway } from "../../../../src/modules/billing/infrastructure/services/FakeFacturamaGateway";

const STAMP_INPUT = {
  currency: "MXN",
  paymentForm: "01",
  paymentMethod: "PUE",
  expeditionPlace: "45010",
  cfdiType: "I" as const,
  receiver: {
    rfc: "CAN850101AAA",
    name: "Cliente",
    cfdiUse: "G03",
    fiscalRegime: "601",
    taxZipCode: "45010",
  },
  items: [],
};

describe("FakeFacturamaGateway", () => {
  it("stamp returns non-empty cfdiId and uuid (deterministic unique each call)", async () => {
    const gw = new FakeFacturamaGateway();

    const r1 = await gw.stamp(STAMP_INPUT);
    const r2 = await gw.stamp(STAMP_INPUT);

    expect(r1.cfdiId).toBeTruthy();
    expect(r1.uuid).toBeTruthy();
    expect(r1.cfdiId).not.toBe(r2.cfdiId);
  });

  it("stamp does not make network calls — no fetch required", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockRejectedValue(new Error("no network"));
    const gw = new FakeFacturamaGateway();

    const result = await gw.stamp(STAMP_INPUT);

    expect(result.uuid).toBeTruthy();
    fetchSpy.mockRestore();
  });

  it("download returns base64 content with correct contentType", async () => {
    const gw = new FakeFacturamaGateway();

    const pdf = await gw.download("pdf", "fake-id");
    const xml = await gw.download("xml", "fake-id");

    expect(pdf.contentBase64).toBeTruthy();
    expect(pdf.contentType).toBe("application/pdf");
    expect(xml.contentBase64).toBeTruthy();
    expect(xml.contentType).toBe("application/xml");
  });

  it("uploadCsd returns mocked status with isValid=true", async () => {
    const gw = new FakeFacturamaGateway();

    const status = await gw.uploadCsd({
      rfc: "CAN850101AAA",
      certificateBase64: "base64cer",
      privateKeyBase64: "base64key",
      privateKeyPassword: "secret",
    });

    expect(status.isValid).toBe(true);
    expect(status.rfc).toBe("CAN850101AAA");
  });

  it("cancel resolves successfully", async () => {
    const gw = new FakeFacturamaGateway();
    const result = await gw.cancel("any-id", "02");
    expect(result.success).toBe(true);
  });
});
